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

### One worktree per lane — non-negotiable

Every lane session runs in its **own git worktree**, never in the shared
main checkout, never in another lane's worktree. This is the load-bearing
rule that makes parallel work safe.

**Set up (once, at session start):** from the main checkout:

```
git worktree add ../vimyasa-<lane-or-topic> <branch-name>
cd ../vimyasa-<lane-or-topic>
```

**Cleanup (after your branch merges):**

```
git worktree remove ../vimyasa-<lane-or-topic>
```

Symptoms of sharing a checkout with another session (real incident,
2026-07-15): one session's `git add -A` sweeps the other session's
uncommitted files into its commit, then a `git reset` on the collector's
side wipes the collided files from the collector's tree — silently. The
collided-into session loses its working tree unless it caught the state
mid-collision.

If you find yourself in the shared main checkout with another session
active, **stop before staging anything**, create a new worktree at
`../vimyasa-<lane-or-topic>`, move your work there via `git stash` +
apply, and continue from the isolated worktree. Report to coordination.

### Stage explicit paths, never `git add -A`

Even inside your isolated worktree, prefer `git add <specific paths>` or
`git add -p` over `git add -A` / `git add .`. This protects against:
- Untracked helper files accidentally landing in a commit
- Cross-lane files if the worktree rule is ever violated
- Secrets/credentials in files you didn't mean to include

`git add -A` is a habit worth breaking regardless of worktree hygiene.

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

### Audit fixes — who applies them

`package.json` and `package-lock.json` aren't in any lane's primary
ownership column above. When an audit (npm audit, security scan,
dependency check) recommends a fix, ownership of *applying* the fix
is determined by **size of the change**:

- **Trivial fixes — coordination applies.** Defined as: `npm audit fix`
  with no `--force`, no API surface change, no version pin, just
  letting the resolver bump transitive deps within existing semver
  ranges. Coordination has the audit context and the change is
  mechanically safe. Coordination still runs `npm run build` to verify
  nothing broke.
- **Non-trivial fixes — features applies, with coordination handing
  off.** Defined as: anything requiring `--force`, a major version bump,
  a code change to accommodate a breaking API, a version pin, or a
  multi-step upgrade plan. Coordination writes the assessment + plan;
  features executes + verifies + tests beyond just `npm run build`.

The split exists so coordination's "docs-only" purity isn't broken by
mechanical follow-ups, while features doesn't get nickel-and-dimed by
trivial dep bumps that have no real engineering content.

If the size is genuinely unclear, default to features — when in doubt,
the lane that owns build verification owns the change.

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

## Release cycle

Vimyasa ships to friends-and-family via auto-updating GitHub Releases.
Notarization is slow (~5–10 min) and re-doing it is expensive, so the
release cycle prioritizes catching issues **before** dist:mac.

### Canonical sequence

1. **Merge content PRs** to main.
2. **Merge release-prep PR** (version bump, CHANGELOG entry, BACKLOG
   sweep of items shipped in this version).
3. **Pull main locally. Run `npm run dev`. Verify NEW behavior
   behaviorally.** — the golden path plus edge cases for what
   changed this release. If issues found, fix on a follow-up
   branch, merge, GOTO 3.
4. **Verify the auto-update path from the previous shipped version
   to the draft.** — *added 2026-07-16 after v0.1.7's broken updater
   went undetected through both v0.1.8 and v0.1.9 ship cycles.* See
   next section.
5. **Run `dist:mac`**. Builds, signs, notarizes, uploads draft to
   GitHub Releases.
6. **Verify the GitHub draft** looks right (correct version, both
   `.dmg` and `.zip` artifacts attached, correct icon, latest-mac.yml
   present).
7. **Edit release notes on GitHub** — this is what the update prompt
   renders as markdown to testers.
8. **Publish.**

### Step 4: auto-update path verification

**Why this step exists:** the release cycle from steps 1–3 verifies
the NEW version's behavior in a **freshly built dev environment**.
It does NOT verify that a real installed copy of the currently-shipped
version can actually receive + install the new version. That gap
existed silently until v0.1.7 shipped with a broken auto-updater and
neither v0.1.8 nor v0.1.9 caught it — both shipped "clean" while every
v0.1.7 tester was stuck on their broken updater.

**What to run:**

- On a machine with the **currently-shipped version installed** (the
  live one from the last publish — Justin's machine works if he's
  been on it), install the new draft `.dmg` via the actual
  auto-update flow: quit + reopen the app, wait for auto-check, click
  through Install & Restart, confirm the app comes back on the new
  version.
- If the auto-update path breaks, **do not publish**. Draft can be
  discarded and re-uploaded after fixing the pipeline; publishing a
  broken update chain compounds the problem across every tester.

**When you can't reasonably test the upgrade path:**

- If the current shipped version is known broken for auto-update (like
  v0.1.7 was), the new draft can still ship — but flag in release notes
  that manual reinstall is required from that version, and directly
  message affected testers with the download link.
- If you don't have a machine on the live version, ask the user to run
  the auto-update install path themselves before publishing.

### Notarization + Apple agreements

Notarization can 403 with "required agreement is missing or has expired"
even after a recent successful notarization. Apple ships new legal
agreement revisions periodically and requires the Account Holder to
sign them before submissions go through.

**When notarize returns 403 for an agreement:**
1. Check https://developer.apple.com/account — accept any pending
   agreement banner.
2. Check https://appstoreconnect.apple.com → Business →
   Agreements — accept any pending item there too (App Store Connect
   has separate agreements from developer.apple.com).
3. Only Account Holder can accept some; if signed-in user isn't the
   Account Holder, the acceptance option won't appear.
4. Wait ~2 min for propagation, then re-run `npm run dist:mac`.

### macOS 26 auto-update trap (root-caused 2026-07-24)

**Every version v0.1.7 → v0.1.10 shipped with a silent auto-update
failure on macOS 26.** Users click Install & Restart → app quits →
never comes back. Root cause: `autoUpdater.quitAndInstall()`
relies on Squirrel.framework to spawn the `ShipIt` helper as a
detached child; on macOS 26 that spawn silently fails.

Step 4 above should catch this — but only if you actually run it
on macOS 26. Step 4 was formally codified after v0.1.7 shipped
and STILL wasn't exercised for v0.1.8/v0.1.9/v0.1.10. Don't skip.

**When step 4's auto-update attempt fails silently on macOS 26:**

The disambiguating diagnostic is manually invoking ShipIt from
Terminal. If manual invocation succeeds, the bug is in Squirrel's
spawn (fixable per the v0.1.11 direct-spawn pattern). If manual
invocation also fails, the bug is elsewhere.

Reproduce the failure fresh, THEN run:

```
/Applications/Vimyasa.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt \
  com.taesongkim.vimyasa.ShipIt \
  ~/Library/Caches/com.taesongkim.vimyasa.ShipIt/ShipItState.plist
```

This is safe to run manually — ShipIt just does the file swap and
relaunches the app. If it works, the install completes exactly as
if auto-update had worked, and the user is on the new version.

**The v0.1.11+ fix** (once shipped) is a direct `child_process.spawn`
of ShipIt from `src/main/updater.ts`'s `update:restart` handler,
bypassing Squirrel.framework's broken spawn. See BACKLOG entry
"v0.1.11 hotfix — replace `quitAndInstall()` with direct ShipIt
spawn" for the exact code pattern.

**Testers stuck on ≤v0.1.10 need direct outreach + manual DMG
install** — the broken code is what they're running, so they can't
receive the fix via auto-update. This outreach is a coordination
action for every release cycle until v0.1.11 has propagated.

## Session rituals: clocking in and clocking out

Two phrases mark the start and end of a focused work session with the
human. Coordination performs the rituals. Other lanes don't trigger
them but should recognize the phrases as coordination-bound if they
ever surface in a non-coordination session.

### Phrases

- `clocking in` — start of a work session
- `clocking out` — end of a work session

**Variations are expected.** "Good morning, let's get started." or
"Alright, that's a wrap for today." Anything that smells like a
session boundary but isn't the canonical phrase: **ask before
performing the ritual.** Example response shape: *"Reading that as a
clock-in — confirm?"* One-line confirmation, then proceed.

### Forgotten-ritual handling

Three cases. Be helpful, not pedantic.

1. **Human jumps into work without clocking in.** Do the work. At the
   end of your first response, add a soft prompt: *"(No clock-in
   today — want me to do the snapshot before we continue? Takes 20
   seconds.)"* They opt in or ignore.
2. **Human winds down without clocking out.** If they say something
   like "okay I'm done," "good for today," or go quiet after a long
   active stretch, ask: *"Should I clock you out before you go?"*
3. **Human returns after a long gap (multiple hours / days) and there
   was no prior clock-out.** Ask: *"Last session didn't end with a
   clock-out — did one of your last few prompts mean to be one? I can
   back-fill a wrap from where we left off, then clock you back in."*
   If they confirm a back-fill: do the wrap based on what was
   discussed at the end of the prior session, then proceed with a
   fresh clock-in.

### Clocking in — the ritual

**Format:** structured snapshot at top, free-form commentary below.

**Snapshot fields** (consistent ordering, easy to scan):

- **Last session:** time elapsed (or "fresh today" if no prior session detectable)
- **Main:** current commit short SHA + title
- **Open PRs:** mine and other lanes', with one-line summaries
- **INBOX:** any open entries
- **Active version:** which v0.1.x is the current target, what's in-flight where

**Commentary:** anything urgent, recommended focus, anything surprising
or worth flagging in the snapshot. End with one question — usually
*"What's today's focus?"* but adapt to context.

**Also:** call `mark_chapter` with a title like `Session — YYYY-MM-DD
morning` so the transcript gets a visual marker.

### Clocking out — the ritual

**Format:** structured summary at top, free-form commentary below.

**Summary fields:**

- **Merged today:** PRs that landed
- **Decisions:** key choices made (design, scope, sequencing)
- **Open threads:** WIP branches, unresolved questions, deferred items
- **Next-up:** concrete first move for next session — friction-free re-entry

**Commentary:** honest read on the session (productive / mostly
triage / shorter than planned), patterns worth noting, anything
surprising.

**Memory pass:** end with *"Anything from today worth a memory entry? I
propose, you confirm."* and list 0–3 candidates. Let the human approve
or skip each.

The chapter started by clock-in gets implicitly closed; no separate
chapter call needed at clock-out.

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
