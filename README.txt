╔══════════════════════════════════════════════════╗
║       COSMIC TOOLS — NETLIFY DEPLOY GUIDE        ║
╚══════════════════════════════════════════════════╝

STRUCTURE
─────────
cosmic_netlify/
├── netlify.toml                  ← build config + /api/* redirect
├── package.json                  ← @netlify/blobs dep
├── website/                      ← static frontend (Netlify serves this)
│   ├── index.html
│   ├── style.css
│   └── app.js                    ← /api/* calls = same-origin, no hardcoded URL
├── netlify/functions/            ← serverless backend
│   ├── _store.js                 ← Netlify Blobs KV (keys + queues persisted)
│   ├── redeem.js                 ← POST /api/redeem
│   ├── validate.js               ← POST /api/validate
│   ├── sms-submit.js             ← POST /api/sms-submit
│   ├── sms-status.js             ← GET  /api/sms-status
│   ├── fb-submit.js              ← POST /api/fb-submit
│   ├── keys-list.js              ← GET  /api/keys-list    (admin token)
│   ├── keys-create.js            ← POST /api/keys-create  (admin token)
│   └── keys-revoke.js            ← POST /api/keys-revoke  (admin token)
└── bot/
    ├── admin_bot.py              ← Telegram admin bot (run on your server/PC)
    └── requirements.txt

════════════════════════════════════════════════════
STEP 1 — DEPLOY TO NETLIFY
════════════════════════════════════════════════════
Option A — Netlify CLI (recommended):
  npm install -g netlify-cli
  cd cosmic_netlify
  npm install
  netlify login
  netlify deploy --prod

Option B — Netlify Dashboard:
  Zip this folder → drag-drop to Netlify → it auto-detects netlify.toml

════════════════════════════════════════════════════
STEP 2 — SET ENV VARS ON NETLIFY
════════════════════════════════════════════════════
Netlify Dashboard → Site → Environment Variables → Add:

  ADMIN_TOKEN   = any_strong_secret_string
  (Netlify Blobs is auto-enabled, no extra setup)

════════════════════════════════════════════════════
STEP 3 — RUN THE TELEGRAM BOT (your machine / VPS)
════════════════════════════════════════════════════
  cd bot
  pip install -r requirements.txt

  export BOT_TOKEN=123456:ABCdef...
  export ADMIN_ID=123456789          ← your numeric TG ID (@userinfobot)
  export NETLIFY_URL=https://your-site.netlify.app
  export ADMIN_TOKEN=any_strong_secret_string   ← same as Netlify env var

  python admin_bot.py

Non-admin users get:
  "⚠️ You are not authorized to use this bot.
   Contact @LEGITCosmicDev for access."

════════════════════════════════════════════════════
HOW IT ALL CONNECTS
════════════════════════════════════════════════════
  Bot generates key → POST /api/keys-create → stored in Netlify Blobs
  User enters key on website → POST /api/validate or /api/redeem → Blobs
  SMS/FB jobs → POST /api/sms-submit or /api/fb-submit → Blobs queue
  Your SMSprocessor.py reads Blobs via the same API endpoints
  Bot lists/revokes keys → reads/writes same Blobs store

════════════════════════════════════════════════════
SMS / FB PROCESSORS
════════════════════════════════════════════════════
Run SMSprocessor.py and processor.py on your VPS.
Poll GET /api/sms-status and queue via /api/sms-submit —
or for direct Blobs access, use the netlify-blobs JS SDK
from a background worker that reads the queue store.

════════════════════════════════════════════════════
