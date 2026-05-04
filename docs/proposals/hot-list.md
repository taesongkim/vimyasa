# Proposal: Hot List

**Status:** design / awaiting approval
**Lane:** features (with theme + aesthetics consultations)
**Target version:** v0.1.5 or later (NOT v0.2.0)
**Author:** coordination lane

## What

A second always-existing list, distinct from regular numbered lists,
summoned by `Cmd+Shift+H`. Holds keyboard slot **0**. Slides in from the
**right** of the screen (regular lists slide in from the left). Mostly
behaves like a normal list, with future-roadmap divergences (progress
bar, completion-themed visual treatment).

The philosophy: regular lists are long-term storage and processing; the
hot list is daily completion. "Get these done today."

## Why

The current model treats every list the same. Users have no
visual/spatial cue distinguishing "things I might do someday" from
"things I'm doing today." The hot list adds a dedicated surface for
today's commitments, with its own hotkey and screen position so the
user develops muscle memory for "what am I doing right now."

## Feasibility — verified against current code

Grounded in a read of `src/main/windows.ts`, `src/main/shortcuts.ts`,
`src/main/store.ts`, `src/shared/types.ts`,
`src/renderer/src/hooks/useKeyboard.ts`, and
`src/renderer/src/components/ListWindow/ListWindow.tsx`.

### What's already easy

- **`Cmd+Shift+H` is free.** Currently registered global shortcuts:
  `Cmd+Shift+L` (open first list), `Cmd+Shift+;` (quick-add),
  `Cmd+Shift+'` (shortcuts overview). Nothing else built-in conflicts.
- **One-window-per-list architecture already exists.** `windows.ts`
  holds a `Map<listId, BrowserWindow>` (`listWindows`); the hot list
  fits as one more entry keyed by a stable id like `'hot'`.
- **List rendering reuses the same component.** `ListWindow.tsx`
  receives a `listId` and routes via `/list/{listId}`. The hot list
  loads the same component with a special id.

### What needs new code

- **"Always exists" guarantee.** Today's "list 1 always exists" is
  convention, not enforcement: there's no flag on the `List` type and
  `deleteList` will happily remove the last list. The hot list needs a
  real invariant (special-case in `deleteList`, plus a startup
  migration that creates the hot list if missing). This is also a chance
  to harden list-1 if we want — the same mechanism covers both.
- **Number key 0.** `useKeyboard.ts` has `onNumber1` through
  `onNumber9`; there is no `onNumber0`. Adding it is mechanically
  trivial (add the case in the switch, add the prop, wire it). Confirmed
  no shortcut currently uses `0`.
- **Right-side window positioning.** `calculateStackedPosition()` in
  `windows.ts` stacks list windows leftward from `INITIAL_X = 8`. The
  hot list needs its own positioner that anchors to the right edge of
  the workArea: `x = workArea.x + workArea.width - LIST_WINDOW_WIDTH - INITIAL_X`.
- **Mirrored slide animation.** Direction is hardcoded in `ListWindow.tsx`
  as `initial={{ x: -20 }}` → `animate={{ x: 0 }}`. Needs to be
  parameterized so the hot list can slide from `+20` instead. Can be
  driven by a prop derived from `listId === 'hot'`, or — better — a
  query-string param on the route so the renderer doesn't need to know
  the special id.
- **Prewarming (recommended, not required for v1).** The hot list is a
  perfect first-of-kind list to prewarm: only one instance, fixed id,
  hotkey-driven summon. The QuickAdd prewarm pattern
  ([architecture/quickadd-prewarm.md](../architecture/quickadd-prewarm.md))
  applies cleanly. Skipping prewarm for v1 ships a working hot list at
  150–300ms cold; adding prewarm later is a follow-up that doesn't
  reshape the feature.

### Open questions deferred per user

1. **Pressing `0` while a regular list is focused** — slide regular
   list out left, hot list in from right? Or no-op? **Deferred.**
   Recommended v1: no-op (use `Cmd+Shift+H` only). Cross-window
   transitions get their own design pass later.
2. **Pressing `1`–`9` while the hot list is focused** — open regular
   list from left? **Deferred.** Recommended v1: same behavior as
   today (regular list opens at its own position, hot list stays open).
3. **Future hot-list-specific visuals** (progress bar, special theme
   surface) — **deferred.** v1 reuses existing list surfaces; theme
   work happens in a separate PR.

## Implementation options

Three shapes, ranked from most to least conservative.

### Option A: hot list as a special `List` row in the store (recommended)

Add a `kind: 'regular' | 'hot'` field on the `List` type. The hot list
is a real `List` record with `id: 'hot'`, `kind: 'hot'`, seeded on
startup if missing.

**Pros:**
- Reuses 95% of existing list machinery: same store schema, same
  rendering component, same items model, same backup/export, same drag
  reordering (just exclude `kind: 'hot'` from regular sort order).
- Easy to migrate: a one-time startup check ("if no list with `kind:
  'hot'`, create one") handles existing users.
- Future hot-list-specific features (progress bar, etc.) attach to one
  field on the existing record.

**Cons:**
- Need to remember to filter `kind: 'hot'` out of the 1–9
  list-numbering. Easy to forget; a single helper (`getRegularLists()`)
  handles it.
- The "always exists" invariant lives in two places (the seed migration
  and the delete-guard).

**Code shape:**
```
// types.ts
type ListKind = 'regular' | 'hot'
interface List { id; name; kind: ListKind; sortOrder; groupId; ... }

// store.ts seed/migration
ensureHotListExists()  // run on app startup

// ipc.ts deleteList
if (list.kind === 'hot') throw new Error('cannot delete hot list')

// useStore selectors
sortedLists = lists.filter(l => l.kind === 'regular').sort(byOrder)
hotList = lists.find(l => l.kind === 'hot')

// shortcuts.ts
register('CommandOrControl+Shift+H', () => createListWindow('hot', { side: 'right' }))

// windows.ts
calculateHotListPosition(workArea)  // right-edge anchored
createListWindow accepts { side: 'left' | 'right' }, threads to renderer

// ListWindow.tsx
slideDirection = isHotList ? 'right' : 'left'
initial / animate use ±xOffset based on direction
```

### Option B: hot list as its own thing, parallel to lists

A separate top-level entity (`hotList: HotList`) in the store, with its
own type, its own IPC, its own renderer route.

**Pros:**
- Clean separation. Hot-list code never accidentally leaks into regular
  list code.
- Future hot-list-only features have nowhere else to go.

**Cons:**
- Duplicates a lot of machinery: items, rendering, persistence, backup,
  reordering, drag-and-drop, focus handling.
- If hot-list semantics drift from regular-list semantics (which they
  will), the duplication ratchets up.
- Backup/export needs to handle two top-level shapes.

**When this becomes the right answer:** if the hot list ends up with
fundamentally different item types (e.g. timed items, recurring items,
items with completion percentages) that don't fit the regular `Item`
schema. v1 doesn't justify it.

### Option C: hot list as a virtual view (no new persistence)

The hot list isn't stored; it's computed from items across all lists
that have a `hotToday: true` flag. Summoning the hot list shows
those items.

**Pros:**
- No new storage at all.
- "Move item to hot list" becomes a flag toggle, not a list move.

**Cons:**
- Doesn't match the user's stated philosophy ("a list with its own
  identity, holds 0, opposite-side animation"). The mental model is a
  list, not a filter.
- Adding/editing items in the hot-list view is ambiguous (which list
  does the new item go into? what happens when the flag is removed?).
- Future hot-list-only visual treatments have nothing to attach to.

## Recommendation

**Option A.** It matches the user's mental model (a real list), reuses
the most code, and leaves room to grow into hot-list-only features
without reshape.

## Phasing

If approved, suggested order (each can be a separate PR):

1. **PR 1: schema + seed.** Add `kind` field, migration, delete guard,
   hot-list selectors. No UI yet. Ships invisibly to users.
2. **PR 2: shortcut + window positioning.** Wire `Cmd+Shift+H`,
   right-anchored window placement, mirrored slide animation. Hot list
   now exists and is summonable. Number-0 not yet wired.
3. **PR 3: number 0 wiring.** `0` from inside any list switches to
   the hot list. Finalizes the v1 keyboard model.
4. **PR 4 (optional): prewarm.** Apply the QuickAdd prewarm pattern to
   the hot list (only). Reduces summon latency from 150–300ms to ~10ms.
5. **PR 5+ (future):** progress bar, hot-list-only theme surfaces,
   cross-window transitions for the deferred questions above.

## Risks

- **Backup/export.** If a backup feature ships before PR 1, the hot
  list needs to be included from PR 1 onwards. Coordinate with
  whichever lane owns backup.
- **Onboarding tour.** May need an extra step explaining the hot list.
  Aesthetics lane.
- **Theme migrations.** If a future migration assumes "all lists with
  this id pattern" or similar, the hot list's stable `'hot'` id might
  surprise it. Worth a `kind`-aware check in any migration that
  iterates lists.
- **Settings → Lists.** Probably should hide or distinctly mark the
  hot list (or make it non-deletable + non-renameable in that UI).

## What this proposal does NOT decide

- Whether `0` should be reachable from outside any list window (e.g.
  global hotkey only? In-list-only? Both?). Picked: both —
  `Cmd+Shift+H` global, `0` in-list. Confirm.
- Whether the hot list should appear in the tray menu. Recommendation:
  yes, with a visual distinction (badge or section header).
- The exact name surfaced to users. "Hot list" is the working name; if
  the user prefers "Today" or "Now" or anything else, that's a one-line
  change.

## Next step

Human approval (or modifications) on **Option A + the phasing above**.
Then features lane picks up PR 1.
