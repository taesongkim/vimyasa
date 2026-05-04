# Workflow: parallel Claude Code sessions

Vimyasa development uses up to three concurrent Claude Code sessions, each
in its own git worktree. This doc defines the lanes, who owns what, and the
rules that keep parallel work from stomping on itself.

If you're a session reading this on startup: identify your lane, then read
[BACKLOG.md](./BACKLOG.md) for current priorities.

## The three lanes

| Lane | Owns (writes) | Reads | Runs dev? |
|---|---|---|---|
| **features** | `src/main/`, IPC handlers, persistence, keyboard system, list/window logic | everything | yes (default) |
| **aesthetics** | motion timings, layout, spacing, copy, micro-interactions | shared constants, theme outputs | only if needed |
| **themes** | `src/shared/themes.ts`, `src/main/themes-store.ts`, surface mounts, `MAGIC_COLORS_*` constants, `GlowSurface.tsx` | shared constants | only if needed |
| **coordination** (this lane) | `docs/`, `.claude/`, memory, ADRs, audits, BACKLOG | everything | **never** |

The fourth "coordination" lane is the human-CTO/strategy seat. It does not
edit `src/`. It triages, plans, audits, and writes docs.

## The rules

### One dev server at a time

Vimyasa registers global shortcuts and a tray icon at startup. Two
instances running in parallel produces:
- Brief unrecognized window-shapes near QuickAdd on summon
  (see [parallel-instance flicker](./architecture/parallel-instance-flicker.md))
- Conflicting tray icons
- Cross-process `electron-store` writes that may race

**Rule:** before running `npm run dev` in your worktree, confirm no other
session has it running. Check with `ps aux | grep -iE "electron|vimyasa" | grep -v grep`.
If you see another instance, coordinate with the human before killing it
— they may be deliberately running parallel iterations.

If you only need to type-check or lint, run those without `dev`.

### Don't touch other lanes' files

The ownership table above is enforced socially, not mechanically. If you
need to edit a file outside your lane:

1. Stop and surface it to the human.
2. They decide whether to (a) hand it to the right lane, (b) explicitly
   authorize you to edit it this once, or (c) reshape the work so you
   don't need to.

Edits that span lanes (e.g. a feature that needs a new theme surface)
should usually be **one lane builds the surface, the other lane consumes
it** in two PRs, not one mixed PR.

### Memory writes need care

All sessions share `~/.claude/projects/-Users-taesongkim-DevProjects2-vimyasa/memory/`.
Three sessions writing simultaneously will produce duplicate or
conflicting entries.

- Prefer **updating** an existing memory file over creating a new one.
- Use unique, scoped names: `project_<lane>_<topic>.md`, not just `project_<topic>.md`.
- The coordination lane periodically runs the memory-consolidation skill
  to dedupe.

### Branch and commit etiquette

(See user memory `feedback_branch_and_commit_style.md` for the canonical
version.)

- Descriptive branch names, no prefix (`hot-list`, not `feat/hot-list`).
- Imperative-mood commits.
- Squash-merge each PR; delete branch on merge.
- Push promptly so the other lanes can see what's in flight.

### Cross-lane awareness

The coordination lane keeps [BACKLOG.md](./BACKLOG.md) up to date. Each
feature lane should:

- Read `BACKLOG.md` at session start to know what other lanes are working
  on.
- Mark items in `BACKLOG.md` as `in-flight` when starting (not when
  finishing), so other lanes don't pick up the same item.
- Add follow-ups discovered mid-task to `BACKLOG.md` rather than memory.

## Why this shape

Vimyasa is a solo-dev pre-1.0 project. The lanes exist to:

1. **Protect main context** — themes work doesn't bloat features context.
2. **Enable parallelism** — the human can dispatch three things at once.
3. **Match the user's mental model** — features / aesthetics / themes is
   how the human thinks about the app.

The coordination lane exists because three parallel feature-builders with
no shared planning surface produce drift, duplicate work, and conflicting
PRs. Cheap to maintain, expensive to skip.

## When to revisit this

- More than three lanes feels needed (probably means a lane is too broad
  — split it instead of adding a fourth).
- A lane consistently violates ownership (the table is wrong; redraw it).
- The coordination lane becomes a bottleneck (it shouldn't — most of its
  work is async docs).
