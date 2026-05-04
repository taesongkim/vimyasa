# Popular shortcuts (target demographic)

A reference of keyboard shortcuts used by apps that vimyasa's testers
are likely to be running. **Check this list before picking a new global
hotkey** so vimyasa doesn't fight with apps that already have muscle
memory in our users.

## Scope and posture

- **Focus:** macOS, since vimyasa is mac-only.
- **Focus:** the `Cmd+Shift+<letter>` and `Cmd+Shift+<symbol>` ranges,
  since that's vimyasa's hotkey namespace.
- **Not exhaustive.** This is a hand-curated list of *known
  high-friction conflicts*, not every binding in every app. The
  intent is "quick lookup before picking a new hotkey," not an audit
  surface.
- **Decay risk:** apps change shortcuts. Treat any entry older than
  ~6 months as needing verification before relying on it for a new
  vimyasa hotkey decision. Use [How to verify](#how-to-verify) below.
- **Last verified:** 2026-05-04 (initial seed).

## vimyasa's currently-registered global hotkeys

For internal cross-reference. Update this when you add or change
vimyasa shortcuts.

| Hotkey | Action |
|---|---|
| `Cmd+Shift+L` | open first list |
| `Cmd+Shift+;` | quick-add to first list |
| `Cmd+Shift+'` | shortcuts overview window |
| `Cmd+Shift+H` | hot list (planned, v0.1.6) |
| `Cmd+Shift+\` | feedback messenger (planned, v0.1.5) |

User-defined per-list shortcuts (set in Settings → Shortcuts) layer on
top of these.

---

## macOS system shortcuts

These are owned by the OS. Avoid binding any vimyasa hotkey on top of
them — even if vimyasa wins the registration, system behavior gets
unpredictable.

| Hotkey | What it does |
|---|---|
| `Cmd+Space` | Spotlight (or Alfred / Raycast if installed) |
| `Cmd+Shift+3` | full-screen screenshot to file |
| `Cmd+Shift+4` | region screenshot to file |
| `Cmd+Shift+5` | screenshot tool (region / window / video) |
| `Cmd+Shift+6` | Touch Bar screenshot (older Macs) |
| `Cmd+Ctrl+Q` | lock screen |
| `Cmd+Ctrl+Space` | character viewer / emoji picker |
| `Cmd+Tab` | app switcher |
| `Cmd+Shift+Tab` | reverse app switcher |
| `Cmd+~` | window cycling within current app |
| `Cmd+Shift+.` | toggle hidden files in Finder open dialogs |
| `Cmd+Q` | quit current app |
| `Cmd+H` | hide current app |
| `Cmd+Shift+H` | (Finder-specific: go to home folder; **not global**) |
| `Cmd+M` | minimize window |
| `Cmd+Shift+M` | minimize all windows of current app |

System Settings → Keyboard → Keyboard Shortcuts shows the full
canonical list. Many panes (Mission Control, Spotlight, Input Sources,
Screenshots, Services, App Shortcuts) each have their own.

## Launchers / window managers (intercept globally)

These tools register global hotkeys system-wide and will steal keys
from any app, including vimyasa.

| Tool | Default hotkeys to know |
|---|---|
| **Spotlight** | `Cmd+Space` |
| **Alfred** | `Cmd+Space` (when Spotlight is disabled), `Opt+Cmd+\\` (file action), `Opt+Space` (alt) — heavily user-configured |
| **Raycast** | `Cmd+Space` (default), `Opt+Space` — heavily user-configured |
| **Rectangle / Magnet** | `Ctrl+Opt+<arrows>` for window snapping |
| **iStat Menus** | (mostly menu-bar; user-configured) |

## Browsers

Apps testers spend most of their day in. Cmd+Shift conflicts here are
the most painful because the browser is foreground a lot.

| Hotkey | Chrome / Safari / Arc / Edge |
|---|---|
| `Cmd+Shift+T` | reopen closed tab |
| `Cmd+Shift+N` | new incognito window |
| `Cmd+Shift+W` | close window (close all tabs) |
| `Cmd+Shift+R` | hard reload (bypass cache) |
| `Cmd+Shift+B` | toggle bookmarks bar |
| `Cmd+Shift+D` | bookmark all open tabs |
| `Cmd+Shift+P` | print preview / extension |
| `Cmd+Shift+J` | downloads (Chrome) |
| `Cmd+Shift+I` | DevTools |
| `Cmd+Shift+C` | DevTools element inspector |
| `Cmd+Shift+M` | DevTools device emulation toggle |
| `Cmd+Shift+]` / `[` | next/previous tab |
| `Cmd+Shift+L` | (Safari) bookmark sidebar |

**Arc-specific:**

| Hotkey | What it does |
|---|---|
| `Cmd+T` | new little arc / command bar |
| `Cmd+Shift+C` | copy current URL |
| `Cmd+Shift+L` | toggle sidebar |
| `Cmd+Opt+N` | new space |

## Code editors

| Hotkey | Cursor / VSCode |
|---|---|
| `Cmd+Shift+P` | command palette |
| `Cmd+Shift+F` | find in files |
| `Cmd+Shift+E` | explorer panel |
| `Cmd+Shift+G` | source control panel (or find next match in editor) |
| `Cmd+Shift+D` | run/debug panel |
| `Cmd+Shift+X` | extensions panel |
| `Cmd+Shift+H` | replace in files |
| `Cmd+Shift+L` | select all matches |
| `Cmd+Shift+K` | delete line |
| `Cmd+Shift+M` | problems panel |
| `Cmd+Shift+O` | go to symbol |
| `Cmd+Shift+T` | reopen closed editor |
| `Cmd+Shift+\` | jump to matching bracket |
| `Cmd+Shift+;` | (varies by extension) |

⚠ **`Cmd+Shift+\` is bound in Cursor/VSCode** — but only when those
editors are foreground. Vimyasa's planned `Cmd+Shift+\` is a *global*
hotkey, which wins regardless of foreground app. Only conflict is if
the user is *in* Cursor and presses it — vimyasa intercepts. Acceptable
trade-off for a list-app target demographic; testers in Cursor can
reach jump-to-bracket via the menu.

## Communication apps

| Hotkey | Slack |
|---|---|
| `Cmd+Shift+K` | jump to DMs |
| `Cmd+Shift+T` | threads |
| `Cmd+Shift+A` | all unreads |
| `Cmd+Shift+S` | saved items |
| `Cmd+Shift+M` | mentions & reactions |
| `Cmd+Shift+L` | scroll to latest |
| `Cmd+Shift+\` | mark all as read |
| `Cmd+K` | quick switcher |
| `Cmd+/` | shortcuts list |

⚠ **`Cmd+Shift+\` in Slack** = mark all as read. Same global-vs-local
trade-off as Cursor — vimyasa wins globally.

| Hotkey | Discord |
|---|---|
| `Cmd+K` | quick switcher |
| `Cmd+Shift+T` | toggle markdown |
| `Cmd+Shift+M` | mute mic |
| `Cmd+Shift+D` | deafen |
| `Cmd+Shift+A` | (varies) |
| `Cmd+/` | shortcuts list |

## Productivity / docs

| Hotkey | Notion |
|---|---|
| `Cmd+P` | quick find / open page |
| `Cmd+Shift+P` | recent pages |
| `Cmd+Shift+L` | dark mode toggle |
| `Cmd+Shift+H` | highlight color |
| `Cmd+Shift+M` | comment |
| `Cmd+Shift+N` | new note window |
| `Cmd+Shift+9` | toggle to-do |

| Hotkey | Linear |
|---|---|
| `Cmd+K` | command menu |
| `Cmd+/` | help / shortcuts |
| `Cmd+Shift+I` | inbox |
| `Cmd+Shift+M` | my issues |
| `Cmd+Shift+P` | projects |
| `Cmd+Shift+L` | cycle |

| Hotkey | Figma |
|---|---|
| `Cmd+/` | search menu |
| `Cmd+Shift+P` | jump to page |
| `Cmd+Shift+\` | toggle UI |
| `Cmd+Shift+H` | flip horizontal |
| `Cmd+Shift+E` | export |

⚠ **`Cmd+Shift+\` in Figma** = toggle UI. Designers using Figma will
have this in muscle memory. Same global-vs-local trade-off applies but
this one is more painful for design-heavy testers — flag if a tester
is a Figma power user.

## AI assistants (web + desktop apps)

| Hotkey | Claude.ai web + desktop |
|---|---|
| `Cmd+/` | shortcuts list |
| `Cmd+K` | new conversation |
| `Cmd+Shift+/` | search conversations |
| `Cmd+I` | toggle sidebar |

⚠ **`Cmd+Shift+/`** is search in Claude — that's why we picked
`Cmd+Shift+\` instead for vimyasa feedback.

| Hotkey | ChatGPT web |
|---|---|
| `Cmd+Shift+O` | new chat |
| `Cmd+Shift+;` | copy last response |
| `Cmd+Shift+I` | toggle sidebar |
| `Cmd+/` | shortcuts |

⚠ **`Cmd+Shift+;`** is copy-last-response in ChatGPT. Vimyasa already
binds `Cmd+Shift+;` globally for quick-add — this conflicts when the
user is in ChatGPT. Acceptable for a list-app target demographic, but
worth knowing.

## Terminal apps

| Hotkey | iTerm2 / Terminal.app |
|---|---|
| `Cmd+Shift+D` | split (iTerm) |
| `Cmd+Shift+T` | new tab |
| `Cmd+Shift+H` | hide all (Terminal) |
| `Cmd+Shift+\` | (varies) |

## Mail

| Hotkey | Mail.app / Spark |
|---|---|
| `Cmd+Shift+N` | check for new mail |
| `Cmd+Shift+R` | reply all |
| `Cmd+Shift+A` | attach |
| `Cmd+Shift+M` | move (Spark) |
| `Cmd+Shift+J` | junk (Mail.app) |

---

## How to verify

There is no system-wide API to query "what shortcuts does this app
have." For each candidate hotkey, the manual test:

1. **System level:** open System Settings → Keyboard → Keyboard
   Shortcuts. Click through each pane (Mission Control, Spotlight,
   Input Sources, Screenshots, Services, Spotlight, App Shortcuts,
   Modifier Keys). Ctrl-F doesn't work; you scan visually.
2. **Per-app:** open each app in your target demographic, press the
   candidate hotkey while that app is foreground, see what fires.
3. **Programmatic OS-level test:** writing an Electron one-shot script
   that calls `globalShortcut.register('CommandOrControl+Shift+\\')`
   and prints the success/failure. This catches OS-wide conflicts but
   not in-app shortcuts. Useful as a quick sanity check; not a
   substitute for the manual tests.

If you want the programmatic test as a reusable utility, file an
INBOX request and coordination can build `scripts/test-shortcut.ts`.

## When in doubt

Three picks that have minimal conflict surface for vimyasa's likely
target demographic:

- `Cmd+Shift+\` — backslash. Used in Cursor/VSCode/Slack/Figma but only
  when foreground; minimal global-launcher conflicts. Vimyasa is using
  this for feedback.
- `Cmd+Shift+'` — apostrophe. Almost no conflicts.
- `Cmd+Shift+;` — semicolon. ChatGPT uses it; otherwise quiet.

Avoid:

- `Cmd+Shift+T` — reopen tab everywhere; testers will hate losing it
  when vimyasa is foreground.
- `Cmd+Shift+P` — command palette in many tools; same issue.
- `Cmd+Shift+R` — reload everywhere; same issue.
- Single-letter `Cmd+Shift+<letter>` for very common letters
  (`F`, `D`, `K`, `N`, `T`, `R`) without strong justification.

## How to update this doc

When you discover a conflict in the wild (a tester reports "your
shortcut blew up my Linear hotkey"), add an entry. When you ship a new
vimyasa shortcut, update the "vimyasa's currently-registered" section
above. Update the "Last verified" date at the top whenever you do a
sweep of the existing entries.
