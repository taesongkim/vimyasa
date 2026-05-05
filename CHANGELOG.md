# Changelog

Narrative version history. For per-release artifact lists, see the
GitHub Releases page.

The voice across these entries is deliberately warmer and more
personal than typical changelogs — vimyasa is a friends-and-family
project and the changelog reflects that. (See
[`docs/reference/voice.md`](docs/reference/voice.md).)

---

## v0.1.6 — *Hot list, carry mode, capture-flow polish* (2026-05-05)

The capture-flow release. The headline is the **Hot list** — a second
always-existing list summoned by `Cmd+Shift+H`, holding number key
`0`, sliding in from the right side of the screen as a mirror to your
regular lists on the left. The hot list is meant for daily completion
— "get these done today" — distinct from the longer-term storage and
processing the regular lists are for. Visually it inherits Theme 1's
magic colors automatically (same components as regular lists), with
its own right-side window position and animation direction. Pinned to
the top of the right-click "Send to List" submenu with a divider so
it always lands first.

The second big move is **carry mode.** Press `m` on a focused item and
the item is "picked up" — visually lifted via scale + drop shadow
+ inset edge, with non-carried siblings dimmed. Inside carry mode:
press `0`–`9` to send to a list (`0` = hot list); press `j` / `k` to
reorder up/down within the current list; press `Enter` or `Esc` to
land at current position. Carry mode is **sustained** — stays active
across keystrokes until you explicitly exit. The send animation is
real choreography (directional flight, parallel slide + fade,
mid-flight resolution so the data move fires while the row's still
in the air), with a directional motion-blur trail via SVG filters
applied by default. If the blur causes rendering issues for you, off-switch
lives in Settings → Advanced.

Receipts on the receiving list window: when an item arrives, the
target list pulses and auto-scrolls the new item into view. Right-click
"Send to List" gets the same treatment for free — a generic
`item-arrived` IPC broadcast handles both flows.

A keymap restructuring landed alongside: **Enter no longer archives**
a focused item (A still does). This frees Enter for carry-mode commit
and prevents accidental archives after rename or move actions.
**`r` enters edit mode** as a parallel keyboard handler to the existing
edit entry. Edit mode now lands the caret after the last character
instead of as a select-all (small bug fix while we were in the area).
Onboarding tour and shortcut surfaces (Settings, `Cmd+Shift+'`
overview window) updated to reflect everything.

Two small wins originally slated for v0.1.8: items added via the
QuickAdd entry form **auto-scroll into view** in any open list window;
the previously-highlighted item **deselects** when a new-item draft
starts. Both pulled forward because they fit naturally with the
capture-flow theme.

---

## v0.1.5 — *Feedback messenger* (2026-05-04)

The first version where testers can talk back. `Cmd+Shift+\` opens a
hotkey-summoned message window that POSTs through a self-hosted
Cloudflare Worker, forwarding via Resend to the dev's inbox. Sender
name is optional, set once in Settings → Feedback. A 30-message-per-day
limit is configurable per tester, with a self-service "bump your own
limit" path baked into the rate-limit copy.

Architecturally, this release was as much about establishing
cross-project infrastructure as shipping a vimyasa feature. The
Worker (`vimyasa-feedback.taesongkim.workers.dev`) is reusable for
any of the dev's future projects via a `projectTag` field in the
payload. Forward-looking: a personal admin dashboard at
justinjustinjustin.com that auto-populates with incoming feedback,
turning the email pipeline into a structured store.

Behind the scenes this release also marked the establishment of the
**coordination-lane planning surface** — `docs/WORKFLOW.md`,
`BACKLOG.md`, `INBOX.md`, `architecture/`, `proposals/`, `reference/`,
plus a SessionStart hook that auto-orients new Claude Code sessions.
The lane-violation rule, audit-fix heuristic, and clocking-in/out
rituals all landed here too. v0.1.5 is the project's first
deliberately-shipped release; the surrounding planning surface is
the durable change that makes future releases easier to design and
narrate.

---

## v0.1.4 — *List motion upgrades + Magic* (2026-05-03)

A dense quality-of-life release that ended up changing how the list
window *feels* more than what it does. The headline is the in-list
entry revamp: instead of typing a new item into a field at the
bottom of a list, you now type directly into a freshly-spawned item
row. Combined with archive/delete response-time slimming and
drag-n-drop preview improvements, the list became *way, way, way
faster.*

Move-item-to-another-list landed as a right-click affordance (the
hotkey-driven "carry mode" follows in a later version).

But the real surprise was **Theme 1 — Magic Colors.** The first
visible step toward the dev's stated vision of "apps that feel
magical." Theme 1 ships baked on three surfaces (the QuickAdd input,
the in-list edit row, the new-item draft row) using a vendored
border-beam fork plus a custom particle layer. Toggleable in
Settings → Themes; off by default for testers who want the calm
look. The full theme infrastructure (surface registry, schema
migrations, cross-window event triggers, dev-panel for tuning)
shipped here too — Theme 2 will be a switching-layer addition rather
than a rewrite.

---

## v0.1.3 — *Spaces fix* (2026-05-01)

A targeted bug-fix release. Vimyasa's windows had been yanking
testers back to whichever macOS Space they'd originally been opened
on; v0.1.3 makes every window respect the Space the user is
currently working in. Small but blast-radius-large for anyone who
uses multiple Spaces.

---

## v0.1.2 — *List reordering, j/k preference, bug fixes* (2026-05-01)

Settings grows its first management surface: List Management lets
testers drag-reorder lists, rename them inline, and delete with
confirmation. The companion polish: a position-number flash in the
list window title when reordering happens, so the change isn't
silent.

j/k navigation gets a Standard/Inverse toggle. Default flipped to
Standard (vim convention: j down, k up) — apologies to anyone who'd
muscle-memorized inverse.

The onboarding tour gains a dim overlay so it's easier to focus
through if your background is noisy. A handful of bug fixes:
arrow-key direction in the list window, light-mode contrast issues
(temporarily resolved by locking dark mode for everyone — light mode
returns later), and a self-note about auto-update no longer
requiring a token.

The tray menu's "Quick Add…" was renamed "Entry Form" for naming
consistency across the app.

---

## v0.1.1 — *Bug fixes, cosmetic upgrades, onboarding tour* (2026-04-29)

The first follow-up to the friends-and-family launch. Highlight: an
in-context **onboarding tour** that runs on first launch and walks
new testers through basics. Replayable anytime from the tray menu.

Bug fixes from v0.1.0 testing covered the things that kept showing
up in tester reports: tray icon not appearing on fresh installs, j/k
navigation breaking after archiving an item, new items occasionally
landing in the middle of a list instead of the bottom, long URLs
and unbroken text running under the action icons.

UX polish: Esc now steps back one focus level (typing → item →
window-close) instead of always closing the window. Quick-add
submission gets a confirmation animation. Scroll-edge fade lets list
items dissolve into shadow at the top and bottom of the visible
area.

---

## v0.1.0 — *Friends and family launch* (2026-04-28)

The first public-ish release. Vimyasa is a keyboard-first list
manager that lives in the menu bar with no dock icon. Core
mechanics:

- `Cmd+Shift+;` opens the Entry Form (Tab to cycle which list it
  goes to).
- `Cmd+Shift+L` opens the first list. Tab cycles lists. Number keys
  1–9 jump to specific lists.
- Lists open in their own windows.
- Quick add, archive, and comments built in.
- Most actions are keyboard-driven; `Cmd+Shift+'` opens the
  shortcut guide.

Shipped code-signed and notarized — no Gatekeeper warning. Universal
binary, runs on Apple Silicon and Intel Macs.

The vibe at launch: deliberately friends-and-family. *"Text me if
you hit a bug or ideas!"*

---

## What this changelog tries to do

For each release, capture:

- **What shipped** — the headline feature(s).
- **The story** — why this version, what it changed about *how* the
  app feels or what it can do, what it sets up for future releases.
- **Architectural moves** — when the release does load-bearing
  scaffolding (theme system, planning surface, etc.), name it.

Avoid:

- Per-bullet feature dumps (the GitHub Releases page does that).
- Generic phrasing that could apply to any release.
- Dropping voice — vimyasa is a personal project and the changelog
  should sound like one.
