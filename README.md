# WhatsApp Reminders

A free, no-server reminder system. Add tasks on a web page; your WhatsApp gets
pinged a few times a day for every task that's still open. Tap the "Mark done"
link in the message (or the checkbox on the page) and the pings stop.

```
  [ Web page ]  --writes-->  [ JSONBin ]  <--reads--  [ GitHub Actions cron ]
   add / done                  (tasks)                  3x/day -> CallMeBot -> your WhatsApp
```

Everything here is on free tiers.

---

## One-time setup (~15 min)

### 1. CallMeBot — lets a script message YOUR WhatsApp (free)
1. Add the contact **+34 644 51 95 23** to your phone (e.g. "CallMeBot").
2. Send it this WhatsApp message: **`I allow callmebot to send me messages`**
3. You'll get a reply with your personal **apikey**. Save it.
   (Full instructions: https://www.callmebot.com/blog/free-api-whatsapp-messages/)

### 2. JSONBin — stores your tasks (free)
1. Sign up at https://jsonbin.io
2. Create a new **bin** with this starting content:
   ```json
   { "tasks": [] }
   ```
   Save it and copy the **BIN ID** from the URL.
3. Under **API Keys**, copy your **Master Key** (for the cron job).
4. Create an **Access Key** scoped to *Read + Update* (for the web page — safer
   to expose than the master key). Copy it too.

### 3. The web page (GitHub Pages, free)
1. Create a new **public** GitHub repo and upload this folder's contents.
2. Edit `index.html` → fill in `JSONBIN_BIN_ID` and `JSONBIN_ACCESS_KEY` (the Access Key).
3. Repo **Settings → Pages** → deploy from `main` branch, root.
   Your page will be at `https://<user>.github.io/<repo>/`.

### 4. The scheduler (GitHub Actions)
In the repo: **Settings → Secrets and variables → Actions → New repository secret**,
add these five:

| Secret | Value |
|---|---|
| `JSONBIN_BIN_ID` | your bin id |
| `JSONBIN_MASTER_KEY` | your JSONBin **master** key |
| `CALLMEBOT_PHONE` | your number incl. country code, e.g. `+15551234567` |
| `CALLMEBOT_APIKEY` | the apikey CallMeBot sent you |
| `PAGE_URL` | `https://<user>.github.io/<repo>/` |

That's it. The workflow already runs 3×/day. Test it now: **Actions tab →
WhatsApp Reminders → Run workflow**. Add an open task first so there's something to send.

---

## Tweaks
- **Reminder times:** edit the `cron:` lines in `.github/workflows/reminders.yml` (they're in UTC).
- **More/fewer per day:** add or remove `cron:` lines.

## Notes / limitations
- GitHub's scheduled runs can be a few minutes late, and the workflow auto-pauses
  after 60 days of zero repo activity (just re-enable it in the Actions tab).
- CallMeBot is one-way (it can message you, you can't reply "done" in chat — that's
  why you tap the link instead). It's free and best-effort.
- Anyone who finds your page URL could read/modify your task list. For a personal
  to-do list that's usually fine; using the scoped Access Key (not the master key)
  limits the blast radius to just this one bin.
