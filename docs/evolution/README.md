# Evolution docs

Cross-version narrative arcs. For "how did we get here?" questions
about long-running systems and patterns within vimyasa.

For per-release notes, see [`../../CHANGELOG.md`](../../CHANGELOG.md).
For current-state architecture, see
[`../architecture/`](../architecture/).

| Arc | Covers |
|---|---|
| [theme-system.md](./theme-system.md) | Theme system from initial vision through Theme 1 (v0.1.4) ship, current pending work, and v0.2.0 Theme 2 plans. |

## Why these exist

State (architecture docs) and per-version notes (changelog) are both
useful but neither tells the *story* of how a system grew. Evolution
docs fill that gap — each one traces one thread of the project
across versions, capturing decisions, gotchas, and what each release
set up for the next.

Originally written to support a future Historian agent that builds a
visual museum of project evolution, but useful to humans regardless.
The dev can read these to remember the why behind decisions; future
contributors can read them to onboard faster than re-deriving from
git log.

## When to add a new evolution doc

When a system or pattern has spanned 2+ versions and is likely to
keep evolving:

- Add a doc tracing it from inception through current state.
- Append to existing docs as new versions land — don't let arcs go
  stale. End each entry with "what this sets up next" so the next
  entry has a clear hook.

Candidates for future evolution docs (not yet written):

- Workflow / lane system (v0.1.5 onward — planning surface, lanes,
  rituals, audit-fix heuristic)
- Window / prewarm pattern (QuickAdd in v0.1.4, hot list in v0.1.6+)
- Cross-project infrastructure (Cloudflare Worker started in v0.1.5;
  may grow into a Historian dashboard backend)
- Keyboard-flow design (number keys for lists, hotkeys, future carry
  mode + custom commands)

Don't add an evolution doc for a system that's only had one version
of work — wait until there's a real arc to trace.
