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

Live release: **v0.1.5**. Planned next sequence:

| Version | Theme | Primary contents |
|---|---|---|
| ~~**v0.1.5**~~ | ~~Feedback messenger~~ | ✅ Shipped — Cmd+Shift+\\ feedback window, Cloudflare Worker → Resend → email pipeline. |
| **v0.1.6** | Hot list — Phase 1 (visible) + release-notes-in-update | Hot-list PR-1 schema, PR-2 shortcut + window + slide animation, PR-3 number-0 wiring. Plus: surface GitHub release notes in the auto-update prompt window. |
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
- **Status:** proposed → Option A + phasing approved → **PR-1 + PR-2 + PR-3
  in-flight on `hot-list` branch (features lane).** PR-4 prewarm still
  v0.1.7. See [proposals/hot-list.md](./proposals/hot-list.md).
- **Notes:** Phasing is defined in the proposal.

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

### Carry-mode motion blur (Settings → Advanced)
- **Lane:** features (toggle); aesthetics (effect itself)
- **Priority:** P3
- **Version:** v0.1.6 (with carry-mode visuals)
- **Status:** in-flight on `carry-motion-blur-toggle` branch
  (features). Stacked on `carry-motion-blur-experiment` (aesthetics).
  Merge order: experimental first, toggle second.
- **Notes:** Settings → Advanced tab with single toggle "Motion blur
  on carry-mode send". Off by default — opt-in. Persistence under
  `effects.carryMotionBlur` in DataStore. Body class
  `motion-blur-enabled` gates the CSS `filter: url(...)` rules in
  globals.css; the JS RAF ramp in ListWindow's `carrySendToList` is
  also gated. See INBOX 2026-05-05 (resolved) for the full spec
  + tunable values.

### Move-item flow — "carry mode"
- **Lane:** features (mechanism); aesthetics (visual treatment, in-flight)
- **Priority:** P2
- **Version:** v0.1.8 → **pulled forward to v0.1.6** (in-flight on
  `keymap-onboarding` branch alongside the Enter→A archive split,
  `r`-rename, edit-mode caret fix, and the shortcut-surface updates).
- **Status:** in-flight. Mechanism done (features lane); aesthetics
  visual treatment in-flight on `carry-mode-visuals` branch (CSS
  classes + `useCarryAnimation` hook + integration with the `m` /
  0-9 / j-k / Enter-Esc state machine features built). Naming
  confirmed as "carry mode"; Enter conflict resolved by removing
  Enter-archives entirely (A keeps it). Carry mode is sustained:
  0-9 send + exit, j/k reorder + persist, Enter / Esc exit at
  current position.
- **Notes:** Receipt pulse on the receiving list window still needs
  a generic `'item-arrived'` IPC broadcast from features (so future
  flows — drag-between-lists, bulk ops, retroactively right-click
  "Send to List" — get the same treatment for free). See INBOX.

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

### Release notes in auto-update prompt
- **Lane:** features (primary), aesthetics (visual treatment)
- **Priority:** P2
- **Version:** v0.1.6
- **Status:** idea — quick scope only, not yet a proposal
- **Notes:** When the auto-update flow shows the "update available"
  message, include the GitHub release notes (markdown body of the
  release) as a tab or expanded section. `electron-updater` already
  exposes `releaseNotes` on the `update-downloaded` event. Likely
  ~half a day if the current update UI is a custom in-app window,
  +1–2 hours if it's a native dialog (would need migration). Open
  questions before building:
  1. Current update UI shape (custom vs. native).
  2. electron-updater concatenates skipped versions' notes —
     decide: show all, or just latest?
  3. Markdown renderer choice (`marked` is ~5kb, plenty).
  Coordination writes a proper proposal when v0.1.6 is closer.

### Feedback window — themed input surface
- **Lane:** themes
- **Priority:** P3
- **Version:** v0.1.9 (with focus-state cues — same lane, same release)
- **Status:** idea — spawned from features lane INBOX note (resolved 2026-05-04)
- **Notes:** Feedback window's `<textarea>` shipped bare in v0.1.5
  (no `GlowSurface` wrap). To make it participate in Theme 1 (or future
  themed treatments), register a new `feedback-input` surface in
  `src/shared/themes.ts` and wrap the textarea in
  `src/renderer/src/components/Feedback/FeedbackWindow.tsx` — mirror
  of `quickadd-input` on QuickAddFixed. Schema bump + migration (per
  the established pattern). Trivial once you're already in the themes
  code.

### In-app feedback messenger to dev
- **Lane:** features (built); coordination (Worker)
- **Priority:** P1
- **Version:** v0.1.5 — **shipped**
- **Status:** ✅ merged → PR #18. All three proposed PRs (settings +
  clientId, window + send, prewarm) shipped in one delivery. Worker
  live at `https://vimyasa-feedback.taesongkim.workers.dev`.
  See [proposals/feedback-messenger.md](./proposals/feedback-messenger.md)
  for the design and [`infra/feedback-worker/`](../infra/feedback-worker/)
  for the deployed Worker source.
- **Follow-ups in BACKLOG:** see "Feedback window — themed input
  surface" under Themes (v0.1.9), spawned from features lane's INBOX
  note that the textarea ships bare without a `GlowSurface` wrap.

---

## Usability tweaks

### Auto-scroll to new item added via entry form
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8 → **pulled forward to v0.1.6** (in-flight on
  `hot-list` branch alongside the hot-list PRs).
- **Status:** in-flight (features lane).
- **Notes:** Implemented via `quickadd:notify-item-added` IPC →
  broadcast `quickadd:item-added` → list window scrolls the matching
  row into view if the listId matches its active list. Pure UX hint;
  persistence still flows through the normal createItem path.

### Deselect prior item when new item is initiated
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.8 → **pulled forward to v0.1.6** (same branch).
- **Status:** in-flight (features lane).
- **Notes:** `startDraft` in ListWindow now clears `focusIndex` to -1
  before flipping `isAddingItem`. The draft surface owns the spotlight
  from that point until commit / discard.

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

### Reference docs (maintained ongoing)

- **[`docs/reference/popular-shortcuts.md`](./reference/popular-shortcuts.md)** —
  shortcuts used by apps in vimyasa's target demographic. Check before
  picking a new global hotkey. Update when new conflicts surface in
  testing or new vimyasa shortcuts ship. Last verified: 2026-05-04.

### Electron major-version upgrade
- **Lane:** features (build); coordination (proposal first)
- **Priority:** P2
- **Version:** unassigned — deserves its own dedicated effort, not bundled with feature work
- **Status:** idea — surfaced during 2026-05-05 npm audit triage
- **Notes:** Electron 33 is now ~8 majors behind (current is 41). The
  npm audit lists 18 CVEs against electron <=39.8.4, none of which apply
  to vimyasa's actual API usage (no `window.open`, `setAsDefaultProtocolClient`,
  `requestSingleInstanceLock`, `commandLineSwitches`, USB, offscreen
  rendering, service workers, iframes). Risk for shipped binary is low.
  But the upgrade itself is worthwhile — security posture and access to
  newer Electron features. **Do NOT use `npm audit fix --force`** (would
  jump to 41 and likely break things). Instead: coordination writes an
  upgrade proposal; features steps through 33 → 34 → ... → current with
  test verification at each major.

### npm audit: uuid v3/v5/v6 advisory
- **Lane:** coordination (tracking only)
- **Priority:** P3 — won't-fix unless usage changes
- **Version:** N/A (tracking)
- **Status:** assessed → no action needed
- **Notes:** Triaged during 2026-05-05 npm audit. uuid <14.0.0 has a
  buf-bounds-check issue in v3/v5/v6. vimyasa only imports `v4 as uuid`
  and uses random UUIDs; v3/v5/v6 (namespace UUIDs) are not used.
  Tracked here so a future audit triage doesn't re-investigate. If
  vimyasa ever starts using v3/v5/v6, revisit.

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
