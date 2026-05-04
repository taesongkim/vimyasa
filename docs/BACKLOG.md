# Backlog

Triaged ideas, features, and bugs across vimyasa. Each item has a lane,
a priority, and (where applicable) a pointer to its design doc.

**For lane sessions:** read this at startup. Mark items `in-flight` when
you start. Don't pick up items already `in-flight` in another lane.

**Status legend:** `idea` → `proposed` (has design doc) → `in-flight`
(branch open) → `merged` → archived out.

**Priority:** `P1` ship-blocker for current iteration · `P2` next
iteration · `P3` someday/maybe.

---

## Features

### Hot list — `Cmd+Shift+H`, holds 0, slides from right
- **Lane:** features (with theme + aesthetics consultations later)
- **Priority:** P1
- **Status:** proposed → see [proposals/hot-list.md](./proposals/hot-list.md)
- **Notes:** Phasing is defined in the proposal. PR 1 is schema-only,
  ships invisibly. Do not start until human approves Option A + phasing.

### Backup / restore user data
- **Lane:** features
- **Priority:** P1
- **Status:** idea — needs investigation
- **Notes:** User believes a JSON export exists but is untested.
  **First step:** discover what's actually wired (scan `ipc.ts` and any
  Settings tab); document current state; then propose a tested
  export+import flow. Coordinate with hot list — the schema needs to
  include `kind: 'hot'` once that lands.

### Undo / redo
- **Lane:** features
- **Priority:** P2
- **Status:** idea — needs scoping
- **Notes:** Two very different shapes possible:
  - **Cheap:** "undo last action only" — single-step inverse, applies
    to add/edit/delete/archive. ~1 day.
  - **Expensive:** real history stack with grouped operations,
    cross-list undo, persistence across summons. ~1 week.
  - Pick before building. Recommend cheap for v1.

### Move-item flow — "carry mode"
- **Lane:** features
- **Priority:** P2
- **Status:** idea — naming + ENTER conflict to resolve
- **Notes:** `m` toggles carry mode on focused item. Inside carry mode:
  number key → send to that list (incl. `0` → hot list); `j`/`k` →
  reorder in current list; `Esc` lands. **Open:** `Enter` already
  archives — needs a different commit key, or carry-mode reuses Esc
  exclusively. Suggest "carry mode" as the name (or "pickup mode"); user
  to confirm.

### Focus-state visual cue (flash + glow)
- **Lane:** themes (primary), aesthetics (timing/feel)
- **Priority:** P2
- **Status:** idea
- **Notes:** Wants a flash + steady glow on focus-level changes so users
  always know where shortcuts will land. **Use the existing magic-colors
  infrastructure** (beam/particles/burst); do not build a parallel
  visual layer. The `triggers` system already supports
  focus-change-style events — a new event name like `'focus-changed'`
  may be all that's needed. Coordinate with themes lane.

### In-app feedback messenger to dev (network-egress feature)
- **Lane:** features
- **Priority:** P3 — **gated on threat model**
- **Status:** idea — needs security review before any code
- **Notes:** Network-egress feature, will ship to testers, will live
  across multiple of the user's projects. Security questions:
  - Auth model (anonymous? signed by app? user identifies themselves?)
  - Rate limiting (per-machine? per-IP?)
  - What data goes over the wire (just the message? app version? OS?
    list count?). PII?
  - Receiving end: dedicated endpoint forwarding to email vs.
    in-app inbox.
  - Abuse vectors (testers spamming, scraped binary used for spam relay).
  - Cross-project reuse implies a shared service; design it portable.
  - Coordination lane should write a `proposals/feedback-messenger.md`
    before any code starts.

---

## Usability tweaks

### Auto-scroll to new item added via entry form
- **Lane:** features
- **Priority:** P2
- **Status:** idea — small win
- **Notes:** Mechanic exists for `n` in-list (auto-scrolls focused
  item into view). Reuse it when entry form adds an item to the
  currently-open list whose visible area doesn't contain the new item.
  Likely a one-IPC-event addition: `quickadd` triggers `item-added`,
  list windows that contain that item scroll to it.

### Deselect prior item when new item is initiated
- **Lane:** features
- **Priority:** P3
- **Status:** idea — tiny
- **Notes:** When `n` (or shortcut, or anything else) starts a new
  item draft, the previously-highlighted item should lose its selection
  state. Trivial — likely a single state-clear in the new-item handler.

### Scrollbar tracking lag
- **Lane:** features (or aesthetics, dealer's choice)
- **Priority:** P3
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
- **Status:** idea
- **Notes:** Highest-blast-radius surface. Verify code signing chain,
  electron-updater config, GitHub Releases trust model, what happens
  with a malformed/spoofed release. Probably a half-day audit ending in
  an `audits/auto-update.md`.

### IPC surface inventory
- **Lane:** coordination
- **Priority:** P2
- **Status:** idea
- **Notes:** Every `ipcMain.handle` is an API. Enumerate, document
  expected callers, flag any that take untrusted input. Output:
  `architecture/ipc-surface.md`.

### Smoke tests for core flows
- **Lane:** coordination → features (build), coordination (maintain)
- **Priority:** P2
- **Status:** idea
- **Notes:** Not coverage. Just: QuickAdd opens, item saves, list
  renders, prewarm doesn't regress, hot list opens (once shipped). Run
  before each release. Probably Playwright. ~30 min initial setup, then
  add tests as features ship.

### ADRs for load-bearing decisions
- **Lane:** coordination
- **Priority:** P3
- **Status:** idea
- **Notes:** 3–5 short ADRs for decisions you'd hate to re-litigate:
  theme system shape, prewarm vs. lazy, vibrancy choice, distribution
  model. One page each.

### Memory consolidation pass
- **Lane:** coordination
- **Priority:** ongoing
- **Status:** idea
- **Notes:** Run periodically (skill: `consolidate-memory`). Especially
  important once three lanes are writing to memory in parallel.
