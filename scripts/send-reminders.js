// Runs on a schedule (via GitHub Actions). Pings your WhatsApp for open tasks.
// Priority + due date decide HOW OFTEN a task pings:
//   - High priority, overdue, or due today -> every run (3x/day)
//   - Normal / Low (not yet due)           -> once a day (the morning digest only)
// All secrets come from environment variables — nothing sensitive is in this file.

const BIN     = process.env.JSONBIN_BIN_ID;
const KEY     = process.env.JSONBIN_MASTER_KEY;   // master key — safe here (GitHub secret, never exposed)
const PHONE   = process.env.CALLMEBOT_PHONE;      // your number incl. country code, e.g. +50372852890
const APIKEY  = process.env.CALLMEBOT_APIKEY;     // the key CallMeBot gave you
const PAGE    = process.env.PAGE_URL;             // https://<user>.github.io/<repo>/
const EVENT   = process.env.EVENT_NAME || "";     // 'schedule' or 'workflow_dispatch' (manual)

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Days until due (negative = overdue). null if no due date.
function daysUntil(due) {
  if (!due) return null;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00Z");
  return Math.round((d - today) / 86400000);
}

function isUrgent(t) {
  const n = daysUntil(t.due);
  return t.priority === "high" || (n !== null && n <= 0); // high, overdue, or due today
}

function buildMessage(t) {
  const dot = { high: "🔴", normal: "🟡", low: "⚪" }[t.priority || "normal"];
  let msg = `${dot} Reminder: ${t.text}`;
  const n = daysUntil(t.due);
  if (n !== null) {
    if (n < 0)       msg += `\n⚠️ OVERDUE by ${-n} day(s)`;
    else if (n === 0) msg += `\n⏰ Due TODAY`;
    else             msg += `\n📅 Due in ${n} day(s)`;
  }
  msg += `\n\n✅ Mark done: ${PAGE}?done=${t.id}`;
  return msg;
}

async function main() {
  if (!BIN || !KEY || !PHONE || !APIKEY || !PAGE) {
    console.error("Missing one or more env vars. Check your GitHub secrets.");
    process.exit(1);
  }

  const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN}/latest`, {
    headers: { "X-Master-Key": KEY }
  });
  if (!res.ok) { console.error("JSONBin read failed:", res.status); process.exit(1); }

  const data = await res.json();
  const open = ((data.record && data.record.tasks) || []).filter(t => !t.done);
  if (!open.length) { console.log("No open tasks — nothing to send."); return; }

  // Morning ES digest (~08:00 ES = 14:00 UTC) sends everything. Other runs send only urgent.
  // Manual ("Run workflow") runs always behave like the digest, so testing shows all tasks.
  const hourUTC = new Date().getUTCHours();
  const isDigest = EVENT === "workflow_dispatch" || (hourUTC >= 13 && hourUTC <= 15);

  const toSend = open.filter(t => isDigest || isUrgent(t));
  if (!toSend.length) { console.log(`${open.length} open, but none urgent this run — staying quiet.`); return; }

  // Most urgent first: overdue/due-today/high, then the rest.
  toSend.sort((a, b) => (isUrgent(b) - isUrgent(a)) || ((a.due || "zzz").localeCompare(b.due || "zzz")));

  console.log(`${isDigest ? "Digest" : "Urgent-only"} run — sending ${toSend.length} of ${open.length} open task(s).`);

  for (const t of toSend) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(PHONE)}`
              + `&text=${encodeURIComponent(buildMessage(t))}&apikey=${APIKEY}`;
    try {
      const r = await fetch(url);
      console.log(`  ${r.ok ? "✓" : "✗"} (${r.status}) ${t.text}`);
    } catch (e) {
      console.log(`  ✗ ${t.text} — ${e.message}`);
    }
    await sleep(8000); // CallMeBot rate-limits; space out the messages
  }
}

main();
