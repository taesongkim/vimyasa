# Feedback Worker

A Cloudflare Worker that receives feedback POSTs from vimyasa (and other
apps that share this infrastructure) and forwards them to a configured
email address via Resend.

**Deployed URL:** `https://vimyasa-feedback.taesongkim.workers.dev`

## What it does

Single endpoint. Validates incoming JSON, sends an email via Resend.
Logs metadata only (no message bodies). See [index.js](./index.js) for
the source of truth.

## Architecture

```
[vimyasa app on tester's mac]
     │ POST / { message, name?, projectTag, clientId, appVersion, os }
     ▼
[Cloudflare Worker (this) — vimyasa-feedback.taesongkim.workers.dev]
     │ validate, compose email
     ▼
[Resend API — verified vimyasa.com domain]
     │
     ▼
[justin@taesongkim.com inbox]
```

## Environment variables

Set in the Cloudflare dashboard:
**Workers & Pages → vimyasa-feedback → Settings → Variables**

| Name | Type | Value | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | Secret | `re_...` | Created in Resend dashboard with **Sending access** permission for vimyasa.com. Rotate by deleting + recreating in Resend, then updating here. |
| `RECIPIENT_EMAIL` | Text | `justin@taesongkim.com` | Where forwarded mail goes. |
| `SENDER_EMAIL` | Text | `feedback@vimyasa.com` | Must be on a domain verified with Resend. |
| `ALLOWED_PROJECTS` | Text | `vimyasa` | Comma-separated allowlist. Add new project tags here as you reuse this Worker for other apps. |

## Deploying updates

Two options. Pick whichever fits the moment.

### Option A: Cloudflare dashboard (no CLI)

1. dash.cloudflare.com → **Workers & Pages** → `vimyasa-feedback`.
2. Click **Edit code**.
3. Paste the contents of [index.js](./index.js).
4. Click **Deploy**.

This is what was used for the initial deploy. Fine for occasional edits.

### Option B: Wrangler CLI (faster for repeated edits)

First-time setup:

```sh
npm install -g wrangler
wrangler login
```

Then in this directory, create a minimal `wrangler.toml`:

```toml
name = "vimyasa-feedback"
main = "index.js"
compatibility_date = "2026-05-01"
```

Deploy with:

```sh
wrangler deploy
```

(Don't commit `wrangler.toml` if it contains anything beyond the above —
secrets must stay in the dashboard.)

## Logs and debugging

- **Cloudflare dashboard:** Workers & Pages → `vimyasa-feedback` → **Logs**
  tab. Live tail of `console.log` output.
- **Resend dashboard:** resend.com → **Logs**. Shows every send attempt,
  status, and any delivery failures (bounces, spam complaints).

If feedback isn't arriving:

1. Check the Worker logs for a `forwarded` entry — confirms the request
   was received.
2. Check the Resend logs for the matching send — confirms it left
   Resend successfully.
3. Check your spam folder.
4. If all three say "sent successfully" but no email, the issue is at
   the receiving mail server.

## Health check

```sh
curl https://vimyasa-feedback.taesongkim.workers.dev/
# → "feedback worker ok"
```

If this returns anything else, the Worker is misdeployed.

## Rate limiting posture

Per-tester rate limiting is **client-side**, in the vimyasa app
(`feedback.dailyLimit` setting, default 30). This Worker has no
per-client rate limiting of its own.

The de facto cap is Resend's free tier (3,000 emails / month). If
abused beyond that, the Worker will start returning 502s when Resend
rejects sends. Watch the Resend dashboard for unusual spikes.

If abuse becomes a real concern (probably not for friends-and-family
distribution), the upgrade path is server-side rate limiting via
Cloudflare KV — see the proposal doc for the design sketch.

## Forward-looking: the dashboard version

Long-term goal: messages also land in a structured store
(Cloudflare D1 or KV) that a personal admin dashboard
(`justinjustinjustin.com`) can read. The migration is small:

1. Add `INSERT INTO messages ...` after the Resend forward.
2. Build a tiny authenticated read API for the dashboard.
3. Build the dashboard UI.

No tester app re-shipping required. The Worker URL stays the same; only
the Worker internals expand.
