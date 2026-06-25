# Proposal: Custom entry-form commands

**Status:** approved on shape; awaiting human sign-off on copy + version slot
**Lane:** features (build); coordination (this proposal)
**Target version:** v0.1.7 or v0.1.8 (TBD with human)
**Author:** coordination lane

## What

User-defined slash commands in the QuickAdd entry form that route the
typed text to a configured markdown file at a configured section,
formatted via a template.

Example: typing `/v need to revisit the prewarm RAF pause` in QuickAdd
and pressing Enter sends the text to a configured file (e.g.
`~/Documents/vimyasa-ideas.md`) under a configured section (e.g.
`## Raw ideas` or `<!-- vimyasa:ideas -->`), formatted as
`- [2026-05-05 09:32] need to revisit the prewarm RAF pause`.

Bypasses the normal "add to list" flow — captured text goes to the
file only, not to a vimyasa list.

## Why

- The QuickAdd entry form is the lowest-friction way to capture text on
  macOS once you have muscle memory for `Cmd+Shift+;`. Locking it to
  vimyasa lists wastes that muscle memory for any text destined
  elsewhere.
- For the dev's own workflow specifically: an "ideas" file becomes raw
  material for coordination to organize into BACKLOG entries / proposals
  / design discussions. Closes the loop between "I had an idea" and "the
  idea is captured somewhere coordination can find it."
- Cross-tool reach: if the target file lives in iCloud / Dropbox / a
  Git repo, ideas captured on this Mac sync everywhere automatically.

## Decisions made (with rationale)

### 1. Command syntax

**Slash prefix:** `/<trigger> <text>`. Slash triggers an autocomplete
popup showing configured commands. Familiar from Slack / Discord /
Linear — type `/`, see options, pick one.

### 2. Target file

**User-chosen via file picker.** Stored as absolute path in settings.
Allows iCloud / Dropbox / arbitrary local paths. No vimyasa-managed
default folder.

### 3. Section identifier (D from v1)

**Smart-detected single field** that accepts either:

- A markdown heading (e.g. `## Raw ideas`) — find by exact match.
- An HTML comment marker (e.g. `<!-- vimyasa:ideas -->`) — find by
  exact match.

Detection logic: if the field starts with `<!--`, treat as marker.
Otherwise treat as heading. Both routes append the formatted text
immediately below the matched line.

If neither is found in the target file, the command **fails with a
clear error** (does not silently append to end of file). Settings UI
shows a warning indicator next to the section field if vimyasa can't
find the section in the target file at config time.

### 4. Format template

Template string with `{{var}}` substitution. v1 supports three
variables:

- `{{text}}` — the user-typed content (required; commands fail without
  text)
- `{{date}}` — `YYYY-MM-DD` (e.g. `2026-05-05`)
- `{{time}}` — `HH:MM` 24-hour (e.g. `09:32`)

For combined date+time, write `{{date}} {{time}}` in the template;
no `{{datetime}}` shortcut.

Default template suggested in Settings UI: `- [{{date}} {{time}}] {{text}}`

### 5. Command replaces the list send

When a command matches, entry-form text goes to the file **only**.
Not added to any list. Not associated with `currentListId`. The
QuickAdd window closes the same way it does after a successful list
add.

### 6. Scope of v1

Multiple commands with full UI in Settings → Commands tab:

- Add / edit / delete commands
- File picker for target
- Section field with smart-detect (heading or marker)
- Template field with variable hints
- Live preview of what gets written

**No commands seeded.** New users see an empty Settings → Commands tab
with an explicit "Set up your first command" CTA. (Tester onboarding
will need a one-line pointer; out of scope for v1.)

### 7. Hotkey

Same hotkey as today (`Cmd+Shift+;` for QuickAdd). Command syntax
differentiates within the form. No new global hotkey.

## Architecture

### Pipeline

```
[QuickAdd entry form]
  user types: /v idea text...
       │
       │ command-match check (renderer)
       │  ┌─────────────────────────────────────┐
       │  │ "/v" matches command                │
       │  │ → autocomplete popup highlights it  │
       │  └─────────────────────────────────────┘
       ▼
[command resolved]
  trigger: "v"
  remainder: "idea text..."
       │
       │ IPC: command:execute { trigger, text }
       ▼
[main process]
       │
       │ load command config
       │ resolve {{text}} {{date}} {{time}} → final string
       │ read target file → find section → splice in text
       │ write target file
       ▼
[file updated]
       │
       │ IPC response: { ok: true } or { ok: false, error: ... }
       ▼
[renderer shows result]
  success → window closes (same as list add)
  error   → inline error message, message preserved
```

### Components

- **`src/main/commands-store.ts`** — persists command configs in
  electron-store under `commands.entries`. CRUD via IPC handlers.
- **`src/main/commands-execute.ts`** — file read / section locate /
  template render / file write. Pure file-system work, runs in main.
- **`src/renderer/src/components/Settings/CommandsTab.tsx`** —
  Settings UI for managing commands.
- **`src/renderer/src/components/QuickAdd/CommandAutocomplete.tsx`** —
  popup that appears when the input starts with `/`.
- **`src/renderer/src/components/QuickAdd/QuickAddFixed.tsx`** —
  modified to detect command syntax, route to IPC instead of list-add.

### IPC contract

- `commands:get-all()` → `Command[]`
- `commands:create({ trigger, targetFile, section, template })` → `Command`
- `commands:update(id, partial)` → `Command`
- `commands:delete(id)` → `{ ok: true }`
- `commands:execute({ trigger, text })` → `{ ok: true } | { ok: false, error: ErrorCode, message: string }`
- `commands:validate-section(targetFile, section)` → `{ found: boolean, headingMatch?: boolean, markerMatch?: boolean }` (used by Settings UI for the live warning)

### Data model

```typescript
interface Command {
  id: string                // UUID
  trigger: string           // "v" — without the leading slash
  label?: string            // optional human name shown in autocomplete
  targetFile: string        // absolute path
  section: string           // either "## Heading text" or "<!-- marker -->"
  template: string          // contains {{text}} {{date}} {{time}}
  createdAt: number
  updatedAt: number
}
```

### Section-locating algorithm

1. Read target file as UTF-8 string.
2. If `section.startsWith('<!--')` → search for the literal marker line.
3. Else → search for the literal heading line (full-line exact match,
   so `## Raw ideas` doesn't match `## Raw ideas (archived)`).
4. If not found → return error.
5. If found → splice the rendered template **immediately after** the
   matched line. If a blank line follows the matched line, splice
   before that blank line (to keep section content tight).
6. Atomic write: write to `<file>.tmp` then rename. Avoids torn
   writes if the user has the file open in another editor.

## User-visible copy candidates

Per the new "copy decisions upstream" memory: every user-visible
string here gets a label. Reply with `B2 → "..."` to override any.

### A. Settings → Commands tab

- **A1** Tab title: `"Commands"`
- **A2** Empty-state heading: `"No commands yet"`
- **A3** Empty-state body: `"Commands route entry-form text to markdown files instead of vimyasa lists. Useful for capturing ideas, todos, or notes into your own docs."`
- **A4** Empty-state CTA: `"Set up your first command"`
- **A5** Add-command button (with existing commands): `"+ Add command"`

### B. Command edit form

- **B1** Trigger field label: `"Trigger"`
- **B2** Trigger field hint: `"What you type after the slash. Letters and numbers only. Example: v"`
- **B3** Target file field label: `"Target file"`
- **B4** Target file picker button: `"Choose file…"`
- **B5** Target file hint: `"The markdown file to append to. Local files only."`
- **B6** Section field label: `"Section"`
- **B7** Section field hint: `"Either a heading (## Raw ideas) or an HTML marker (<!-- vimyasa:ideas -->). Vimyasa appends below this line."`
- **B8** Section warning when not found: `"Section not found in target file"`
- **B9** Template field label: `"Format"`
- **B10** Template field hint: `"Use {{text}} {{date}} {{time}} for substitution."`
- **B11** Template default value: `"- [{{date}} {{time}}] {{text}}"`
- **B12** Live-preview label: `"Preview"`
- **B13** Save button: `"Save"`
- **B14** Delete button: `"Delete command"`
- **B15** Delete confirm: `"Delete this command? You can recreate it later."`

### C. QuickAdd autocomplete popup

- **C1** Popup heading (when `/` is typed and no match yet): `"Commands"`
- **C2** Empty-popup state (no commands configured): `"No commands set up. Settings → Commands."`
- **C3** Popup item format: `"/<trigger> — <label or trigger>"`

### D. QuickAdd error states (after Send)

- **D1** Command not found: `"Unknown command: /<trigger>. See Settings → Commands."`
- **D2** Empty text after command: `"Add some text after /<trigger>."`
- **D3** Target file missing: `"Couldn't find <filename>. Check Settings → Commands → <trigger>."`
- **D4** Section missing in target file: `"Section <section> not found in <filename>."`
- **D5** Permissions denied: `"Vimyasa doesn't have permission to write to <filename>. Open System Settings → Privacy & Security → Files and Folders."`
- **D6** Generic write error: `"Couldn't save to <filename>: <reason>."`

### E. QuickAdd success state

- **E1** Reuse the existing post-send animation; no new copy needed.
  (If you want a separate "saved to <filename>" toast, flag it; not in
  v1 scope by default.)

**Reply with overrides like `A3 → "Slash commands route…"` and `D5 → "..."`** to lock the copy. Anything you don't override ships as written.

## Edge cases

- **Empty text after command** (`/v `): show D2, keep window open with
  text preserved.
- **Trigger with no command configured** (`/xyz` when xyz isn't set):
  show D1.
- **Target file deleted between save and execute:** show D3, file path
  remains in settings (so user can restore the file or fix the path).
- **Section deleted from target file between save and execute:** show
  D4.
- **Multiple commands with same trigger:** Settings UI prevents
  creation. Validation runs on save; offers to overwrite the existing
  command or pick a different trigger.
- **Permissions denied** (macOS sandbox): show D5 with a deep-link to
  System Settings if possible. Falls back to plain text if the deep
  link fails.
- **File locked by another app:** the atomic write should handle this
  cleanly on macOS. If it doesn't, treat as D6.
- **Concurrent writes** (vimyasa writes while user types in target
  file open in another editor): atomic-rename pattern means user sees
  vimyasa's write the moment they save in their editor. They may lose
  unsaved local edits — flag this in settings as a warning the first
  time the user picks a target file that's currently being modified.
  (v2 polish — for v1, just document.)

## Phasing

Three PRs. Each can ship independently.

### PR 1: settings store + Commands tab UI

- New `commands.entries` namespace in electron-store.
- `commands-store.ts` + IPC handlers (`commands:get-all`, `create`,
  `update`, `delete`, `validate-section`).
- Settings → Commands tab with empty-state, list view, and add/edit
  modal or inline form.
- File picker integration via `dialog.showOpenDialog`.
- Live preview of template rendering.

Ships invisibly until PR 2 — no entry-form integration yet. Users
*can* configure commands but commands don't fire.

### PR 2: QuickAdd integration

- `commands:execute` IPC + `commands-execute.ts` (file read / section
  locate / template render / atomic write).
- QuickAdd detects `/` prefix → routes to autocomplete popup.
- Autocomplete popup component.
- On submit: if command matches, fire IPC; else fall through to
  existing list-add flow.
- Error states with the exact copy from section D above.

This is the visible v1 ship.

### PR 3: polish + edge cases

- Settings warning indicator when section can't be located in
  target file.
- Permissions deep-link handling (best-effort macOS-specific).
- First-time-target-file warning when file is open elsewhere.
- Motion / aesthetics consult on autocomplete popup styling.

Optional in v1 — can ship in a later version if PR 2 is sufficient.

## Risks

- **macOS sandbox / Full Disk Access prompts.** First write to a path
  outside the app's sandbox may trigger a system permission prompt.
  Need to handle gracefully and tell the user what happened (D5).
- **Trigger collisions with future built-in commands.** If vimyasa
  ever ships built-in slash commands (e.g. `/help` or `/list`),
  user-configured triggers might collide. Mitigation: reserve a
  prefix range for built-ins, e.g. user triggers must be alphanumeric
  starting with a letter; built-ins start with a special char like
  `?`. Out of scope for v1 — flag.
- **File-format brittleness.** Heading-text matching is sensitive to
  exact formatting. The marker fallback (`<!--vimyasa:ideas-->`)
  helps. v2 might add fuzzy heading match.
- **Discoverability.** With no seeded commands, users don't see the
  feature unless someone tells them. For friends-and-family ship,
  fine. For wider distribution, would want a one-time onboarding
  callout. v2 problem.

## Forward-looking

- **v2 — variable extensions:** `{{name}}` (from feedback senderName),
  `{{listcontext}}` (current open list name), `{{tags:foo,bar}}`
  (insert tag block).
- **v2 — marker auto-insertion:** if section not found, offer to
  insert `<!-- vimyasa:<trigger> -->` at the end of the file.
- **v2 — built-in commands:** `/help`, `/recent`, `/last` for power
  use. Reserved-trigger namespace.
- **v3 — coordination integration:** vimyasa registers the user's
  ideas-file path in coordination memory automatically when they
  configure a command. Coordination can then read the file to
  organize into BACKLOG entries / proposals without the user having
  to point at it each time.

## Coordination integration (the user's specific use case)

When the user configures their first command (whatever trigger they
pick — they said `/v`), they should also tell coordination the file
path so coordination can read it. v3 would automate this (see
forward-looking); for v1, the user mentions it once in chat and
coordination saves it to memory.

Suggested coordination memory entry once the file exists:

> **`project_vimyasa_ideas_file.md`**
> The dev maintains a raw-ideas markdown file at
> `<absolute path>`. New entries arrive via the `/v` slash command in
> QuickAdd. When the dev says "help me organize my ideas," coordination
> reads this file, proposes structure, and routes individual ideas
> into BACKLOG entries / proposals as appropriate. Section to read:
> `<heading or marker>`. Format of entries: `- [date time] text`.

## Version slot — your call

| Slot | Tradeoff |
|---|---|
| **v0.1.7** (replaces Undo) | Custom commands is more user-visible than undo for your specific workflow. Undo gets pushed to v0.1.8. Faster path to your "ideas → file" capture habit. |
| **v0.1.8** (replaces small wins / move-item flow) | Keeps v0.1.7's hot-list-polish + undo bundle clean. Custom commands ships alongside move-item if there's slack. |
| **v0.1.9** (alongside backup + focus cues) | Cleanest standalone slot. Latest realistic ship. |

**My recommendation: v0.1.7, displacing undo.** Undo is genuinely a
P2 nice-to-have; custom commands closes a specific user workflow loop
that compounds. But it's your call — the workflow value of undo
matters more if you're hitting "oh shit I just deleted that" a lot.

## What this proposal does NOT decide

- Final copy strings (waiting on your overrides).
- Version slot (your call from the table above).
- Whether to also support custom commands in the ListWindow's add row,
  not just QuickAdd. v1 specs QuickAdd only; flag if you want both.
- Whether autocomplete popup is mandatory or "nice-to-have." v1
  treats it as mandatory because slash-without-discoverability is
  hostile.

## Next step

Reply with:
1. Copy overrides for any A/B/C/D/E entries you want to change (or
   "ship as written").
2. Version slot pick (or "your call, recommendation is fine").
3. Anything else you want to push back on.

Then I commit the proposal as-is, update BACKLOG with the version
assignment, and hand to features lane when you're ready to dispatch.
