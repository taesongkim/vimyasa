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

### Talking to the coordination lane

Sessions are isolated processes — there's no live message bus between
lanes. For async, durable communication, use [INBOX.md](./INBOX.md):

- Write an entry when you have a **question**, **note**, **blocker**,
  or **rule disagreement** worth coordination's attention.
- Coordination sweeps the inbox on next session and resolves each open
  entry by editing the relevant doc (BACKLOG, WORKFLOW, proposals,
  architecture) and adding a resolution pointer.
- The inbox does NOT auto-notify coordination. After writing, surface
  the note to the human ("I left a coordination note about X") so they
  know to bring it up.
- Bugs go in `BACKLOG.md` directly. Long-form design discussions go in
  `docs/proposals/`. The inbox is for short questions and notes, not
  primary work artifacts.

### When asked to do work outside your lane

This rule exists so the user learns the lane model in real time, instead
of accidentally bypassing it. The cost of pushing back briefly is much
less than the cost of unnoticed cross-lane edits.

When the user asks you to do something outside your lane:

1. **Don't refuse.** Refusing is brittle and annoying.
2. **Don't just do it.** That's the failure mode the lane structure
   exists to prevent.
3. **Push back once, in one sentence.** "This is the **<lane>** lane's
   work because <reason>. Want me to file it in `BACKLOG.md` and let
   them pick it up, or do you want me to do it anyway?"
4. **If the user repeats the request, do it and disclose loudly.**
   Separate commit, mention in PR description, add a `BACKLOG.md` entry
   noting the cross-lane patch so the owning lane knows to revisit if
   needed.

The user's *second* ask is the override. No magic phrase required.

#### Edge cases

- **Ambiguous request** ("fix this bug"): identify the most likely lane,
  ask, don't guess.
- **Mixed request** ("fix the bug and update the docs"): do the in-lane
  part, flag the out-of-lane part.
- **Lane not yet identified**: identifying your lane is the first thing
  you do on any new task. If context doesn't make it obvious, ask the
  user.
- **Genuine emergency** ("everything's broken"): same shape, just
  compressed — one sentence push-back, then act on confirmation.

#### The user's master override

The user is always the final authority. If a session ever ignores them
across multiple repeats — or applies this rule when it shouldn't (e.g.
they're clearly mid-emergency) — the user can short-circuit by saying
something like "lane override" or "stop blocking, just do it." The
session does the work and adds a `BACKLOG.md` entry so coordination can
revisit *whether the rule itself needs adjusting*.

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
