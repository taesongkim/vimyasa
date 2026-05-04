# Backlog

Triaged ideas, features, and bugs across vimyasa. Each item has a lane,
a priority, a version target (where assigned), and (where applicable) a
pointer to its design doc.

**For lane sessions:** read this at startup. Mark items `in-flight` when
you start. Don't pick up items already `in-flight` in another lane.

**Status legend:** `idea` → `proposed` (has design doc) → `in-flight`
(branch open) → `merged` → archived out.

**Priority:** `P1` ship-blocker for current iteration · `P2` next
iteration · `P3` someday/maybe.

---

## Versioning roadmap

Live release: **v0.1.4**. Planned next sequence:

| Version | Theme | Primary contents |
|---|---|---|
| **v0.1.5** | Feedback messenger | Hotkey + message window → POST to email-forwarding endpoint. Coordination prereq: threat-model proposal. |
| **v0.1.6** | Hot list — Phase 1 (visible) | Hot-list PR-1 schema, PR-2 shortcut + window + slide animation, PR-3 number-0 wiring. Skip prewarm for now. |
| **v0.1.7** | Hot list polish + Undo | Hot list PR-4 (prewarm). Undo with 3–5 step in-memory ring buffer. `Cmd+Z` / `Cmd+Shift+Z`, in-session only, single-list scope. |
| **v0.1.8** | Move-item flow + small wins | Carry mode (`m` enter / 0–9 send / j/k reorder / Esc land). Auto-scroll to entry-form-added item. Deselect prior item on new-item init. |
| **v0.1.9** | Focus-state cues + backup | Themes lane: focus-changed event + flash/glow via existing magic-colors infra. Features lane: discover existing export, ship tested import. |
| **v0.1.10** | Polish + bug bash + audit | Mystery flicker root-cause hunt. Onboarding dim z-order. Scrollbar lag. Coordination: auto-update integrity audit. |
| **v0.2.0** (someday) | Real Theme 2 + switcher | Path B from theme-system docs, or first significant new surface area. Reserved for genuinely big change. |

### On flexibility

Versions are **coherence guesses, not contracts.** Lanes that finish a
version's items early route through coordination (via `INBOX.md` or
directly to the human) to decide between:

- **Ship now** — default. Smaller releases mean tighter feedback loops
  and easier bug attribution.
- **Pull forward** — only if the new item *belongs with* the version's
  theme. Heuristic: if a tester would have to read release notes to
  understand "what changed," the version is too noisy.
- **Skip ahead** — start the next version's primary item, leave the
  partial release uncut.

Coordination updates BACKLOG version tags when an item moves. Lanes do
not silently grab next-priority items.

---

## Features

### Hot list — `Cmd+Shift+H`, holds 0, slides from right
- **Lane:** features (with theme + aesthetics consultations later)
- **Priority:** P1
- **Version:** v0.1.6 (Phase 1: PR-1, PR-2, PR-3) + v0.1.7 (PR-4 prewarm)
- **Status:** proposed → Option A + phasing approved → see [proposals/hot-list.md](./proposals/hot-list.md)
- **Notes:** Phasing is defined in the proposal. PR-1 is schema-only,
  ships invisibly — safe to pull into v0.1.5 if features lane has slack.

### Backup / restore user data
- **Lane:** features
- **Priority:** P1
- **Version:** v0.1.9
- **Status:** idea — needs investigation
- **Notes:** User believes a JSON export exists but is untested.
  **First step:** discover what's actually wired (scan `ipc.ts` and any
  Settings tab); document current state; then propose a tested
  export+import flow. Must include `kind: 'hot'` in the export schema
  by v0.1.9 (hot list lands in v0.1.6).

### Undo / redo
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.7
- **Status:** scoped → 3–5 step in-memory ring buffer, in-session only,
  single-list scope. `Cmd+Z` / `Cmd+Shift+Z`. Covers add / edit /
  archive / delete (and reorder if cheap).
- **Notes:** No persistence across summons. No cross-list undo (deferred
  to v0.1.10+ if ever). Estimate: 2–3 active hours.

### Move-item flow — "carry mode"
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8
- **Status:** idea — naming + ENTER conflict to resolve
- **Notes:** `m` toggles carry mode on focused item. Inside carry mode:
  number key → send to that list (incl. `0` → hot list — depends on
  hot list shipping in v0.1.6); `j`/`k` → reorder in current list;
  `Esc` lands. **Open:** `Enter` already archives — needs a different
  commit key, or carry-mode reuses Esc exclusively. Suggest "carry
  mode" as the name (or "pickup mode"); user to confirm.

### Focus-state visual cue (flash + glow)
- **Lane:** themes (primary), aesthetics (timing/feel)
- **Priority:** P2
- **Version:** v0.1.9
- **Status:** idea
- **Notes:** Wants a flash + steady glow on focus-level changes so users
  always know where shortcuts will land. **Use the existing magic-colors
  infrastructure** (beam/particles/burst); do not build a parallel
  visual layer. The `triggers` system already supports
  focus-change-style events — a new event name like `'focus-changed'`
  may be all that's needed. Pairs cleanly with backup work in v0.1.9
  (different lanes, no overlap).

### In-app feedback messenger to dev (network-egress feature)
- **Lane:** features (build); coordination (threat-model proposal first)
- **Priority:** P1 (promoted — now drives v0.1.5)
- **Version:** v0.1.5
- **Status:** idea — threat-model proposal needed before any code
- **Notes:** Network-egress feature, will ship to testers, will live
  across multiple of the user's projects. Coordination lane writes
  `proposals/feedback-messenger.md` first, addressing:
  - Auth model (anonymous + app-version stamp recommended for v1)
  - Rate limiting (per-machine token bucket)
  - What data goes over the wire (message + app version + OS;
    explicitly NOT list contents or PII)
  - Receiving end: dedicated endpoint forwarding to email
    (Formspree / Web3Forms / Resend) vs. in-app inbox. Recommend
    forwarding endpoint for v1 — zero infra to maintain.
  - Abuse vectors (testers spamming, scraped binary used for spam
    relay).
  - Cross-project reuse: design endpoint to be shared across the
    user's projects (project tag in payload).

---

## Usability tweaks

### Auto-scroll to new item added via entry form
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8
- **Status:** idea — small win
- **Notes:** Mechanic exists for `n` in-list (auto-scrolls focused
  item into view). Reuse it when entry form adds an item to the
  currently-open list whose visible area doesn't contain the new item.
  Likely a one-IPC-event addition: `quickadd` triggers `item-added`,
  list windows that contain that item scroll to it.

### Deselect prior item when new item is initiated
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.8
- **Status:** idea — tiny
- **Notes:** When `n` (or shortcut, or anything else) starts a new
  item draft, the previously-highlighted item should lose its selection
  state. Trivial — likely a single state-clear in the new-item handler.

### Scrollbar tracking lag
- **Lane:** features (or aesthetics, dealer's choice)
- **Priority:** P3
- **Version:** v0.1.10
- **Status:** idea
- **Notes:** Custom scrollbar in `ListWindow.tsx` lags slightly behind
  scroll position — likely a CSS smooth-scroll, transform-on-spring, or
  a debounced position-update. Should be one transition or
  request-animation-frame fix. Minor visual polish.

---

## Bugs

### Mystery flicker on first entry-form launch — even without parallel instances
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.10 (bug bash)
- **Status:** open — diagnosis revisited
- **Notes:** See [architecture/parallel-instance-flicker.md](./architecture/parallel-instance-flicker.md).
  Original diagnosis (second vimyasa process running) doesn't fully
  account for the user's recent observation. Needs a focused diagnostic
  session: kill all instances, reproduce, read `window-logging` output,
  identify what fired. May be tray icon repaint, dim overlay
  pre-warm, or OS-level animation. Not blocking ship but ruins the
  vibe.

### Onboarding tour: dim background sometimes lets non-vimyasa windows show through
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.10 (bug bash)
- **Status:** open
- **Notes:** Observed once on a tester's first entry-form launch.
  Likely an Electron `alwaysOnTop` level mismatch — the dim overlay's
  z-level may need to be `'screen-saver'` or `'pop-up-menu'` to clear
  user windows reliably (especially full-screen apps). Investigation:
  check `dim-overlay.ts` for the `setAlwaysOnTop(true, level)` call.

---

## Coordination / infrastructure

### Auto-update integrity audit
- **Lane:** coordination
- **Priority:** P1 (one-time, then quiet for a long time)
- **Version:** v0.1.10 (bug bash + audit window)
- **Status:** idea
- **Notes:** Highest-blast-radius surface. Verify code signing chain,
  electron-updater config, GitHub Releases trust model, what happens
  with a malformed/spoofed release. Probably a half-day audit ending in
  an `audits/auto-update.md`. Could pull forward into any earlier
  version's coordination slack — doesn't conflict with feature work.

### IPC surface inventory
- **Lane:** coordination
- **Priority:** P2
- **Version:** unassigned — pull into any version with coordination slack
- **Status:** idea
- **Notes:** Every `ipcMain.handle` is an API. Enumerate, document
  expected callers, flag any that take untrusted input. Output:
  `architecture/ipc-surface.md`.

### Smoke tests for core flows
- **Lane:** coordination → features (build), coordination (maintain)
- **Priority:** P2
- **Version:** start in v0.1.5 (alongside feedback build), grow per release
- **Status:** idea
- **Notes:** Not coverage. Just: QuickAdd opens, item saves, list
  renders, prewarm doesn't regress, hot list opens (once shipped). Run
  before each release. Probably Playwright. ~30 min initial setup, then
  add tests as features ship.

### ADRs for load-bearing decisions
- **Lane:** coordination
- **Priority:** P3
- **Version:** unassigned — write opportunistically when slack appears
- **Status:** idea
- **Notes:** 3–5 short ADRs for decisions you'd hate to re-litigate:
  theme system shape, prewarm vs. lazy, vibrancy choice, distribution
  model. One page each.

### Memory consolidation pass
- **Lane:** coordination
- **Priority:** ongoing
- **Version:** ongoing — run when memory feels noisy or before major releases
- **Status:** idea
- **Notes:** Run periodically (skill: `consolidate-memory`). Especially
  important once three lanes are writing to memory in parallel.
