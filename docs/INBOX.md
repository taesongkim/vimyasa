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

## 2026-05-05 — aesthetics
**Type:** note
**Body:** Carry-mode visual primitives shipped on `carry-mode-visuals`
branch (CSS classes + `useCarryAnimation` hook in
`src/renderer/src/hooks/useCarryAnimation.ts`). Wiring contract for
features lane when the v0.1.8 mechanism lands:

  1. **Carry state — class toggling.** When carry mode is active on a
     focused item, add `item-row-carrying` to that ItemRow's outer
     `motion.div` and `list-carrying` to the items container in
     ListWindow (the `itemsContainerRef` div). Removing both classes
     exits the lifted state cleanly.

  2. **Send animation — middle-of-animation commit.** On number-key
     send, call:

         import { playSend, getSendDirection, CARRY_SEND_DURATION_MS }
           from '../../hooks/useCarryAnimation'

         const direction = getSendDirection(currentList, targetList)
         await playSend(rowEl, direction)
         await sendItemToList(item.id, targetList.id)

     `playSend` resolves at ~110ms (middle of the 220ms animation), so
     `sendItemToList` fires while the row is still in the air. Feels
     instant. Direction rule per user spec: hot list ranks highest;
     otherwise by `sortOrder`. The helper takes a minimal
     `{ sortOrder, kind?, isHot? }` shape so it doesn't pin you to the
     full `List` type.

  3. **Receipt pulse + auto-scroll — generic `'item-arrived'` event.**
     User asked this be coded so future flows (drag-between-lists, bulk
     ops, right-click "Send to List") inherit the behavior automatically.
     Proposed shape:

         // From wherever an item lands in a list (sendItemToList,
         // future drag-between-lists, etc.):
         broadcastItemArrived({
           itemId,
           fromListId,
           toListId,
           direction: getSendDirection(fromList, toList) // 'left' | 'right'
         })

     Any open ListWindow whose active list === toListId responds:
       - `playReceipt(windowRootEl, payload.direction)` (already in
         the hook file)
       - Auto-scroll the new item into view (uses the same scroll
         mechanic the BACKLOG entry "Auto-scroll to new item added via
         entry form" describes — these can ship together).

     The existing right-click "Send to List" flow should also fire this
     event, retroactively gaining the pulse.

  4. **Dim-others — pull-back ready.** The `.list-carrying` selector
     dims non-carried siblings to opacity 0.5 (multiplicative on top of
     status opacity). User flagged this as "we may not need it." If the
     live test reads as too much, deleting the single `.list-carrying
     [data-flip-id]:not(.item-row-carrying)` block in `globals.css`
     reverts cleanly without touching the lifted-row treatment.

Visual values (lift scale, send distance, pulse intensity) are tunable
via CSS variables under `:root` in `globals.css` — search for
`--carry-` to find them. They're best-guess until carry mode is wired
up live; expect a polish PR after features lands the mechanism.
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
