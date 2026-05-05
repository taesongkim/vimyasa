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
