# Proposal: Feedback Messenger

**Status:** ✅ shipped in v0.1.5 (PR #18)
**Lane:** features (app-side build); coordination (this proposal + Worker)
**Target version:** v0.1.5
**Author:** coordination lane

## What

A hotkey-summoned feedback window inside vimyasa. Tester types a
message, hits send, the message arrives in the dev's inbox via a
self-hosted Cloudflare Worker → Resend pipeline. Anonymous by default;
tester may optionally provide a name (set once in settings, attached to
every message).

## Why

- Friends-and-family testers need a low-friction way to report bugs and
  share reactions in-flow rather than switching to email or Slack.
- The infrastructure is reusable across all of the dev's projects (one
  Worker, one inbox, project tags in payload) — pays back compounding
  every time a new project ships.
- Forward-compatible with a future personal dashboard (admin view on
  `justinjustinjustin.com` that auto-populates with incoming feedback)
  by keeping messages in a structured payload from day one.

## Architecture

### Pipeline

```
[vimyasa app on tester's mac]
     │ Cmd+Shift+\ → renderer feedback window opens
     │ user types, hits Send
     │
     │ IPC to main: feedback:send { message, name?, ... }
     ▼
[main process — http POST]
     │ POST /
     │ { message, name?, projectTag, clientId, appVersion, os, locale }
     ▼
[Cloudflare Worker — vimyasa-feedback.taesongkim.workers.dev]
     │ validate, compose email
     ▼
[Resend API — vimyasa.com verified sender]
     │
     ▼
[justin@taesongkim.com inbox]
```

### Why route through main, not renderer?

Two reasons:

1. **No CORS friction.** Main-process Node fetch has no origin headers
   to argue with the Worker about.
2. **Worker URL stays out of the renderer's DevTools / network panel.**
   Not a security boundary (anyone can unpack the binary), but reduces
   the casual attack surface — testers (or shoulder surfers) can't
   trivially see "where does this go?" by opening DevTools.

## Decisions made (with rationale)

### Delivery: Option C (own Worker), not Option B (third-party service)

**Picked:** own Cloudflare Worker forwarding via Resend.

**Why over third-party:** the dream version (personal admin dashboard
auto-populated with messages) requires a queryable store, which
third-party email-forwarding services don't provide. Option C is
forward-compatible; Option B would require migration later (re-shipping
every tester's app with a new endpoint). The 1–2 hour setup tax now
saves migration friction later.

### Delivery infrastructure

- **Cloudflare Worker** on the free tier (100k req/day; will never come
  close).
- **Resend** for transactional email sends, free tier (3,000/month).
- **Sender domain** `feedback@vimyasa.com`, verified via DNS (SPF, DKIM,
  DMARC records on vimyasa.com).
- **Worker URL** `https://vimyasa-feedback.taesongkim.workers.dev`
  (workers.dev subdomain — no custom domain setup needed for v1).

### Auth + rate limiting

**Picked:** anonymous client UUID + client-side daily limit + de facto
cap from Resend's free tier. **No server-side rate limiting in v1.**

- App generates a UUID on first launch, persists in `electron-store` as
  `feedback.clientId`, sends with every message.
- App enforces daily limit in `electron-store` ring buffer of send
  timestamps; default 30/day, configurable in settings.
- No 5/hour limit (per user request — only daily matters).
- Resend's free-tier cap (3,000/month) is the de facto global ceiling.
  If abused, the dev notices (Resend dashboard) and rotates the Worker
  URL or pulls the API key.

**Temporary lift mechanism:** the daily limit is a setting in
Settings → Feedback. To grant a tester a temporary lift, the dev tells
them "go to Settings → Feedback, change Daily Limit to 100 for today."
A determined tester can self-bypass; this is acceptable for
friends-and-family. If wider distribution ever happens, server-side
rate limiting via Cloudflare KV is the upgrade path.

### Payload (privacy)

| Field | Required | Source | Notes |
|---|---|---|---|
| `message` | yes | user-typed | max 10,000 chars |
| `name` | no | settings (set once) | optional; user identifies themselves if they want |
| `projectTag` | yes | build-time constant | `"vimyasa"` for this app |
| `clientId` | yes | UUID generated on first launch | persisted; opaque |
| `appVersion` | yes | `app.getVersion()` | |
| `os` | yes | `process.platform` + `os.release()` | e.g. `"darwin 25.0.0"` |
| `locale` | no | `app.getLocale()` | |

**Explicitly excluded** (must NOT be sent under any circumstance): list
contents, item text, list names, item counts, archived items, theme
state, anything from the user's stored data. Tester trust depends on
this channel demonstrably not exfiltrating their lists.

### UX

- **Hotkey:** `Cmd+Shift+\` (verified non-conflicting with target
  demographic apps: Claude.ai, Cursor, Slack, Notion, Linear,
  Chrome/Safari/Arc; also free at OS level).
- **Window:** small frameless modal, ~400px wide, similar styling to
  QuickAdd. Multiline textarea autofocused on open. Send button.
  Cmd+Enter as keyboard send. Esc closes without sending.
- **No name field in the window.** Name is set once in
  Settings → Feedback (persisted as `feedback.senderName`). If set,
  it's attached to every message; if not, message is anonymous.
- **Settings tab:** new "Feedback" tab with two fields:
  - "Your name (optional)" — sets `feedback.senderName`.
  - "Daily limit" — sets `feedback.dailyLimit` (default 30).

### Copy (exact strings)

- **Sent successfully:** `"Message sent. Thanks!"` (auto-hide 1.5s)
- **Daily limit reached:**

  > `"Damn okay, over-achiever — you hit the {limit}-message daily`
  > `limit (I had to put a cap on this to prevent spam attacks). The`
  > `limit resets at midnight your time. If it's urgent, adjust your`
  > `personal limits in Settings/Feedback."`

  `{limit}` is templated against the user's configured daily limit
  (so the number stays accurate if they bump it). `Settings/Feedback`
  is a click-link that jumps to Settings → Feedback tab, reusing the
  "Sending as `<name>`" link pattern from the window header.

  Window stays open with the message preserved. Copy-message and
  Dismiss buttons present; **no Copy-email button** in this state
  (the path forward is self-service via the link, not email).

- **Network/service error:**

  > `"Send failed (network error). Try again in a minute. If it keeps`
  > `failing, hit me up at justin@taesongkim.com. Thanks!"`

  Window stays open with the message preserved, "Copy email address"
  and "Copy your message" buttons.

The "30" in the limit copy should be templated against the actual
configured limit so it stays accurate if the user tweaks the setting.

## Worker (deployed and verified)

The Worker source of truth lives at
[`infra/feedback-worker/index.js`](../../infra/feedback-worker/index.js).
Deploy / ops notes are in
[`infra/feedback-worker/README.md`](../../infra/feedback-worker/README.md).

The Worker is **already deployed and verified** end-to-end (curl test
on 2026-05-04 returned `{"ok":true}` and email arrived at
`justin@taesongkim.com` within seconds). Schema, environment variables,
and rate-limiting posture documented in the README.

## App-side phasing — shipped in v0.1.5

All three PRs landed in a single delivery (PR #18). PR 3's prewarm
was pulled forward into PR 2 because lazy prewarm raced the renderer
mount and left the first summon blank.

The phased plan as originally designed (kept here for posterity):

### PR 1: settings + clientId infrastructure
- New `feedback` namespace in `electron-store`:
  - `feedback.clientId` (UUID, generated on first read if absent)
  - `feedback.senderName` (string, optional)
  - `feedback.dailyLimit` (number, default 30)
  - `feedback.sentTimestamps` (number[], rolling window for limit check)
- New "Feedback" tab in Settings with the two visible fields.
- IPC: `feedback:get-config`, `feedback:set-config`,
  `feedback:can-send` (returns `{ canSend, sendsToday, limit }`),
  `feedback:record-send` (appends timestamp, prunes >24h).
- No UI for sending yet. Ships invisibly (settings tab is the only
  visible change).

### PR 2: feedback window + send flow
- New renderer route / window: feedback message window.
- Global shortcut `Cmd+Shift+\` registered in main; opens window
  (created on first summon, prewarmed thereafter — same pattern as
  QuickAdd).
- IPC `feedback:send` from renderer → main → POST to Worker.
- Three success/failure states with the exact copy above.
- Cmd+Enter sends, Esc closes without send.
- Limit check on Send (calls `feedback:can-send`); displays
  daily-limit copy if blocked.
- "Copy email address" / "Copy your message" buttons in error states.

### PR 3: prewarm + polish
- Prewarm the feedback window at startup (parallel to QuickAdd
  prewarm). Reduces summon latency from ~150–300ms to ~10ms.
- Final visual polish, motion timing pass with aesthetics lane.

PR 1 is safe to land in v0.1.5. PR 2 is the primary v0.1.5 work. PR 3
can ship in v0.1.5 or v0.1.6 depending on slack.

## Open questions / deferred

- **Should the feedback window respect the dim-overlay onboarding
  pattern?** Probably no — feedback is not part of onboarding. Don't
  show the dim background.
- **Should there be a "thanks for sending feedback" callout the first
  time a user sends?** Probably not; the success copy is enough.
- **Should we offer a "send screenshot" attachment in v1?** No.
  Defer — meaningful complexity for a niche need. Revisit when a tester
  asks.
- **What about `mailto:` fallback if the Worker is unreachable?**
  Considered. The "copy your message + copy email address" buttons in
  the error state are simpler and more reliable than auto-opening a
  mail client, which may not be configured.

## Risks

- **Worker URL is public.** Anyone who unpacks the binary sees it.
  Anyone can POST. Defense: client-side rate limit + Resend cap +
  monitoring the Resend dashboard. Acceptable for friends-and-family.
- **Resend free tier (3,000/month).** Plenty for friends-and-family
  scale, but if the project grows or one tester goes wild, the cap
  trips. Mitigation: upgrade Resend tier (~$20/mo) or migrate to a
  cheaper transactional provider. Watch for it.
- **Tester self-bypassing the daily limit.** Possible (settings is
  user-editable). Acceptable for friends-and-family; if abuse pattern
  emerges, server-side rate limiting via Cloudflare KV is the upgrade
  path.
- **DKIM/SPF/DMARC drift.** If Resend ever rotates their DNS
  requirements, the verified sender breaks and emails start hitting
  spam. Mitigation: monthly check on Resend's domain page (or whenever
  feedback stops arriving).

## Forward-looking: the dream version

Long-term goal: a personal admin dashboard at `justinjustinjustin.com`
that auto-populates with tester feedback. Architecture:

```
[vimyasa app] → [Worker] → [Resend → email]   (current)
                       ↓
                       └→ [Cloudflare D1 / KV]   (added in dream version)
                            ↑
                            └─ [justinjustinjustin.com dashboard]
                                  reads via authenticated API
```

Migration is **purely server-side** — no tester app changes:

1. Add `await env.DB.prepare("INSERT INTO messages ...").run()` in the
   Worker, before the Resend send.
2. Add a separate authenticated read endpoint
   (`GET /messages?since=...`) protected by a static admin token.
3. Build the dashboard on `justinjustinjustin.com` (any framework; can
   be static + fetch).

This is genuinely small — probably a 1–2 day effort when the time is
right. Capture as a future proposal when ready (target version: TBD,
likely v0.3.x or v0.4.x).

## What this proposal does NOT decide

- The exact visual treatment of the feedback window (color, border,
  motion) — aesthetics lane consult during PR 2.
- Whether the feedback hotkey appears in the shortcuts overview window
  — yes by default; flag if you want it hidden.
- Whether we should have a "follow-up reply" mechanism (anonymous
  client → dev → tester reply) — out of scope for v1; revisit if
  meaningful.

## Next step

Features lane picks up PR 1 (settings + clientId infrastructure). The
Worker is already deployed and tested end-to-end, so the app-side build
is unblocked.
