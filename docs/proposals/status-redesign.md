# Status redesign — 5-state lifecycle

**Version target:** v0.1.10
**Lanes:** features (schema + migration + IPC + keyboard cycle), themes (dot colors + text dimness), aesthetics (strikethrough treatment + pulse motion + filter-bar visual)
**Status:** proposal — Justin drafting, iterating with coordination

Retires the two older BACKLOG entries:
- *Status redesign — colors, labels, customization*
- *New Done style + 4th status: Deprioritized*

---

## Summary

Vimyasa's current status system has 3 states — `active` / `hold` / `done` — cycling via the space bar. `active` conflates "haven't started yet" and "actively working on this" into a single state; `hold` and `done` don't clearly distinguish "paused, coming back" from "not doing this" from "finished." The redesign splits these into 5 states with distinct visual weight so users can encode more about how they're relating to an item.

**Ethos preserved:** completion is *quiet*, not celebratory. Green stays reserved for the *active-work* moment (the strong signal). Orange marks completion (a settled, closed state — attention should be elsewhere). Progressively-dimmer text encodes progressively-lower attention priority.

---

## The 5 states

Order = space-bar cycle order (default → active → pending → complete → hidden → default).

### 1. `default`
- **Meaning:** item exists, hasn't been started yet. The null / just-captured state.
- **Text:** normal (same as today's `active`).
- **Dot:** gray, solid.

### 2. `active`
- **Meaning:** actively being worked on. The strong signal.
- **Text:** normal (same as today's `active`).
- **Dot:** green, solid (same as today's `active`).

### 3. `pending`
- **Meaning:** paused, blocked, waiting on something. Comes back later.
- **Text:** dimmed (same as today's `hold`).
- **Dot:** yellow, **pulsing** (opacity only). Rhythm 1.5–2s cycle. Pulse pauses when the window is hidden (RAF pattern from existing particle system).

### 4. `complete`
- **Meaning:** done. Closed. Attention should be elsewhere.
- **Text:** dimmed (same as today's `hold`), with **strikethrough**.
- **Dot:** orange, solid.
- **Note:** deliberately *not* green — completion is the quiet state, active work is the loud state.

### 5. `hidden`
- **Meaning:** dismissed / not doing / doesn't need any attention.
- **Text:** very dim (same as today's `done`).
- **Dot:** **not shown at all.** The row exists as text-only, without a status affordance.

---

## Space-bar cycle

Same key as today. Cycle order:

`default → active → pending → complete → hidden → default → …`

Reads as a natural lifecycle: haven't started → started → blocked → finished → dismissed → new. All 5 states reachable through space; no dedicated keys for individual states.

*(Open: should any state be "one-way" — reachable via space but not exited via space? Justin's call. Default assumption: all cycle equally.)*

---

## Migration from today's 3 statuses

Two decisions with real user-visible impact. **Marked as OPEN — Justin to lock in.**

### Current `active` → ?
- **Option A: → `default`.** Assumes users haven't distinguished started-vs-unstarted in their heads. Everything on their list becomes null-state. Users then use space to promote items to `active` as they start working.
- **Option B: → `active`.** Assumes "everything on my list is stuff I'm working on." Preserves the current mental model but wastes the new `default` state as null.

*Justin's preference: [TBD]*

### Current `done` → ?
- **Option A: → `complete`.** Existing done items *become brighter* (from very-dim to dimmed) and gain strikethrough + orange dot. Visible celebration/history of completion.
- **Option B: → `hidden`.** Existing done items stay very-dim, lose their remaining dot. Continues to fade from attention.
- **Ethos check:** today's Enter/A moves items toward not-taking-attention (archive flow). If daily usage is "I finish it, I don't want to see it," Option B matches habit. If it's "I want a record of what I closed," Option A gives visible history.

*Justin's preference: [TBD]*

### Current `hold` → `pending`

Straightforward. Text dimness matches, semantics match. Default unless overridden.

*Justin's preference: [confirmed unless overridden]*

---

## Filter bar

Currently the filter bar has chips for `active` / `hold` / `done`. New bar needs to account for 5 states. Two shapes to consider:

- **5-chip bar:** one chip per new state. Consistent, but takes more horizontal room.
- **Grouped bar:** e.g. work-states (default + active), waiting (pending), closed (complete + hidden). Fewer chips, but muddles precise filtering.

*Justin's preference: [TBD — aesthetics-consult territory]*

**Default-visibility question:** are `hidden` items shown in the main list view by default (very-dim, no dot), or filtered out unless the user toggles "show hidden"? Today's `done` items get archived out; is `hidden` the same behavior or a different one?

*Justin's preference: [TBD]*

---

## Pulse spec (`pending` state)

- **Property:** opacity only. Not scale, not position, not glow. Keeps CPU cheap and visual language calm.
- **Rhythm:** 1.5–2s cycle (linear or sine — aesthetics decides feel).
- **Envelope:** opacity range TBD by aesthetics (~0.4 to 1.0 is a reasonable starting point; final call theirs).
- **Lifecycle:** RAF-based, pauses when window hidden (existing pattern from particle system in Magic Colors). Also pauses when window not focused (optional — aesthetics/features decide).

*Aesthetics has the final feel call on rhythm curve + opacity range. This spec fixes the axis (opacity only) and the tempo range.*

---

## Cross-cutting affordances to preserve

None of these should change semantically with the redesign:

- **Undo (⌘Z):** status changes are already undoable via the main-process undo log; new status values slot in transparently as generic string values (v0.1.8 encoded status old-values as strings for exactly this reason).
- **Carry mode:** picking up + moving an item preserves its current status.
- **Right-click Send:** status unchanged on move.
- **Auto-scroll to arriving items:** unchanged.
- **Search / filter within a list:** should still work across all 5 statuses.

---

## Schema migration

Data model change: `type ItemStatus = 'active' | 'done' | 'hold'` becomes `type ItemStatus = 'default' | 'active' | 'pending' | 'complete' | 'hidden'`.

- Bump `CURRENT_SCHEMA_VERSION` (current is v9).
- Migration function walks every `Item` and remaps its status per the migration decisions above.
- One-shot, idempotent.
- No user data loss — items keep everything else (id, text, listId, sortOrder, timestamps, comments).

Backup safety: this is exactly the kind of migration where the Backup / Restore work (v0.1.10 priority) would ideally ship *before* — users could export before migrating. Sequencing consideration for v0.1.10.

---

## Open questions summary

Rolled up for quick Justin-review:

1. Migration: current `active` → `default` or `active`?
2. Migration: current `done` → `complete` or `hidden`?
3. Filter-bar shape: 5 chips vs grouped?
4. `hidden` visible by default in main list, or filtered out?
5. Pulse rhythm curve + exact opacity range (aesthetics call, but Justin should sign off on the feel)
6. Sequencing: does status redesign ship before, after, or bundled with backup/restore in v0.1.10?

---

## Version scoping notes

Targeted at **v0.1.10** per Justin's 2026-07-16 clock-in. Alongside items in v0.1.10:

- Backup / restore user data (P1)
- Focus-state visual cue (P2)
- Mystery flicker on first entry-form launch (P2)
- Onboarding dim z-order (P3)
- Scrollbar tracking lag (P3)
- Auto-updater EPIPE defensive wrap (P3)
- Auto-update integrity audit + v0.1.7-updater diagnosis (coordination + features)
- Release-cycle step 4 exercised for real (procedural — first live use)

**Scope-check:** v0.1.10 is now denser than a typical release. Status redesign is the biggest new thing; backup/restore is P1 shipping; flicker hunt is unknown scope. Coordination may want to defer some of the P3s to v0.1.11 or split v0.1.10 into two releases.

---

## Once locked

When Justin's answered the open questions:
- Coordination writes the dispatch prompts for features (schema + IPC + cycle wiring), themes (dot colors + text dimness taxonomy), and aesthetics (strikethrough + pulse motion + filter bar).
- Full 3-lane build.
- Justin re-verifies the golden path + edge cases (all 5 states, cycle order, migration from a real v0.1.9 install, filter bar behavior, pulse feel).
- Then release cycle → dist:mac → publish.
