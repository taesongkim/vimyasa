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

Live release: **v0.1.7**. Planned next sequence:

| Version | Theme | Primary contents |
|---|---|---|
| ~~**v0.1.5**~~ | ~~Feedback messenger~~ | ✅ Shipped — Cmd+Shift+\\ feedback window, Cloudflare Worker → Resend → email pipeline. |
| ~~**v0.1.6**~~ | ~~Hot list + carry mode + capture-flow polish~~ | ✅ Shipped — hot list (`Cmd+Shift+H`, holds 0, slides from right), carry mode (`m` to pick up, 0-9 to send, j/k to reorder, Enter/Esc to land), Enter→A archive change, `r` for rename, edit caret fix, motion blur on send (default OFF, toggle in Settings → Advanced), auto-scroll to entry-form adds, deselect-on-new-draft, `item-arrived` receipt pulse. Carry mode + the two usability wins were pulled forward from v0.1.8. |
| ~~**v0.1.7**~~ | ~~Darker dark mode + Phase 0 of color tokenization~~ | ✅ Shipped — interface backgrounds darkened (alpha 0.7 over pure-black, preserving translucency); dev-only `ThemeDevPanel` slider for live tuning; Decision 6 of color-tokenization proposal amended post-implementation. Foundation for Phase 1+ (full tokenization, light mode, cross-project extraction). |
| **v0.1.8** | Light mode + Undo + release-notes-in-update + hot-list prewarm | **Phase 1** of color tokenization (invisible Layer 1/2/3 restructuring of dark-mode interface colors). **Phase 2** of color tokenization (light mode mappings + Settings → Appearance toggle, default Dark, options Light/Dark/Auto). Plus Undo (3–5 step ring buffer, single-list, in-session). Plus release-notes-in-update (GitHub release notes shown in auto-update prompt). Plus hot-list PR-4 prewarm. Custom commands (#24) pushed to v0.1.9. Substantial bundle — ~2.5 days of build across lanes. |
| **v0.1.9** | Focus-state cues + backup + themed feedback input | Themes lane: focus-changed event + flash/glow via existing magic-colors infra. `feedback-input` surface bake. Features lane: discover existing export, ship tested import. |
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
- **Version:** v0.1.6 — **shipped** (Phase 1: PR-1, PR-2, PR-3 in single delivery via PR #28)
- **Status:** ✅ merged. PR-4 prewarm bundled into v0.1.8 (alongside light mode + Undo + release-notes-in-update). Theme 1 inheritance is automatic via component reuse (`list-item-edit` + `list-add-new` surfaces fire on hot-list items same as regular list items).
- **Notes:** Pinned to top of right-click "Send to List" submenu with divider. Cross-side number swap (press 0 from a regular list to switch to hot list, press 1-9 from hot list to switch). Tray entry. See [proposals/hot-list.md](./proposals/hot-list.md) for the original design.

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
- **Version:** v0.1.8 (confirmed; bundled with light mode release)
- **Status:** scoped → 3–5 step in-memory ring buffer, in-session only,
  single-list scope. `Cmd+Z` / `Cmd+Shift+Z`. Covers add / edit /
  archive / delete (and reorder if cheap).
- **Notes:** No persistence across summons. No cross-list undo (deferred
  to v0.1.10+ if ever). Estimate: 2–3 active hours.

### Carry-mode motion blur (Settings → Advanced)
- **Lane:** features (toggle); aesthetics (effect itself)
- **Priority:** P3
- **Version:** v0.1.6 — **shipped**, default OFF
- **Status:** ✅ merged in PR #28; default re-flipped to OFF in a small follow-up before publish. The text-quality degradation aesthetics had originally flagged (CSS `filter: url(...)` allocates filter region for off-screen rendering even at zero stdDeviation) was confirmed during the human's pre-publish dev verification — visible enough that opt-in is the right default. Polish stays available; toggle lives at Settings → Advanced.
- **Notes:** Settings → Advanced tab with toggle "Motion blur on carry-mode send". Persistence at `effects.carryMotionBlur`. Body class `motion-blur-enabled` gates CSS `filter: url(...)` rules; JS RAF ramp gated in ListWindow's `carrySendToList`. Future work: scope the filter tighter (or use a different technique) to flip default back to ON without the text quality trade.

### Move-item flow — "carry mode"
- **Lane:** features (mechanism); aesthetics (visual treatment + send animation + motion blur)
- **Priority:** P2
- **Version:** v0.1.8 → **pulled forward to v0.1.6 — shipped**
- **Status:** ✅ merged in PR #28. Mechanism + visual treatment + send animation + receipt pulse on receiver all landed in one delivery.
- **Notes:** Carry mode is sustained — 0-9 sends + exits, j/k reorders + persists, Enter / Esc exit at current position. `m` also lands (toggle, not just enter). Item-arrived IPC broadcast handles cross-window receipt pulse + auto-scroll. Right-click "Send to List" inherits the same treatment for free.

### Window-content load speed — hyper-fast first-summon for entry form, list, hot list
- **Lane:** features (primary) + aesthetics (perceived-snappiness consults)
- **Priority:** P2
- **Version:** unassigned — **needs deeper pass with coordination** to scope (probably one or more proposals depending on root cause spread)
- **Status:** idea (2026-05-08, observed during v0.1.7 dev verification)
- **Notes:** Justin observed inconsistent content-appear speed across windows during v0.1.7 dev verification. The bar he wants: **hyper-fast even on first load**, for entry form, list windows, and hot list specifically. Existing prewarm patterns (QuickAdd is already prewarmed; see `docs/architecture/quickadd-prewarm.md`) help but don't fully solve perceived speed.
  Investigation areas worth a coordination scoping pass:
  - **Quantify the inconsistency.** Capture summon-to-painted timings per window type (cold, warm, post-restart). No-DevTools options: log to terminal from main, render a transient FPS/timing readout in dev mode, or have a tester report perceived ranges.
  - **List-window prewarming.** QuickAdd is prewarmed; list windows are not. Pattern is documented in `docs/architecture/quickadd-prewarm.md` with notes on what list-window prewarm needs (per-listId map, scroll/focus state preservation, AnimatePresence costs with hundreds of items).
  - **Hot list prewarming.** Same pattern, single-instance — naturally easier to prewarm than per-listId list windows. Originally PR-4 of the hot-list proposal.
  - **First-paint paint-blockers.** Anything synchronous between window-show and content-paint (theme hydration is already sync per the prewarm pattern; verify nothing else is blocking).
  - **Animation timing perception.** A 250ms fade-up may *feel* slow even if the data is ready instantly. Aesthetics consult.
  Coordinate with the `Hot list PR-4 prewarm` line in the v0.1.6 hot list entry — that's the same surface for hot list.
- **Lane:** themes
- **Priority:** P2
- **Version:** v0.1.7 — **shipped**
- **Status:** ✅ merged in PR #33. Mid-iteration pivot from OKLCH-lightness tuning to pure-black-with-alpha (Decision 6 of the proposal got amended in real time; see proposal footnote and INBOX 2026-05-08 — themes). Final baked default: alpha `0.7` over pure black.
- **Notes:** Slider stays in `ThemeDevPanel` as dev-only tooling for Phase 1+ iteration. `effects.devBgBaseA` persists in themes-store as the source of truth for the dark-mode bg darkness; Phase 1 will fold this into the Layer 2 taxonomy.

### Phase 1: tokenize current dark mode (no user-visible change)
- **Lane:** themes (primary), aesthetics (legibility audit if needed)
- **Priority:** P2
- **Version:** v0.1.8
- **Status:** in-flight (themes lane, branch `color-tokenization-phase-1`, 2026-05-10)
- **Notes:** Per [proposals/color-tokenization.md](./proposals/color-tokenization.md) Phase 1. Restructure existing dark-mode interface colors into Layer 1 (raw OKLCH palette) + Layer 2 (semantic dark-mode mappings) + Layer 3 (component shims where needed). All existing colors preserved as tokens; bg-base default carries forward the v0.1.7 alpha 0.7 pure-black. Deliverable: vimyasa renders identically to v0.1.7 but powered by tokens. **Decision 6 amendment applies:** dark-mode bg-base specifically can use `rgba(0, 0, 0, var(--bg-base-a))` directly OR `oklch(0 0 0 / var(--bg-base-a))` — both produce same color; Phase 1 picks based on shape symmetry preference. **Ships before Phase 2** as a separate PR (invisible-change validation; easier to revert if anything subtly breaks).

### Phase 2: light mode + Settings → Appearance
- **Lane:** themes (Layer 2 light mappings + legibility tuning), features (Settings tab), aesthetics (legibility audit)
- **Priority:** P2
- **Version:** v0.1.8 (with Phase 1)
- **Status:** ready to dispatch after Phase 1 lands
- **Notes:** Per [proposals/color-tokenization.md](./proposals/color-tokenization.md) Phase 2. Add Layer 2 light-mode mappings, Settings → Appearance tab with three radio options (**Light / Dark / Auto**, in that order — Mac System Settings convention). **Default is Dark** (preserves v0.1.7 behavior for testers, no surprise on update; reverses the original proposal's auto-default decision). Auto follows `prefers-color-scheme`. Audit every component for legibility under light mode. Magic Colors (Theme 1 surfaces) stay unaffected — they're theme-specific, not interface tokens. Vimyasa remains "dark-mode-default-by-intent" with opt-in light/auto — `user_role.md` memory doesn't fully reverse, just gains a footnote about opt-in light.

### Phase 3: cross-project extraction (design-tokens-justin)
- **Lane:** coordination (package setup), themes (consumer wiring)
- **Priority:** P3
- **Version:** v0.1.9 or v0.1.10 (provisional)
- **Status:** idea — proposal locked
- **Notes:** Per [proposals/color-tokenization.md](./proposals/color-tokenization.md) Phase 3. Move Layer 1 + Layer 2 + mode CSS to a separate private repo (working name `design-tokens-justin`); vimyasa consumes via npm. Component shims (Layer 3) stay per-project. Writual will consume from the same package when its design lane starts. Final repo name + npm package name + visibility (private vs scoped public) deferred to scope-time.

### Phase 4: color-mode derivation prep
- **Lane:** themes
- **Priority:** P3
- **Version:** v0.2.0+
- **Status:** idea — proposal locked
- **Notes:** Per [proposals/color-tokenization.md](./proposals/color-tokenization.md) Phase 4. Set up token system for future color-mode switching via `data-color-mode` attribute. No actual color modes shipped — just the architectural readiness. A future v0.2.x picks the modes.

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
- **Version:** v0.1.8 (confirmed; bundled with light mode release)
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
  Coordination writes a proper proposal when v0.1.7 is closer.

### Feedback window — themed input surface
- **Lane:** themes
- **Priority:** P3
- **Version:** v0.1.6 — **shipped** (was v0.1.9; pulled forward by themes lane today)
- **Status:** ✅ merged → PR #26.
- **Notes:** `feedback-input` surface registered in `src/shared/themes.ts` and baked in Theme 1; textarea wrapped in `FeedbackWindow.tsx`. Schema bumped + migration applied. Mirror of `quickadd-input` on QuickAddFixed.

### Status redesign — colors, labels, customization
- **Lane:** features (data model + Settings) + aesthetics (visual + transitions) + coordination (proposal)
- **Priority:** P2
- **Version:** unassigned — substantial enough to warrant its own version slot once scoped
- **Status:** idea (2026-05-05) — **needs deeper pass with coordination** before any code starts
- **Notes:** User wants to rethink statuses. Open questions:
  - Are the current status labels and colors right, or could they be better?
  - Should statuses be user-customizable (rename labels, recolor)?
  - How does this interact with Theme 1 / future themes?
  - How does it interact with the cycling-order change (Active → Hold → Done) and the proposed 4th status (see below)?

  **Coupled with:** "New Done style + 4th 'Deprioritized' status" entry below — same proposal pass should address both. The Deprioritized status takes the *current* Done style; the *new* Done gets a distinct visual + transition animation. Timing-wise these belong together.

### New Done style + 4th status: Deprioritized
- **Lane:** features (data model + state machine) + aesthetics (style + transition animation)
- **Priority:** P2
- **Version:** unassigned — **bundle with Status redesign above**
- **Status:** idea (2026-05-05) — **needs deeper pass with coordination** before any code starts
- **Notes:** Current Done state's visual treatment becomes the new "Deprioritized" status (a fourth status — items the user has set aside indefinitely without committing them as truly done). New Done gets:
  - A distinct visual (different from Deprioritized, different from Active/Hold).
  - A celebratory / closing transition animation when an item moves into Done — should feel like a satisfying click.

  Cycling order with 4 statuses TBD; user has expressed preference for `Active → Hold → Done` (3-status cycle); if Deprioritized joins the cycle, the order question reopens.

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
- **Version:** v0.1.6 — **shipped** (was v0.1.8)
- **Status:** ✅ merged in PR #28.
- **Notes:** Via `quickadd:notify-item-added` IPC → broadcast `quickadd:item-added` → list window scrolls matching row into view if listId matches active list. Pure UX hint; persistence still flows through normal createItem path.

### Deselect prior item when new item is initiated
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.6 — **shipped** (was v0.1.8)
- **Status:** ✅ merged in PR #28.
- **Notes:** `startDraft` in ListWindow clears `focusIndex` to -1 before flipping `isAddingItem`. The draft surface owns the spotlight from that point until commit / discard.

### Scrollbar tracking lag
- **Lane:** features (or aesthetics, dealer's choice)
- **Priority:** P3
- **Version:** v0.1.10
- **Status:** idea
- **Notes:** Custom scrollbar in `ListWindow.tsx` lags slightly behind
  scroll position — likely a CSS smooth-scroll, transform-on-spring, or
  a debounced position-update. Should be one transition or
  request-animation-frame fix. Minor visual polish.

### Filter active state — visual cue
- **Lane:** features (state) + aesthetics (visual treatment)
- **Priority:** P3
- **Version:** unassigned
- **Status:** idea (2026-05-05)
- **Notes:** When a list filter is on, give a clear "filter active" cue
  so the user doesn't forget. Suggested: blinking orange indicator (per
  user). Could be on the filter toggle button, on the list window
  header, or both. Probably small once specced.

### Status cycling order: Active → Hold → Done
- **Lane:** features
- **Priority:** P3
- **Version:** unassigned (small; pull into any features-lane day)
- **Status:** idea (2026-05-05)
- **Notes:** Currently the status cycle goes Active → Done → Hold.
  User wants Active → Hold → Done so the muscle memory matches a
  natural progression. One-line change in the status-cycling handler;
  worth coordinating with the broader Status redesign (below) since
  that may change what statuses exist.

### Personality in Feedback textarea placeholder
- **Lane:** aesthetics (copy)
- **Priority:** P3
- **Version:** unassigned
- **Status:** idea (2026-05-05) — **user will write the copy themselves; coordination just needs to remind them when this gets picked up**
- **Notes:** The Feedback window's textarea has a generic placeholder.
  User wants something with personality. They'll provide the exact
  string when ready; aesthetics lane just wires it in.

### Unify `quickadd:item-added` + `item-arrived` events
- **Lane:** features
- **Priority:** P3
- **Version:** unassigned — pull into any version with features slack
- **Status:** idea — cleanup
- **Notes:** Two parallel "a row just landed in this list" channels
  exist today:
  - `window.api.quickAdd.onItemAdded` — fires from QuickAdd's
    `notifyItemAdded` IPC after `createItem` succeeds. ItemRow shows
    the white-glow flash via the lazy-mount path (createdAt < 1s).
  - `window.api.onItemArrived` — fires from main after `moveItem`.
    ItemRow shows the same flash via the parent-driven `arrivalFlash`
    prop.
  Both produce identical visuals + use the same scroll-into-view
  mechanism. They could collapse to a single `item-arrived` event
  with a `kind: 'created' | 'moved'` discriminator (and `createItem`
  fires it with `kind: 'created'`). The `arrivalFlash` prop becomes
  the sole flash trigger; ItemRow's lazy-mount check on `createdAt`
  retires. Not urgent — current code is clean and works. Worth doing
  only when in this code anyway (e.g., adding another arrival
  source).

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

### Auto-updater EPIPE crash on closed-stdio main process
- **Lane:** features (defensive fix in auto-updater logger wrapping)
- **Priority:** P3
- **Version:** unassigned (bug-bash candidate; possibly v0.1.10)
- **Status:** open — reproducible by launching binary with stdio that closes mid-run
- **Notes:** Observed 2026-05-09 during a demo prep. Stack trace:
  `Error: write EPIPE` at `MacUpdater.executeDownload` → `console.log`
  → `Writable.write` → `_write` → `Socket._write` → `EPIPE`. Cause: the
  app was launched as a child of a Bash process (via
  `Vimyasa --version` from coordination's tooling); when the parent
  Bash closed its stdio, the app's stdout pipe broke, but
  electron-updater's logger kept trying to write `console.log` lines
  during update-check / download. Each write throws an uncaught
  exception in main → Electron's "JavaScript error in main process"
  crash dialog.
  Real-world impact: rare. Normal users launch via Finder / Spotlight
  / Dock (launchd-managed stdio, no parent). But any tester launching
  via terminal in a shell that loses stdio reproduces it.
  Defensive fix candidates:
  - Wrap `electron-updater`'s logger in try/catch (electron-updater
    accepts a custom logger via `autoUpdater.logger`).
  - Replace its logger with one that detects EPIPE and silently
    discards.
  - Suppress auto-update entirely when `process.stdout.isTTY` is false
    AND parent process is detached (too aggressive — would skip
    legitimate auto-updates for many users).
  Most likely the first option: a thin wrapper around the default
  logger that swallows EPIPE on write.
  Real low priority — the audit-update integrity work in v0.1.10 is a
  natural moment to also touch this.
- **Lane:** features
- **Priority:** P3
- **Version:** unassigned (bug-bash candidate; possibly v0.1.10)
- **Status:** open — possibly user error, possibly real bug
- **Notes:** A tester reported that during the onboarding tour, three
  entry-form attempts didn't result in items being saved to the list.
  Items added after onboarding worked normally. Possible causes:
  1. User pressed something other than Enter to commit (e.g. Tab,
     Esc) and entries were silently discarded.
  2. The onboarding-tour state machine eats certain keystrokes during
     specific tour steps.
  3. Race between tour-step transitions and entry-form submission.
  Next step: scan onboarding tour code for any place entry-form input
  could be dropped or routed weirdly during tour-driven state changes.

### Tray icon hidden when menu bar is full
- **Lane:** features (primary), coordination (proposal first if non-trivial)
- **Priority:** P2
- **Version:** unassigned — **needs deeper pass with coordination**
- **Status:** idea (2026-05-05)
- **Notes:** macOS menu bar can fill up (especially on smaller-resolution
  Macs or with many menu-bar apps); when it does, vimyasa's tray icon
  may get hidden behind the system clock or simply not be reachable.
  Solutions to consider in proposal:
  - Detect overflow and surface a warning / instruction to the user.
  - Offer a "show in dock instead" fallback (would change vimyasa's
    no-dock-icon stance — significant decision).
  - Encourage users to install Bartender / iBar / similar utility.
  - Bind a global "open vimyasa Settings" hotkey so the tray icon
    isn't the only entry to settings.
  Honest read: there's no clean Apple-blessed solution to "menu bar
  too full." Mitigation > fix.

---

## Coordination / infrastructure

### Reference docs (maintained ongoing)

- **[`docs/reference/popular-shortcuts.md`](./reference/popular-shortcuts.md)** —
  shortcuts used by apps in vimyasa's target demographic. Check before
  picking a new global hotkey. Update when new conflicts surface in
  testing or new vimyasa shortcuts ship. Last verified: 2026-05-04.
- **[`docs/reference/voice.md`](./reference/voice.md)** — vimyasa's
  voice and tone for user-visible copy. Two registers (in-app vs.
  release notes), patterns to use, things to avoid. Update when voice
  evolves (likely v0.2.0+).
- **[`CHANGELOG.md`](../CHANGELOG.md)** — narrative version history.
  Append a new section at top for each release that ships. The story
  per release, not just the bullets — those live on GitHub Releases.
- **[`docs/evolution/`](./evolution/)** — cross-version narrative arcs
  for long-running systems. First entry: theme system. Add a new arc
  when a system has spanned 2+ versions and is likely to keep growing.

### Multi-screen behavior audit
- **Lane:** coordination (audit + proposal); features (any fixes)
- **Priority:** P2
- **Version:** unassigned — **needs deeper pass with coordination** before any code starts
- **Status:** idea (2026-05-05) — triggered by tester confusion
- **Notes:** A tester on a multi-monitor setup reported confusion —
  for example, the tray icon was visible on one screen's menu bar but
  not on another's. Vimyasa was likely never tested rigorously on
  multi-monitor configurations. Audit candidates:
  - Tray icon visibility per screen (Electron tray on macOS attaches
    to one screen's menu bar; the other shows nothing — is that the
    expected behavior, or is there a per-screen mode?)
  - Window positioning when summoned (does it appear on the active
    screen vs. a fixed screen?)
  - Hotkey behavior when multiple screens are active.
  - Cross-Space behavior (already partially fixed in v0.1.3).
  - Onboarding tour step positioning across screens.
  - List window stacking when multiple screens are connected.

  Output: `docs/audits/multi-screen.md` documenting current behavior
  + recommended fixes. Likely a half-day audit + a follow-up PR per
  fix as scope warrants.

### Future Historian agent (cross-project)
- **Lane:** coordination (preparing the supporting docs); the agent itself lives outside this repo
- **Priority:** P3 — exploratory
- **Version:** N/A (cross-project, lives outside vimyasa)
- **Status:** idea — supporting docs landing in vimyasa now (CHANGELOG,
  voice.md, evolution arcs); the agent itself is a future tooling
  project
- **Notes:** The dev wants a "Historian" agent that builds an animated
  / interactive virtual museum of project evolution across all his
  projects. Lives in a separate private repo with read access to project
  repos, ingests git history + docs + visual artifacts, produces a
  reflective / shareable timeline view. Vimyasa's contribution is to
  document deliberately enough that the Historian can reconstruct the
  story retroactively. Specifically:
  - CHANGELOG.md (narrative, not just bullets) — landed.
  - docs/reference/voice.md (so AI-generated copy stays on-voice as
    the project ages) — landed.
  - docs/evolution/ (cross-version narrative arcs) — first arc landed
    for the theme system; add more as systems mature.
  - **Visual artifacts** (screenshots, GIFs at each release) — NOT yet
    landed. Worth a small `scripts/capture-release-snapshots.sh` that
    runs at release time. Future work.
  - **Rejected-alternatives explicitness** in proposals — going forward,
    every proposal has an "Alternatives considered" section that names
    what was rejected and why.
  When the dev is ready to build the Historian itself, they'll find
  ~75–80% of vimyasa's story already reconstructable from current
  artifacts. The remaining gap is mostly visual + a couple of
  retroactive narrative arcs.

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
