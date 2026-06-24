// Runs on a schedule (via GitHub Actions). Pings your WhatsApp for every open task.
// All secrets come from environment variables — nothing sensitive is in this file.

const BIN     = process.env.JSONBIN_BIN_ID;
const KEY     = process.env.JSONBIN_MASTER_KEY;   // master key — safe here (GitHub secret, never exposed)
const PHONE   = process.env.CALLMEBOT_PHONE;      // your number incl. country code, e.g. +15551234567
const APIKEY  = process.env.CALLMEBOT_APIKEY;     // the key CallMeBot gave you
const PAGE    = process.env.PAGE_URL;             // https://<user>.github.io/<repo>/

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  console.log(`${open.length} open task(s). Sending…`);

  for (const t of open) {
    const text = `📋 Reminder: ${t.text}\n\n✅ Mark done: ${PAGE}?done=${t.id}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(PHONE)}`
              + `&text=${encodeURIComponent(text)}&apikey=${APIKEY}`;
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
