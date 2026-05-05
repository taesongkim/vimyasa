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
**Status:** open

*(Add new entries above this line, newest first.)*

---

## Resolved entries

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
