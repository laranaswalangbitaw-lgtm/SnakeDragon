# COSMIC TOOLS — Bot Admin Panel Requirements
Version 1.0 | November 2026

---

## 1. Overview

COSMIC TOOLS is a key-gated web panel + Telegram admin bot for managing
access keys, queuing SMS jobs, queuing FB report jobs, and checking
MLBB accounts. The website runs as a fully static frontend with
serverless backend functions. The Telegram bot is a standalone Python
process that communicates with the backend via HTTP.

---

## 2. Tech Stack & Versions

### 2.1 Frontend (website/)

| Dependency | Version | Notes |
|---|---|---|
| HTML | 5 | Vanilla, no framework |
| CSS | 3 | No preprocessor |
| JavaScript | ES2022 | Native fetch, async/await |
| — | — | Zero npm dependencies on frontend |

### 2.2 Serverless Backend (netlify/functions/)

| Dependency | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.0.0 | Required by Netlify Edge / Functions |
| `@netlify/blobs` | ^7.3.0 | KV persistence for keys + queues |
| ES Modules | ESM | All functions use `import/export` |

### 2.3 Telegram Admin Bot (bot/)

| Dependency | Version | Notes |
|---|---|---|
| Python | ≥ 3.11 | Tested on 3.11, 3.12 |
| `python-telegram-bot` | 20.7 | PTB v20 async API |
| `requests` | ≥ 2.31.0 | HTTP calls to backend |

### 2.4 Deployment Targets

| Platform | Support | Notes |
|---|---|---|
| Netlify | ✅ Primary | netlify.toml pre-configured |
| Vercel | ✅ | Rename `netlify/functions/` → `api/`, convert to Vercel functions format |
| Render | ✅ | Deploy `website/` as static site; functions as separate Node service |
| Lovable / Similar | ✅ | Static frontend works; needs backend deploy separately |

---

## 3. Environment Variables

### 3.1 Backend (Netlify env / hosting env)

| Variable | Required | Description |
|---|---|---|
| `ADMIN_TOKEN` | ✅ | Secret string. Never put in source code. Used for `X-Admin-Token` header auth. Min 32 chars recommended. |

Netlify Blobs is auto-enabled — no additional env vars needed for storage.

### 3.2 Bot (shell env / `.env` / systemd)

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Telegram bot token from @BotFather |
| `ADMIN_ID` | ✅ | Numeric Telegram user ID (get from @userinfobot) |
| `SITE_URL` | ✅ | Full URL of deployed backend, e.g. `https://your-site.netlify.app` |
| `ADMIN_TOKEN` | ✅ | Same value as backend ADMIN_TOKEN |

**Security rule**: ADMIN_TOKEN is transmitted only via `X-Admin-Token` header.
It is never placed in the request body, query string, or source files.

---

## 4. API Endpoints

### 4.1 Public Endpoints (no auth required)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/redeem` | `{ key, user_id }` | First-time key redeem |
| POST | `/api/validate` | `{ key, user_id }` | Check if already redeemed |
| POST | `/api/sms-submit` | `{ key, user_id, target_number, amount, services, sender_name, message }` | Queue SMS job |
| POST | `/api/fb-submit` | `{ key, url, count, reason }` | Queue FB report job |
| GET | `/api/sms-status` | — | Poll current SMS job status |

### 4.2 Admin Endpoints (X-Admin-Token header required)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/keys-list` | — | List all keys |
| POST | `/api/keys-create` | `{ uses }` | Create a new key |
| POST | `/api/keys-revoke` | `{ key }` | Revoke a key |

---

## 5. Key Format

```
COSMIC-XXXX-XXXX-XXXX-XXXX
```

- Prefix: `COSMIC-`
- 4 segments of 4 uppercase alphanumeric characters
- Example: `COSMIC-A1B2-C3D4-E5F6-G7H8`
- Demo key: `COSMIC-DEMO-DEMO-DEMO-DEMO` (simulation mode only)

---

## 6. Key Object Schema

```json
{
  "COSMIC-XXXX-XXXX-XXXX-XXXX": {
    "created_at":  "2026-01-01T00:00:00Z",
    "expires_at":  null,
    "uses_left":   10,
    "max_uses":    10,
    "active":      true,
    "created_by":  "admin_bot",
    "redeemed_by": ["uid1", "uid2"]
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `created_at` | ISO 8601 string | Creation timestamp |
| `expires_at` | ISO 8601 string or null | Expiry; null = never |
| `uses_left` | integer | Remaining redemptions; 99999 = unlimited |
| `max_uses` | integer | Original limit |
| `active` | boolean | false = revoked or exhausted |
| `created_by` | string | `"admin_bot"` or `"demo_panel"` |
| `redeemed_by` | string[] | List of user_ids that redeemed |

---

## 7. SMS Job Schema

```json
{
  "job_id":        "uuid-v4",
  "user_id":       "string",
  "target_number": "09xxxxxxxxx",
  "amount":        5,
  "services":      ["EZLOAN", "XPRESS"],
  "sender_name":   "User",
  "message":       "Test Message",
  "submitted_at":  "2026-01-01T00:00:00Z"
}
```

**Constraints**: `amount` clamped 1–50. Services default to full list if omitted.

---

## 8. FB Report Job Schema

```json
{
  "job_id":    "uuid-v4",
  "url":       "https://facebook.com/...",
  "reason":    "spam",
  "count":     20,
  "submitted": "2026-01-01T00:00:00Z"
}
```

**Constraints**: `count` clamped 1–100.

---

## 9. Admin Bot Commands & Flows

| Action | Trigger | Flow |
|---|---|---|
| Open panel | `/start` | Shows inline keyboard |
| Generate key | Menu → Generate Key | Pick use count → POST `/api/keys-create` |
| List keys | Menu → List Keys | GET `/api/keys-list` → show last 20 |
| Revoke key | Menu → Revoke Key | Enter key string → POST `/api/keys-revoke` |
| SMS status | Menu → SMS Status | GET `/api/sms-status` |
| Stats | Menu → Stats | GET `/api/keys-list` → aggregate |

Non-admin users receive the unauthorized message and no further interaction.

---

## 10. Security Requirements

| Requirement | Implementation |
|---|---|
| Admin token never in source | Required env var; bot raises RuntimeError if missing |
| Admin token never in request body | Only `X-Admin-Token` header |
| Admin token never in URL/query string | Enforced by design |
| Bot restricted to one Telegram ID | `ADMIN_ID` env var; all other users blocked |
| CORS | `Access-Control-Allow-Origin: *` on public endpoints; none on admin endpoints |
| Key exhaustion | `active` set to false when `uses_left` reaches 0 |
| Key expiry | Checked against `expires_at` on validate and redeem |

---

## 11. Frontend Simulation Mode

The website ships in simulation mode by default:

- Uses `localStorage` as an in-memory key store
- Demo key `COSMIC-DEMO-DEMO-DEMO-DEMO` works immediately
- SMS / FB / MLBB actions show animated progress with realistic delays
- Key manager tab shows full create/revoke/list UI backed by localStorage

**To connect to a real backend:**
Replace the `demoStore()` / `demoGenKey()` functions in `app.js` with
`fetch()` calls to `/api/*`. The HTML structure and CSS are unchanged.

---

## 12. Deployment Steps

### Netlify (primary)

```bash
npm install -g netlify-cli
cd cosmic_clean
npm install
netlify login
netlify deploy --prod
```

Set env var in Netlify Dashboard → Site → Environment Variables:
```
ADMIN_TOKEN = <strong_random_string>
```

### Vercel

1. `npm install -g vercel`
2. Move `netlify/functions/` → `api/`
3. Convert each function export to Vercel's `export default function handler(req, res)` format
4. Set `ADMIN_TOKEN` in Vercel Dashboard → Settings → Environment Variables
5. `vercel --prod`

### Render

1. Deploy `website/` as a **Static Site**
2. Deploy `netlify/functions/` as a **Node.js Web Service** (Express wrapper needed)
3. Set `ADMIN_TOKEN` in Render → Environment

### Bot (any VPS / local machine)

```bash
cd bot
pip install -r requirements.txt

export BOT_TOKEN=<from_botfather>
export ADMIN_ID=<your_numeric_tg_id>
export SITE_URL=https://your-site.netlify.app
export ADMIN_TOKEN=<same_as_backend>

python admin_bot.py
```

---

## 13. File Structure

```
cosmic_clean/
├── netlify.toml                    ← build config + /api/* redirect
├── package.json                    ← @netlify/blobs dep
├── REQUIREMENTS.md                 ← this file
├── website/                        ← static frontend
│   ├── index.html
│   ├── style.css
│   └── app.js                      ← simulation mode; swap fetch for real API
├── netlify/functions/              ← serverless backend
│   ├── _store.js                   ← Netlify Blobs KV wrapper
│   ├── redeem.js                   ← POST /api/redeem
│   ├── validate.js                 ← POST /api/validate
│   ├── sms-submit.js               ← POST /api/sms-submit
│   ├── sms-status.js               ← GET  /api/sms-status
│   ├── fb-submit.js                ← POST /api/fb-submit
│   ├── keys-list.js                ← GET  /api/keys-list    (X-Admin-Token)
│   ├── keys-create.js              ← POST /api/keys-create  (X-Admin-Token)
│   └── keys-revoke.js              ← POST /api/keys-revoke  (X-Admin-Token)
└── bot/
    ├── admin_bot.py                ← Telegram admin bot
    └── requirements.txt
```

---

## 14. What Was Changed vs Original

| File | Change |
|---|---|
| `bot/admin_bot.py` | Removed all hardcoded fallback defaults for secrets. `_require()` raises on missing env var. Auth via `X-Admin-Token` header on all calls. |
| `netlify/functions/keys-create.js` | Removed `admin_token` from request body. Auth via `X-Admin-Token` header only. |
| `netlify/functions/keys-revoke.js` | Removed `admin_token` from request body. Auth via `X-Admin-Token` header only. |
| `netlify/functions/keys-list.js` | Added missing `ok` on server misconfiguration. |
| `website/app.js` | Full simulation mode: localStorage key store, animated batch progress, demo key, Key Manager tab. |
| `website/index.html` | Added Key Manager tab, DEMO badge, sim banners, demo key hint. |
| `website/style.css` | Added Key Manager styles, sim banner, demo badge, responsive keymgr grid. |
