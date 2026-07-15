# Coordination inbox

Async, durable communication channel from feature lanes to the
coordination lane. Append entries at the **top** (newest first).
Coordination lane sweeps this on next session, addresses each open
entry, marks resolved.

## When to write here

- **Question** — about lane boundaries, procedure, BACKLOG priority,
  or anything in `docs/` that's unclear or contradicts what you see in
  code.
- **Note** — architectural surprise, pattern observed, gotcha
  discovered. Things that future sessions would benefit from knowing
  but don't fit memory or architecture docs yet.
- **Blocker** — your work is stuck on a coordination decision (e.g.
  two lanes both need to touch a shared abstraction; cross-lane
  schema migration sequencing).
- **Rule disagreement** — a `WORKFLOW.md` rule didn't work for you,
  produced a bad outcome, or felt arbitrary in a specific case. Worth
  feeding back so the rule can be refined.

## When NOT to write here

- A bug you found → goes in `BACKLOG.md` directly.
- A question about how a piece of code works → grep / read it.
- A real-time blocker that needs an immediate decision → tell the
  human directly, the inbox is async.
- A long-form design discussion → file as a proposal in
  `docs/proposals/<topic>.md` instead.

## Format

```
## YYYY-MM-DD — <lane>
**Type:** question | note | blocker | rule-disagreement
**Body:** <one paragraph; concrete>
**Status:** open
```

Coordination lane resolves by appending a `**Resolved:**` line:

```
**Resolved:** <one sentence + pointer to where the answer landed>
```

Resolved entries get archived to `docs/notes/inbox-archive.md`
periodically so this file stays short and scannable.

## Heads-up to the human

Adding an entry here does NOT auto-notify the coordination lane. The
human is the routing layer: when a session writes to the inbox, it
should also surface that to the human ("I left a coordination note
about X") so the human knows to bring it up the next time they're
talking to coordination.

---

## Open entries

## 2026-06-26 — features → aesthetics
**Type:** note
**Body:** Hot list PR-4 prewarm built on `hot-list-prewarm` branch
(small slice — ~150 net lines: ensureHotListPrewarmed in
windows.ts, closeWindow hide-routing, list:show/list:hidden IPC
contract, ListWindow refocus on show). No file overlap with
aesthetics' update-prompt polish (UpdatePromptWindow.tsx / globals
.release-notes scope).

**Dev coordination:** holding off on `npm run dev` here per
WORKFLOW one-server-at-a-time. If aesthetics needs dev for visual
feedback on the update-prompt branch, take it first — I can
verify mine via build + manual launch (the prewarm is observable
via the first-summon latency drop without needing visual
iteration). Ping me to swap if you finish before I do.
**Status:** resolved
**Resolved (2026-07-15 — coordination, v0.1.8 ship):** Both branches shipped clean. Hot-list-prewarm landed via PR #52; aesthetics visual pass via PR #51 (re-opened as #51 after original #50 auto-closed on base-branch deletion). File-overlap prediction held — no cross-branch conflicts on merge. Dev-server swap wasn't needed; both lanes verified independently.

## 2026-06-26 — features
**Type:** note
**Body:** Taking the dev server for the `v0.1.8-bug-batch` branch
(three small bugs from the Undo + Phase 2 visual sweep — full list
in the BACKLOG entry of the same name). Flagging per the WORKFLOW
one-dev-at-a-time rule. Sibling #5 features session: please ack /
hold dev until this branch verifies + I clock out of dev, or ping
me if you need it sooner and I'll yield.
**Status:** resolved
**Resolved (2026-06-26 — coordination, PR #47 merged):** Bug-batch shipped; dev-server coordination need expired. Sibling #5 session pushed `release-notes-in-update` cleanly without conflicts. The one-dev-at-a-time pattern worked as designed — no parallel-instance flicker reports, no IPC conflicts.

*(Add new entries above this line, newest first.)*

## 2026-05-18 — themes → features
**Type:** note
**Body:** Phase 2 of color-tokenization landed on `color-tokenization-phase-2` (PR pending). Features can now build the user-facing Settings → Appearance tab on top of the themes-store field. Handoff details:

**Store API.** `themes.setAppearance(mode: 'light' | 'dark' | 'auto')` — already wired through IPC + preload + renderer zustand. Reads from `useThemesStore((s) => s.appearance)`. Cross-window broadcast on change (same plumbing as motion blur). Schema v7 → v8 with `'dark'` as the migration default (preserves v0.1.7 behavior for existing users; no surprise mode switch on update).

**UI shape (recommendation, not blocking).** Per Decision 4 of the proposal + Apple HIG: three radio options in order **Light / Dark / Auto** (Light first matches macOS System Settings convention). Section title `"Appearance"`. Subtitle on Auto: something like `"Follows your macOS system setting."` — copy your call. The proposal had A1–A7 copy candidates if you want a starting point.

**Where it goes.** Looks like there's no Appearance tab in `Settings/` yet — easiest path is a new `AppearanceTab.tsx` mirroring `GeneralTab` / `AdvancedTab` layout. Add the tab to `SettingsWindow.tsx` tab list. The "Theme: Auto / Light / Dark" radio group is the only control for now; future color modes (Phase 4) sit in the same tab.

**No coordination blocker — your PR rebases on Phase 2 once it merges.** I've also added a Segmented control in `ThemeDevPanel` mirroring the same IPC so themes-side iteration on light tokens can continue without waiting on the Settings tab (dev-only, won't conflict with your work). Leaving it in place after merge — useful Phase 2+ dev knob alongside the bg darkness slider.

**Vibrancy material caveat (out of scope for v0.1.8, worth knowing).** The macOS `vibrancy: 'under-window'` material auto-adapts to the system mode but NOT to vimyasa's app-level appearance setting. So a user who explicitly picks Light while system is Dark gets a white CSS overlay over dark vibrancy — readable but not ideal. A clean fix is a main-process `setVibrancy(material)` call on appearance change with a light material like `'sidebar'` or `'titlebar'`, but it touches BrowserWindow lifecycle and probably wants its own coordination scoping pass.
**Status:** resolved
**Resolved (2026-05-18 — features → coordination, PR #42 merged):** Features built `AppearanceTab.tsx` exactly as recommended — three radio options in Light/Dark/Auto order, default Dark, copy locked from proposal A1–A6, consumes `themes.setAppearance` + `useThemesStore((s) => s.appearance)` directly. The branch was initially built off pre-Phase-2 main and would have reverted themes' work on merge; coordination caught the regression in review, features lane rebased onto current main (Phase 2 themes-side included), reviewed clean (~109 net lines: AppearanceTab.tsx + SettingsWindow.tsx tab registration + App.tsx route guard), merged via PR #42. Vibrancy material caveat captured as a standalone BACKLOG entry for v0.1.9/v0.1.10 scoping.

## 2026-05-18 — themes
**Type:** note
**Body:** Magic Colors visibility check for Phase 2 (per the dispatch brief: "If they read poorly: surface to human via INBOX with options ... Do NOT decide unilaterally."). Justin tested live in dev with the new `ThemeDevPanel` → Appearance segmented control and confirmed light-mode legibility reads well overall — no Magic Colors regression flagged. Theme 1 surfaces (`quickadd-input`, `list-item-edit`, `list-add-new`, `feedback-input`) stay as-is for v0.1.8 ship — option (c) "leave as-is" effectively chosen. If a tester later reports the rainbow palette reading oppressive on a light bg, the two follow-up paths remain on the table: (a) per-mode `paletteOverride` in `THEME_1_SURFACE_OVERRIDES`, or (b) auto-disable Theme 1 in light via a `baseActive` gate in `GlowSurface`. Tracked here so future-self knows the decision trail.
**Status:** resolved
**Resolved (2026-05-18 — themes, dev verification):** Light-mode legibility approved; Magic Colors stay unchanged in v0.1.8.

*(Add new entries above this line, newest first.)*

---

## Resolved entries

## 2026-05-08 — themes
**Type:** note
**Body:** Phase 0 of color-tokenization landed (PR #33). Two findings worth Phase 1's attention before baking the Layer 2 dark-mode bg token:

**1. Chosen value: alpha 0.7.** Justin dialed this in via the dev slider. The new default in `DEFAULT_EFFECTS_CONFIG.devBgBaseA` and the `--bg-base-a` fallback in `:root` both ship at 0.7. When Phase 1 builds the Layer 2 token taxonomy, the dark-mode bg-base token should map to whatever produces this same look (effectively `rgba(0, 0, 0, 0.7)` painted over `vibrancy: 'under-window'`).

**2. Decision 6 of the proposal needs revisiting.** The proposal said "instead of changing opacity (which would lose vibrancy character), only the OKLCH lightness component drops." That reasoning held for a *colored* overlay where bumping alpha lets the tint dominate over vibrancy's color-picking. But for a **pure-black** overlay it's wrong — black has no color to dominate with, so raising alpha just dims vibrancy uniformly while preserving its character. Phase 0 ended up flipping to pure-black + variable alpha mid-iteration because L-tuning at fixed 0.1 alpha produced nearly-imperceptible changes (the original mechanism was solving a problem that didn't exist). Phase 1 should decide: keep OKLCH-decomposable tokens for *future color modes* (where chroma/hue matter), but the dark-mode bg-base specifically can stay as a simple `rgba(0, 0, 0, A)` since it's neutral by design. Worth a one-line amendment to Decision 6.
**Status:** resolved
**Resolved (2026-05-08 — coordination, v0.1.7 release-prep):** Both findings addressed. (1) Alpha 0.7 baked as the v0.1.7 default — slider stays in `ThemeDevPanel` for Phase 1+ iteration. (2) Proposal Decision 6 amended via footnote pointing at this INBOX entry; Phase 1 BACKLOG entry carries the amendment forward (dark-mode bg-base specifically can use `rgba(0, 0, 0, var(--bg-base-a))` directly OR `oklch(0 0 0 / var(--bg-base-a))` — both produce same color; Phase 1 picks based on shape symmetry preference). OKLCH decomposition (Decision 5) still applies for future color modes where chroma/hue matter. CHANGELOG entry for v0.1.7 acknowledges the in-flight refinement publicly.

## 2026-05-05 — themes
**Type:** note
**Body:** Two doc-rot items found while auditing `docs/architecture/theme-system.md` against fresh context after shipping PR #26 (feedback-input surface): (1) line 10 says "v0.1.4 ships Theme 1" and line 140 says "Live release: v0.1.4" — actual live is v0.1.5 per BACKLOG. Already stale before my PR. (2) The clock-out prompt pointed me at `docs/evolution/theme-system.md` but no such file exists; only `docs/architecture/theme-system.md` is present. Either the path was a typo or `docs/evolution/` is planned but not yet created. Separately: once PR #26 merges, the arch doc's surface count (8 → 9), `SURFACE_IDS` list, baked-surface list (3 → 4), and per-surface mount-points table will need a `feedback-input` row — flagging here so coordination doesn't miss it on the post-merge doc sweep.
**Status:** resolved
**Resolved (2026-05-05 — coordination, release-prep PR):** All three doc-rot items addressed in the same release-prep PR. (1) Live-release reference and Theme 1 v0.1.4-only attribution updated in `docs/architecture/theme-system.md` summary, surface count corrected from 8 → 9, baked count from 3 → 4. (2) `docs/evolution/theme-system.md` does now exist (created in PR #25 Historian foundation); the typo at clock-out was correct in spirit but timing-off (PR #25 hadn't merged yet when themes session started). (3) Mount-points table updated with the `feedback-input` row + the v0.1.6 ship date noted on the bake. Pattern noted for future: when a themes PR ships a new surface, the architecture doc updates need to land in the same release window so the doc never goes stale across more than one release.

## 2026-05-05 — aesthetics → features
**Type:** note
**Body:** Asking features to add a Settings → **Advanced** tab with a
toggle for the carry-mode motion blur visual.

**Important:** the motion blur lives on the `carry-motion-blur-experiment`
branch (off `carry-mode-visuals` → off `keymap-onboarding`). It is NOT
in `carry-mode-visuals` (PR #27). Picking up this work means either
merging the experimental branch into a base your toggle PR sits on, or
rebasing on top of it. Coordinate with whoever lands the carry-mode
visual treatment first — the toggle PR depends on the experimental
branch landing.

### What the toggle controls

When **off** (default — opt-in): no motion blur. Carry mode plays the
plain slide + fade defined in `carry-mode-visuals`. Identical visual to
what's in PR #27.

When **on**: adds a directional trailing motion blur to the send
animation via SVG filters + JS RAF. Defined in:
- `src/renderer/src/components/ListWindow/CarryMotionBlurFilters.tsx`
  — SVG `<defs>` mounted inside `ListWindow`. Two filter chains
  (`#carry-trail-left`, `#carry-trail-right`).
- `src/renderer/src/hooks/useCarryAnimation.ts` — `playBlurRamp(direction)`
  function that RAF-ramps the SVG filter's `stdDeviation` and trail
  alpha from 0 → peak over the first 30% of the send.

### What features needs to gate

Two sites apply motion blur. **Both** must respect the toggle:

1. **CSS filter application** (`src/renderer/src/styles/globals.css`,
   in the `.item-row-sending-left` and `.item-row-sending-right`
   blocks):

   ```css
   filter: url(#carry-trail-left);   /* and -right */
   ```

   Suggested: gate via a body class. When toggle is on, add
   `motion-blur-enabled` to `<body>` (or the renderer root). Then
   change CSS to:

   ```css
   .motion-blur-enabled .item-row-sending-left { filter: url(...); }
   ```

   This keeps gating in CSS — no per-row prop drilling.

2. **JS RAF ramp** (`src/renderer/src/components/ListWindow/ListWindow.tsx`,
   in `carrySendToList`, currently around line 339):

   ```ts
   playBlurRamp(direction)
   ```

   Wrap in a check: `if (motionBlurEnabled) playBlurRamp(direction)`.
   The RAF is cheap (60 frames over 24ms) but skipping it when
   disabled keeps the SVG attribute mutations from happening
   unnecessarily.

`<CarryMotionBlurFilters />` itself can stay mounted unconditionally —
it's just SVG `<defs>` (zero render cost when no element references
the filter URL). No need to gate the component.

### Persistence + UI

- **Setting key** (suggestion): `effects.carryMotionBlur` (boolean,
  default `false`).
- **UI**: new "Advanced" tab in Settings. The existing pattern in
  `src/renderer/src/components/Settings/GeneralTab.tsx` (the
  launch-at-login toggle) is the model — same pill-toggle markup,
  same flat layout. Title: "Motion blur on carry-mode send" with a
  subtitle like "Adds a directional motion-blur trail when sending
  an item to another list. Off by default."
- **Cross-window**: list windows need to react when the user toggles
  in Settings. Either fire an IPC broadcast on toggle change and have
  list windows listen, or write to a shared store the list windows
  already subscribe to (`useStore` if you want it user-data-shaped, or
  a new `usePreferencesStore` if it should be its own thing).

### Why opt-in default

The blur uses CSS `filter:` which forces off-screen rendering during
the send. Text quality may degrade slightly even at `stdDeviation: 0`
(filter region is allocated regardless). Opt-in keeps the default
experience untouched while letting users who want the effect turn it
on. Easy to flip to opt-out later if it proves stable.

### Tunable values (for the toggle PR description)

If features wants to surface any of these as separate sub-toggles or
sliders later (probably not for v1):
- `CARRY_BLUR_MAX_PX` (peak stdDeviation): 6
- `CARRY_TRAIL_ALPHA_MAX` (peak trail alpha): 0.5
- `CARRY_BLUR_RAMP_FRACTION` (fraction of duration spent ramping): 0.3
- `dx` in the filter feOffset nodes (trail offset distance): ±14

These all live as `export const`s in
`src/renderer/src/hooks/useCarryAnimation.ts` and as CSS variables in
`globals.css`.
**Status:** resolved
**Resolved (2026-05-05 — features):** built on
`carry-motion-blur-toggle` (off `carry-motion-blur-experiment`).
Settings → Advanced tab with the toggle; persistence under
`effects.carryMotionBlur` in DataStore (defaults false). Body class
`motion-blur-enabled` set from App.tsx; CSS rules in globals.css
gate the `filter: url(...)` declarations behind that class. JS RAF
ramp gated by `carryMotionBlurEnabled` in ListWindow's
`carrySendToList`. Cross-window: setEffects IPC broadcasts
data-changed (sender excluded), which any open window picks up via
its existing onDataChanged → refresh subscription. Toggle PR is
stacked on the experimental branch — merge order: experimental
first, toggle second, or rebase the toggle if the experimental gets
squashed into something else.

## 2026-05-05 — aesthetics + features (joint)
**Type:** note
**Body:** Carry mode shipped end-to-end across two branches that have
now been merged on `carry-mode-visuals`:

- **Mechanism** (features, on `keymap-onboarding`): `m` enters/exits
  carry on the focused item; 0-9 sends to list N (0 = hot list); j/k
  + arrows reorder; Enter/Esc land. ItemRow accepts an `isCarrying`
  prop. Placeholder visual was a dashed accent outline.

- **Visual treatment** (aesthetics, on `carry-mode-visuals`): the
  dashed-outline placeholder is replaced by the real lift treatment
  (scale + drop shadow + inset edge), the `.list-carrying` container
  class dims non-carried siblings (multiplicative opacity, easy to
  pull if it doesn't earn its keep), and the send animation is wired
  via `useCarryAnimation.playSend()` — `await playSend(rowEl, dir)`
  resolves mid-flight so `sendItemToList` fires while the row's
  still in the air (feels instant).

Direction rule (per `getSendDirection` in
`src/renderer/src/hooks/useCarryAnimation.ts`): hot list ranks
highest; otherwise by `sortOrder`. To-hot = right; from-hot = left;
target > source = right; target < source = left.

**Still pending** — needs features lane:

  **Generic `'item-arrived'` broadcast** for the receipt pulse +
  auto-scroll on the receiving list window. Cross-window IPC, so
  it has to come from the main process. Suggested shape:

      broadcastItemArrived({
        itemId, fromListId, toListId,
        direction: getSendDirection(fromList, toList) // 'left'|'right'
      })

  Fired from wherever an item lands in a list (`sendItemToList`,
  future drag-between-lists, etc.). Any open ListWindow whose
  active list === toListId responds with:
    - `playReceipt(windowRootEl, payload.direction)` from
      `useCarryAnimation` (already exported)
    - Auto-scroll the new item into view (same mechanic as the
      "Auto-scroll to new item added via entry form" BACKLOG item
      — these can ship together).

  Adding the broadcast retroactively gives right-click "Send to
  List" the same treatment, with no extra wiring.

Tunable values: search `--carry-` in `globals.css` for the CSS
variables driving lift scale, send distance, pulse intensity, etc.
**Status:** resolved
**Resolved (2026-05-05 — features):** built on
`carry-motion-blur-toggle` (same branch as the toggle, since main-
process IPC changes were already required there). Implementation:
- `moveItem` IPC handler in `src/main/ipc.ts` now broadcasts
  `item-arrived` after persisting the move (skipped on same-list
  no-op moves). Direction computed in main via a small port of
  `getSendDirection`'s rule (hot list highest, then sortOrder) so
  no shared-package gymnastics.
- New `onItemArrived` subscription on `window.api` (preload + types).
- ListWindow subscribes; when `toListId === activeListId`, fires
  `playReceipt(windowRootRef.current, direction)` AND sets
  `pendingScrollItemId` so the existing scroll-into-view effect
  reconciles once the item lands in `items`. Same scroll mechanic
  as the entry-form-add path; both feel identical.
- Right-click "Send to List" gets the treatment for free (it
  routes through `sendItemToList` → `moveItem`).

## 2026-05-04 — features
**Type:** note
**Body:** Feedback messenger PR 2 ships the textarea bare (no GlowSurface
wrap). If themes lane wants the feedback window to participate in Theme
1 (or a future themed treatment), register a new `feedback-input`
surface and wrap the `<textarea>` in
`src/renderer/src/components/Feedback/FeedbackWindow.tsx`. Same pattern
as `quickadd-input` on QuickAddFixed. Skipped here intentionally to
keep PR 2 strictly features-lane.
**Status:** resolved
**Resolved (2026-05-04 — coordination):** captured as a BACKLOG entry
("Feedback window — themed input surface", P3, themes lane, v0.1.9).
Themes lane will pick it up when they're in this code for focus-state
cues anyway.
