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

Live release: **v0.1.10**. Planned next sequence:

| Version | Theme | Primary contents |
|---|---|---|
| ~~**v0.1.5**~~ | ~~Feedback messenger~~ | ✅ Shipped — Cmd+Shift+\\ feedback window, Cloudflare Worker → Resend → email pipeline. |
| ~~**v0.1.6**~~ | ~~Hot list + carry mode + capture-flow polish~~ | ✅ Shipped — hot list (`Cmd+Shift+H`, holds 0, slides from right), carry mode (`m` to pick up, 0-9 to send, j/k to reorder, Enter/Esc to land), Enter→A archive change, `r` for rename, edit caret fix, motion blur on send (default OFF, toggle in Settings → Advanced), auto-scroll to entry-form adds, deselect-on-new-draft, `item-arrived` receipt pulse. Carry mode + the two usability wins were pulled forward from v0.1.8. |
| ~~**v0.1.7**~~ | ~~Darker dark mode + Phase 0 of color tokenization~~ | ✅ Shipped — interface backgrounds darkened (alpha 0.7 over pure-black, preserving translucency); dev-only `ThemeDevPanel` slider for live tuning; Decision 6 of color-tokenization proposal amended post-implementation. Foundation for Phase 1+ (full tokenization, light mode, cross-project extraction). |
| ~~**v0.1.8**~~ | ~~Light mode + Undo + release-notes-in-update + hot-list prewarm~~ | ✅ Shipped — Phase 1 (invisible tokenization restructure) + Phase 2 (light mode + Settings → Appearance: Light/Dark/Auto, default Dark). Undo/Redo (5-step ring buffer, cross-list, cross-window; main-process log with broadcast; edit-cancel and carry-cancel handled without log consumption; permanent delete now guarded by confirmation modal). Custom auto-update window with GitHub release notes rendered as markdown (aesthetics visual pass shipped separately as PR #51: typography hierarchy, adaptive height, Onboarding button treatment). Hot list PR-4 prewarm (first-summon latency drop; scroll/focus/edit state preserved across hides). Bug batch (Undo focus after cancel, delete-modal opacity, radio-dot centering). |
| ~~**v0.1.9**~~ | ~~Update-pipeline UX + Magic Colors light-mode~~ | ✅ Shipped — About surface in Settings → General renders current version's release notes as markdown (fetched by tag from GitHub, cached per-version). Manual update tray entries: Check for Updates… (user-initiated check + up-to-date/error affordances) and View Update Details (re-summons dismissed pending payloads). Magic Colors light-mode calibration on the four Theme 1 surfaces — discovery: it wasn't hue, it was geometry (glowDepth 0.5→0.8, strength 0.95→1.3) via a new `lightBeam` per-mode override on `BorderBeamConfig`; dark mode byte-for-byte unchanged. Small alongside: adaptive update-window vertical re-centering, Settings width auto-fits tab strip, light-mode legibility fix on shared onboarding-style buttons, About release-notes bullet/numbered lists render, tuned `glowDepth: 0.25` default on the small callout-button surface. |
| ~~**v0.1.10**~~ | ~~Clearer statuses + windows that stay with you~~ | ✅ Shipped — five-state item lifecycle (Default / Active / Pending / Complete / Hidden), status-change confirmation, and filters temporarily removed from the list UI. All user-opened utility windows float above other apps and open in the current macOS Space, including fullscreen apps. Entry, Feedback, and Hot List create on first summon, then persist for fast later summons; input glow is gated by both window and field focus. Data safety, diagnostics, and remaining bug-bash items were deliberately deferred rather than expanding this release. |
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
- **Status:** ✅ merged in full (PR-1, PR-2, PR-3 via PR #28; PR-4 prewarm via PR #52 in v0.1.8). Theme 1 inheritance is automatic via component reuse (`list-item-edit` + `list-add-new` surfaces fire on hot-list items same as regular list items).
- **Notes:** Pinned to top of right-click "Send to List" submenu with divider. Cross-side number swap (press 0 from a regular list to switch to hot list, press 1-9 from hot list to switch). Tray entry. See [proposals/hot-list.md](./proposals/hot-list.md) for the original design.

### Backup / restore user data
- **Lane:** features
- **Priority:** P1
- **Version:** v0.1.10 (moved from v0.1.9 in the 2026-07-15 scope reshuffle — deprioritized in the version-timing sense, not the intrinsic-priority sense; still P1)
- **Status:** idea — needs investigation
- **Notes:** User believes a JSON export exists but is untested.
  **First step:** discover what's actually wired (scan `ipc.ts` and any
  Settings tab); document current state; then propose a tested
  export+import flow. Must include `kind: 'hot'` in the export schema
  (hot list shipped in v0.1.6).

### Undo / redo
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8 (confirmed; bundled with light mode release)
- **Status:** ✅ shipped in v0.1.8 (PR #45, 2026-06-25). Architecture deviation from brief accepted: main-process owns the in-memory log (instead of shared Zustand renderer store) — captures undo entries at IPC mutation point, avoids renderer-side race conditions, same end result (single source of truth + cross-window sync via broadcast). Small copy typo in confirm-delete modal fixed in follow-up PR.
- **Scope (revised):** Covered actions — add item, edit text, change status, archive, unarchive, reorder within list, **move to another list** (carry mode / right-click Send / future drag). Status changes encode old value as generic string for future-proofing (Hold → In Progress rename, new statuses). Delete permanently is **NOT undoable** (paired with this work: add a confirmation dialog before destructive delete; copy candidates A1–A4 in dispatch brief). One undo entry per committed action (edits commit on Enter; carry mode commits on Enter/Esc land).
- **Cmd+Z behavior:** Order-sensitive handler. If item is in edit mode (typed but not committed) → exit edit mode + restore original text + no log consumption. If carry mode active (item picked up, not landed) → restore item to starting position + exit carry mode + no log consumption. Otherwise → pop undo log + apply inverse + push to redo stack. Cmd+Shift+Z is symmetric. Redo stack resets on any non-undo/redo action.
- **Architecture:** Shared Zustand renderer store, broadcast across windows (mirrors `themesStore` pattern). Single source of truth for undo log across hot list + all regular lists. Depth: 5 entries.
- **Out of scope (tracked):** List CRUD (create/rename/delete/reorder); comment CRUD; settings/preferences; delete permanently. Toast-on-undo deferred to v2 polish — see separate BACKLOG entry below.

### Undo — toast feedback on undo/redo (v2 polish)
- **Lane:** aesthetics (primary) + features (toast plumbing)
- **Priority:** P3
- **Version:** unassigned — polish for after v0.1.8 Undo ships
- **Status:** idea (2026-06-25, deferred from v0.1.8 Undo scope)
- **Notes:** v0.1.8 ships Undo with silent inverse (focus moves to affected item; no toast). Future polish: a small toast explaining what was undone — e.g. *"Undid: moved 'Pick up groceries' from Hot list to Inbox"* or *"Undid: archive of 'Pick up groceries'"*. Should auto-dismiss; non-blocking; visible from any list window. Aesthetics designs the toast surface (could reuse the feedback success "Message sent. Thanks!" treatment or be its own component); features wires it to the Undo store's last-action event. Candidate for v0.1.10 polish or v0.2.0.

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
- **Lane:** themes
- **Priority:** P2
- **Version:** v0.1.8 — **shipped (PR #38, 2026-05-13)**
- **Status:** ✅ merged. Layer 1 raw palette + Layer 2 semantic dark in `:root`. 18-component sweep renaming `--color-text` → `--color-text-primary`. Two new tokens: `--color-bg-base` (OKLCH-decomposed with alpha-driven darkness) and `--color-bg-menu` (replaces inline `rgb(19,19,19)` in FilterBar / TitleBar / dropdowns / ListsTab modal). Five dead tokens removed (zero callsites verified). Decision 6 amendment honored: `oklch(L=0 C=0 / alpha)` for dark-mode bg-base. Visual diff vs. v0.1.7: zero (user-verified pre-merge).
- **Notes:** Bundled a cross-lane "live About section" addition with explicit lane-violation disclosure (user asked mid-Phase-1; themes pushed back once per WORKFLOW, user repeated, did inline). New `app:getInfo` IPC + dev-build readout block in Settings → General (gated by `is.dev`). No follow-up BACKLOG entry needed for the About piece — complete fix to a real bug (stale hardcoded v0.1.0 string).
- **Out of scope (per spec, deferred):** light mode (Phase 2), Settings → Appearance toggle (Phase 2), Magic Colors / Theme 1 surface constants (stay theme-specific), cross-project extraction (Phase 3), onboarding-tour-specific surfaces (`.onb-callout`, `.onb-controls`, `.onb-dim-close` — one-off heavy-glass surfaces, not interface tokens).

### Phase 2: light mode + Settings → Appearance
- **Lane:** themes (foundation); features (Settings tab); aesthetics (legibility audit, done in dev)
- **Priority:** P2
- **Version:** v0.1.8 — **fully shipped (both halves)**
- **Status:** ✅ shipped. Themes foundation in PR #40 (2026-05-18); features Settings tab in PR #42 (2026-05-18, rebased onto Phase 2 main before merge — clean 109-line diff). Phase 2 is now complete end-to-end.
- **Notes:** Themes shipped: Layer 2 light-mode mappings via `[data-appearance="light"]` selector + auto-mode mirror via `@media (prefers-color-scheme: light)`. Schema v7 → v8 with new `appearance: 'light' | 'dark' | 'auto'` field (default `'dark'` for existing users). `effects.devBgBaseA` split into per-mode `devBgBaseDarkA` (0.8) / `devBgBaseLightA` (0.95). `themes:setAppearance` IPC wired through preload + zustand + cross-window broadcast. Dev panel got new Appearance segmented control + per-mode bg-darkness sliders (range bumped 0.05 → 1.0). Magic Colors legibility approved live in dev — Theme 1 surfaces stay as-is for v0.1.8 (option (c) in INBOX; future paths recorded if a tester later flags). Features shipped: `AppearanceTab.tsx` (radio group, three options Light/Dark/Match-system, default Dark) consuming the Phase 2 store API; `SettingsWindow.tsx` registers the tab between Themes and Feedback; `App.tsx` route guard. Copy locked from proposal A1–A6. **Vibrancy material caveat** noted in separate BACKLOG entry below — out-of-scope for v0.1.8, candidate for v0.1.9/v0.1.10.

### Magic Colors — light-mode legibility tuning
- **Lane:** themes (primary), aesthetics (visual feedback loop)
- **Priority:** P2
- **Version:** v0.1.9 — **shipped** (PR #61, 2026-07-16)
- **Status:** ✅ shipped. Path (a) taken (per-mode override, not baseActive gate). **Key discovery during iteration: it wasn't hue — it was geometry.** Live palette exploration ruled out a hue swap; on a near-white background the base `glowDepth: 0.5` / `strength: 0.95` renders as a thin faint rim regardless of color. Fix pulls the glow inward + up in intensity, palette untouched. New optional `lightBeam` field on `BorderBeamConfig`; `GlowSurface` resolves effective appearance (light/dark, auto via live `prefers-color-scheme` listener) and merges only defined `lightBeam` keys over the base. Dark mode is a zero-cost passthrough — byte-for-byte unchanged.
- **Notes:** Baked on the shared `MAGIC_COLORS_BEAM`, so all four Theme 1 surfaces (`quickadd-input`, `list-item-edit`, `list-add-new`, `feedback-input`) inherit automatically. Baked values: `glowDepth 0.5 → 0.8`, `strength 0.95 → 1.3` in light. Schema v8→v9 re-bakes those four surfaces (same mechanism as v4→v5). `ThemeDevPanel` gained "Light-mode override" tooling (per-blob OKLCH sliders + glow-depth/strength/etc. tuning + copy-lightBeam snippet button) — kept as dev-only tooling for future light-mode iteration. Insight worth capturing durably: **for a new surface bg, check geometry first, then palette.**

### Vibrancy material — adapt to vimyasa's app-level appearance
- **Lane:** features (BrowserWindow lifecycle), coordination (proposal scoping)
- **Priority:** P2
- **Version:** unassigned — **needs deeper pass with coordination** to scope
- **Status:** idea (2026-05-18, surfaced by themes lane during Phase 2 ship as out-of-scope-for-v0.1.8 caveat)
- **Notes:** macOS `vibrancy: 'under-window'` auto-adapts to the *system* appearance but NOT to vimyasa's *app-level* `appearance` setting. So a user who explicitly picks Light while the macOS system is Dark gets a white CSS overlay over dark vibrancy — readable but not ideal. Same caveat in reverse: Dark-in-vimyasa over Light-system. Fix: main-process `setVibrancy(material)` call on appearance change with a mode-appropriate material (light-mode candidates: `'sidebar'`, `'titlebar'`; dark-mode: keep current `'under-window'` or pick a darker named material). Touches BrowserWindow lifecycle (all summon paths — QuickAdd prewarm, list windows, feedback, settings, hot list). Wants its own coordination scoping pass to: (1) confirm the right material per mode by visual A/B, (2) decide whether `'auto'` mode lets the system handle it or whether vimyasa always sets explicitly, (3) handle the cross-window broadcast → main-process IPC for live updates. Candidate for v0.1.9 or v0.1.10 polish window.

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
- **Version:** v0.1.10 (moved from v0.1.9 in the 2026-07-15 scope reshuffle)
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
- **Status:** ✅ shipped in v0.1.8 (features baseline via PR #48; aesthetics visual pass via PR #51). Custom 480×520 frameless glass-surface window at `/update` replaces Electron's native dialog so markdown release notes render inline. Two phases (`'available'` + `'downloaded'`), `marked` for markdown (GFM enabled, memo'd), idempotent factory, push + pull pattern on mount. Multi-version skips concatenate chronologically with `---` separators, latest at top. Adaptive height via ResizeObserver + main-side clamp. Onboarding button styles for primary actions; scoped `.release-notes` typography in globals.css. Dev-only tray entries summon mock payloads for both phases.

### About surface — promote to production + show current version's release notes
- **Lane:** features (primary), aesthetics (visual treatment for the release-notes render)
- **Priority:** P2
- **Version:** v0.1.9 — **shipped** (PR #60, 2026-07-16)
- **Status:** ✅ shipped. Current version's release notes render at the bottom of Settings → General (kept in General per dev-verify feedback, not a dedicated tab). New `src/main/release-notes.ts` fetches release body by tag from the same public repo the updater pulls from; cached per version to disk (once-ever network hit, offline-safe after). New `about:getCurrentReleaseNotes` IPC. Four render states: loading / rendered / release-has-no-body / couldn't-load. Reuses the `marked` + `.release-notes` treatment from the update window. Bullet/numbered-list CSS bug in the shared scope was fixed as a v0.1.9 mid-verify polish (PR #63).

### User-facing update tray entries — "Check for updates" + "View update details"
- **Lane:** features
- **Priority:** P2 (bumped from P3 in the 2026-07-15 scope reshuffle — part of the coherent "update-pipeline UX" v0.1.9 theme)
- **Version:** v0.1.9 — **shipped** (PR #60, 2026-07-16)
- **Status:** ✅ shipped. Both entries in tray. "Check for Updates…" fires a user-initiated check via a new `userInitiatedCheck` flag that gates result affordances — the silent 4-hourly background check stays silent; only manual clicks show a window. Two new update-window phases (`up-to-date`, `error`) for the manual-check success/failure cases. "View Update Details" only appears when there's an actionable pending payload (dismissed earlier with Later); re-summons the window with that payload. Reuses `getPendingUpdatePayload()` + `showUpdatePrompt()` factory from PR #48. Dev mode short-circuits to the up-to-date window so the entry stays verifiable (electron-updater is inert unpackaged).
- **Notes:** v0.1.8 ships the auto-update prompt window so users SEE update details when electron-updater fires a real event. Missing: manual access. Two tray entries to ship together:
  1. **"Check for updates"** — triggers `electron-updater`'s `checkForUpdates()`. If an update is found, summon the update prompt window with the resulting payload. If not, surface a transient "You're on the latest version" affordance (toast or modal — to decide at scope time). Standard Mac convention; every shipping desktop app has this.
  2. **"View update details"** — if a pending update payload exists (i.e. user dismissed an earlier prompt with "Later"), re-open the window with that payload. Useful for the "what was that prompt about?" flow without waiting for next auto-check. If no pending payload, the entry could be gated (only shown when one exists) OR always shown but acts as a no-op with a hint.
  Both leverage existing `getPendingUpdatePayload()` + `showUpdatePrompt()` factory from PR #48. Small effort (~1–2 hr) once #48 lands. Worth bundling into v0.1.9 alongside other polish; don't ship v0.1.8 with these missing — auto-update path is sufficient for the imminent release.

### Feedback window — themed input surface
- **Lane:** themes
- **Priority:** P3
- **Version:** v0.1.6 — **shipped** (was v0.1.9; pulled forward by themes lane today)
- **Status:** ✅ merged → PR #26.
- **Notes:** `feedback-input` surface registered in `src/shared/themes.ts` and baked in Theme 1; textarea wrapped in `FeedbackWindow.tsx`. Schema bumped + migration applied. Mirror of `quickadd-input` on QuickAddFixed.

### Status redesign — 5-state lifecycle (default / active / pending / complete / hidden)
- **Lane:** features (schema + migration + IPC + space-bar cycle) + themes (dot colors + text dimness) + aesthetics (strikethrough + pulse motion + filter-bar visual) + coordination (proposal)
- **Priority:** P2
- **Version:** v0.1.10 (per 2026-07-16 clock-in) — headline redesign for the release
- **Status:** in-flight — decisions locked 2026-07-23; implementation is on the `status-lifecycle` branch. See [`docs/proposals/status-redesign.md`](./proposals/status-redesign.md).
- **Notes:** Retires the two earlier BACKLOG entries (*"Status redesign — colors, labels, customization"* and *"New Done style + 4th status: Deprioritized"*) which were 2026-05-05 sketches marked as needing a deeper coordination pass — this is that pass. New shape:
  - **5 states:** default (gray dot), active (yellow), pending (yellow pulse + glow, dimmed text), complete (green dot + strikethrough, dimmed text), hidden (transparent dot keeps row alignment, very dim text).
  - **Ethos:** progressively-dimmer text encodes progressively-lower attention priority; completion is settled rather than animated.
  - **Cycle:** space bar (unchanged key), order `default → active → pending → complete → hidden → default`.
  - **Migration:** `active`→`default`, `hold`→`pending`, `done`→`complete`.
  - **Filter bar:** hidden for now; no activation route remains.
  - **Pulse:** opacity + subtle glow, 1.5s, RAF/visibility lifecycle (pause only when window hidden).

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

### v0.1.7 auto-updater install failure — diagnose retrospectively
- **Lane:** features (main-process electron-updater)
- **Priority:** P2
- **Version:** v0.1.10 (diagnostic only — cannot ship a fix that reaches broken v0.1.7 installs)
- **Status:** open (2026-07-16, discovered post-v0.1.9-publish when Justin's own install failed to upgrade)
- **Symptoms:** On v0.1.7, auto-update detects newer versions and downloads them successfully. Clicking Install & Restart on the downloaded prompt quits the app but does not relaunch into the new version. On manual reopen, the app is still on v0.1.7 and the same failure loop begins. Reproduced twice — both v0.1.7→v0.1.8 (didn't notice because we assumed auto-update worked) and v0.1.7→v0.1.9 (caught because Justin flagged that the update window was still native — v0.1.7's UI — not the custom v0.1.8+ window).
- **Impact:** Every v0.1.7 tester is stuck on v0.1.7 unless they manually reinstall the newest DMG. Coordination-side outreach with a link to the latest GitHub release is the only fix that reaches them.
- **Diagnosis path:**
  1. `git log --oneline v0.1.6..v0.1.7 -- src/main/updater.ts src/main/index.ts electron-builder.yml` — see what changed in the updater path between the last known-working version (v0.1.6, assuming Justin got to v0.1.7 via auto-update from v0.1.6 successfully) and the broken version.
  2. Compare with electron-updater upstream changelog for the version range shipped in v0.1.6 vs v0.1.7 (`npm ls electron-updater` on those tags).
  3. Check `~/Library/Caches/vimyasa-updater/pending/` on a still-broken-v0.1.7 tester machine for install-log breadcrumbs (if any tester still on v0.1.7 is willing to peek before they manually reinstall).
  4. Suspect areas: signing cert or entitlements changes between v0.1.6 and v0.1.7 that break the Squirrel install swap; `quitAndInstall` args or timing; helper app packaging.
- **Cross-linked with:** "Add auto-update verification step to release cycle" (below) — the procedural fix that prevents this class of bug from shipping again.
- **Not blocking:** any future release. Diagnosis is retrospective. Testers still on v0.1.7 need direct outreach regardless of what we learn.

### Add auto-update verification step to release cycle
- **Lane:** coordination (procedural)
- **Priority:** P1 procedural — must be in place before next ship
- **Version:** applies v0.1.10 onward
- **Status:** ✅ shipped in this PR — `docs/WORKFLOW.md` release-cycle section documents the new step (canonical sequence step 4). BACKLOG entry retained for tracking.
- **Rationale:** The pre-2026-07-16 release cycle verified NEW version behavior in dev before dist:mac but NOT the actual auto-update path from the previous shipped version to the new draft. That gap let v0.1.7's broken auto-updater ship, then let both v0.1.8 and v0.1.9 ship "successfully" while no v0.1.7 tester could actually upgrade. Added a step 4 to the canonical release sequence: on a machine with the currently-shipped version installed, run the actual auto-update flow to the draft and confirm the app comes back on the new version. Only publish if the upgrade path lands cleanly. Same doc also captures the Apple-agreement-403 procedure from the v0.1.8 ship (accept on both developer.apple.com AND appstoreconnect.apple.com).
- **Follow-through:** the next release cycle (v0.1.10) exercises this new step for real. If Justin's machine can't easily be reverted to the currently-shipped version, coordination asks the user to do the upgrade check on their side before greenlighting publish.

### v0.1.8 hotfix — Auto mode not live-updating + Cmd+Z-in-edit keeps text
- **Lane:** features
- **Priority:** P1 (v0.1.8 ship-blocker)
- **Version:** v0.1.8 (hotfix — must land before dist:mac)
- **Status:** ✅ shipped in v0.1.8 (PR #55, 2026-07-15). Both bugs surfaced during Justin's dev-verify. Bug 1 fix extracted to new `src/main/appearance.ts` helper (25 lines) wiring `nativeTheme.themeSource` to the appearance value at startup + on `themes:setAppearance` / `themes:reset` — `'auto'` → `'system'` so mid-session macOS Light↔Dark toggles propagate live. Bug 2 fix uses `cancelPendingCommitRef` set before focus-move; commitEdit early-returns when true, sidestepping React's state batching (the synchronous focus-move fired blur → commitEdit before `setEditing(false)` flushed, so the captured draft was writing back to `item.text`). Bundled with two features-lane scope-adjacent PRs: [#56](https://github.com/taesongkim/vimyasa/pull/56) (universal Cmd+W / Escape fallback close at App root) and [#57](https://github.com/taesongkim/vimyasa/pull/57) (update-prompt copy fixes: Install Now → Download Now on the available window, Restart Now → Install & Restart on the downloaded window — features caught that the button contradicted the actual action since autoDownload=false).

### v0.1.8 bug batch — Undo + Phase 2 visual sweep
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8
- **Status:** ✅ shipped in v0.1.8 (PR #47, 2026-06-26).
- **Notes:** Three small bugs surfaced during v0.1.8 Undo + Phase 2
  visual sweep. Single PR covers all three.
  1. **j/k navigation lost after Cmd+Z during edit / carry.** Two
     separate causes that both presented the same way.
     - *Edit case:* after `undo-cancel`, focus drifted to the
       detached textarea so useKeyboard's textarea guard bailed.
       Fix: ItemRow's undo-cancel handler calls a new
       `onEditUndoCancel(index)` prop; parent does
       `setFocusIndex(idx) + scrollContainerRef.current?.focus()`.
       Container gained `tabIndex={-1}` + `focus:outline-none`.
     - *Carry case:* on lists with archived items,
       `startingOrder.indexOf(carryItemId)` returned the index in
       the FULL snapshot (which needs archived rows to preserve
       relative positions during the silent restore). On a list
       with ~400 archived items, `setFocusIndex(427)` stranded
       focus past `listItems.length`, so j/k still incremented
       focusIndex but `listItems[focusIndex]` was undefined → no
       row highlighted. Fix: snapshot the visible-list index
       (`focusIndex` itself) at enterCarry time via
       `carryStartingVisibleIdxRef`; onCheckCarry restores from
       that ref instead of computing an out-of-range index.
     - Bonus: useKeyboard now reads its config through a ref so
       the window listener stays referentially stable across
       renders. Eliminates a class of stale-closure races for
       every key (Space, n, a, etc.) — not just the original bug.
  2. **Confirm-delete modal bleed-through.** Backdrop and card were
     both translucent; list items showed through. New token
     `--color-overlay-strong: rgba(0, 0, 0, 0.7)` in globals.css for
     destructive-action modal reuse. Card switches from
     `--color-surface` to Phase 1's solid `--color-bg-menu`.
  3. **Radio dot off-center in Appearance.** Margin-based centering
     was numerically right but brittle against `border-2`. Swapped
     to flex `items-center justify-center` on the ring + dropped
     `m-0.5` from the dot.

### Mystery flicker on first entry-form launch — even without parallel instances
- **Lane:** features
- **Priority:** P2 (bumped from P3 in the 2026-07-15 scope reshuffle; kept at P2 through 2026-07-15 evening deferral — still Justin's call-out as a headline priority, just moved to a later ship window)
- **Version:** v0.1.10 (returned from v0.1.9 the same evening — dispatch was missed in the v0.1.9 ship cycle, deferred to next version rather than crunched)
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
