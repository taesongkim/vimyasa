# Status redesign — 5-state lifecycle

**Version target:** v0.1.10
**Lanes:** features (schema + migration + IPC + keyboard cycle), themes (dot colors + text dimness), aesthetics (strikethrough + pending pulse/glow)
**Status:** approved for implementation — decisions locked 2026-07-23

---

## Summary

Replace the current `active` / `hold` / `done` cycle with a five-state lifecycle:

`default → active → pending → complete → hidden → default`

The redesign separates capture, current work, waiting, completion, and dismissal. Attention recedes as an item moves through the lifecycle: normal text for capture/work, dimmed text for waiting/completion, and very dim text for hidden items.

Completion remains quiet through its dimmed, struck-through text. Solid yellow means work is in progress; solid green means completion is settled.

## State contract and visual treatment

| State | Meaning | Text | Dot | Motion |
| --- | --- | --- | --- | --- |
| `default` | Captured; not started | Normal | Solid gray | None |
| `active` | Actively being worked on | Normal | Solid yellow | None |
| `pending` | Paused, blocked, or waiting | Dimmed | Yellow | 1.5s opacity + subtle glow pulse |
| `complete` | Finished; attention belongs elsewhere | Dimmed + strikethrough | Solid green | None |
| `hidden` | Dismissed / not doing / needs no attention | Very dim | Transparent dot retained for layout | None |

### Pending pulse

- Animate opacity and glow only. Do not use scale, travel, or bounce.
- Use a 1.5s rhythm that starts at 1.0 opacity, breathes down to 0.4, then returns to 1.0. Entering Pending from solid Active therefore has no opacity jump.
- Drive it with the existing RAF-style visibility lifecycle: pause only while the window is hidden, not when a visible window loses focus.
- Respect reduced motion by retaining a stable visible state without the loop.

## Interaction rules

- Space remains the only status-cycle key.
- All five states cycle equally; none is terminal or one-way.
- Status changes remain undoable.
- Carry mode and any move-to-list action preserve the current status.
- User-facing names are exactly **Default, Active, Pending, Complete, Hidden**.
- Every committed status change reuses the existing short row-confirmation overlay: **`Status Updated To: [Status]`**. It appears for Space, status-dot click, context-menu selection, Undo, and Redo.

## Migration

One-shot, idempotent migration after the `ItemStatus` type changes from
`'active' | 'hold' | 'done'` to
`'default' | 'active' | 'pending' | 'complete' | 'hidden'`.

| Existing value | New value |
| --- | --- |
| `active` | `default` |
| `hold` | `pending` |
| `done` | `complete` |

Items retain their ids, text, list ids, sort order, timestamps, comments, archive state, and all other data. The migration requires a deliberate real-data verification pass before release. Backup / Restore remains a v0.1.10 P1 follow-on; it does not block this approved scope.

## Filter posture

Hide the list-status filter for now and remove every activation route so users cannot enter a filtered view accidentally. Hidden items remain in the ordinary list view by default, rendered very dim with a transparent dot that preserves the row's layout.

This does not remove the underlying status values or prevent a future filter redesign; it deliberately keeps status as context rather than a separate navigation surface for this release.

## Acceptance checks

- Existing v0.1.9 data migrates to the mapped values exactly once.
- Space cycles the full order and Undo/Redo restores every transition.
- Old `hold` / `done` labels and status-specific shortcut descriptions are removed or updated.
- The status filter is absent and cannot be activated through keyboard or pointer input.
- Pending pulse remains visible while an unfocused window is visible, pauses when hidden, and disables its loop under reduced motion.
- Each state reads correctly in light, dark, and Auto appearance.
- No carry, move, archive, or item-arrival behavior changes status unintentionally.
