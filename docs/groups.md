# Groups: a stub feature

The schema has a `Group` type and a small CRUD layer for groups, but no UI
exposes them. A single `'Default'` group is auto-seeded on first launch and
every list is attached to it. End users never see the concept.

This doc captures the original intent so the next person to touch this code
(or revive the feature) knows what's there and what to be careful about.

## What's actually built

- `Group { id, name, listIds: string[], sortOrder }` in
  [src/shared/types.ts](../src/shared/types.ts)
- Seed default group + default list in
  [src/main/store.ts](../src/main/store.ts)
- IPC handlers: `createGroup`, `updateGroup`, `deleteGroup` in
  [src/main/ipc.ts](../src/main/ipc.ts)
- Renderer Zustand actions: `addGroup`, `editGroup`, `removeGroup` in
  [src/renderer/src/store/useStore.ts](../src/renderer/src/store/useStore.ts)
- Tray rendering branches on count: `if (groups.length > 1)` shows section
  headers, else a flat list ([src/main/tray.ts](../src/main/tray.ts))
- Each `List` has `groupId`, and `sortOrder` is computed per-group on
  create (`max + 1` over the lists in the same group)

## What was never built

- No UI in the renderer to create, rename, delete, or reorder groups
- No way for an end user to move a list between groups
- The auto-seeded `'Default'` group is the only group anyone has ever had

## Apparent intent

Folders for lists. A two-level hierarchy — group → list → items — so the
tray could surface sections like `Work` and `Personal` with their lists
nested. Number-key navigation (1–9) presumably stays flat across the
visible order.

## The dual-source-of-truth caveat (read before touching this)

There are **two** ways list ordering is expressed in storage:

1. `List.sortOrder` — a per-list integer, scoped to the list's group
2. `Group.listIds` — an ordered array of list ids on the group

`sortOrder` is the canonical, user-facing ordering as of v0.1.2 (PR #6).
Every display surface — Settings → Lists, the List window's position
number, the tray menu, number-key 1–9, Tab cycling — sorts by
`list.sortOrder`. `Group.listIds` array order is **stale on reorder**:
it's set when a list is created and only filtered when one is deleted.
Drag-reorder in Settings → Lists doesn't touch it.

This is fine **as long as** consumers ignore `Group.listIds` order.
The membership relation it expresses (which list belongs to which
group) is still correct because every `createListInStore` /
`createGroup` / `deleteList` operation keeps it in sync.

If you revive groups as a real feature, choose one:

- **(A)** Make `Group.listIds` order authoritative again, and update
  the drag-reorder handler in `ListsTab.tsx` to write that array
  alongside per-list `sortOrder`. Per-group ordering becomes natural;
  `sortOrder` becomes a secondary index or gets dropped.
- **(B)** Keep `sortOrder` as the source of truth and drop the
  `listIds` array from `Group` entirely. Group membership becomes
  derived (`lists.filter(l => l.groupId === g.id).sort(byOrder)`).
  Less denormalization, fewer places to keep consistent on every
  list mutation.

I'd lean (B) — it removes a footgun without losing functionality. (A)
makes sense if you want each group's list order to be independent of
other groups, in a way that flat `sortOrder` can't express. (Right now
flat works because there's only one group.)

## When to remove this stub

Only when you've decided either:

- **You're shipping groups as a real feature** — at which point this
  doc gets replaced with proper design notes; or
- **You're sure you'll never want folders for lists** — at which point
  the stub gets ripped out: drop the `Group` type, the `groupId` field
  on `List`, the IPC handlers, the seed default. Migration: rebuild
  user data with no groups, every existing list orphaned but otherwise
  unchanged.

The schema cost of leaving it where it is now is essentially zero. The
denormalization is the only ongoing concern, and this doc exists so
that concern doesn't surprise someone who finds `Group.listIds` and
assumes it's authoritative.
