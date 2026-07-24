# Changelog

Narrative version history. For per-release artifact lists, see the
GitHub Releases page.

The voice across these entries is deliberately warmer and more
personal than typical changelogs — vimyasa is a friends-and-family
project and the changelog reflects that. (See
[`docs/reference/voice.md`](docs/reference/voice.md).)

---

## v0.1.11 — *Auto-update actually works + list flick gone* (2026-07-24)

A hotfix release focused entirely on two bugs — one you couldn't
see, and one you probably could.

**Auto-update on macOS 26 actually works now.** Every release since
v0.1.7 shipped with a silent auto-update bug on macOS 26 (Tahoe):
you'd click Install & Restart, the app would quit, and then never
come back — you'd be stuck on the old version until you manually
reinstalled. Root cause was a change deep in how macOS 26 handles
the way our updater framework tries to hand off to its install
helper. This release bypasses the broken hand-off with a direct
launch of the same helper, which does work. If you're reading these
notes inside the update prompt on macOS 26 and installing v0.1.11
via auto-update actually lands you on v0.1.11 — the fix worked, and
every future update from here on will just work.

If you've been on any v0.1.7–v0.1.10 build and never noticed a
missed update, you were probably stuck too. You wouldn't have known.

**No more list flick when items shift up.** When you archived,
deleted, or reordered items — anything that caused rows below to
shift up into a freed slot — the affected rows would briefly appear
at their old lower position for a frame, then slide up to their new
position. It read as a jarring "flick down + slide up." Turned out
to be an over-engineered smoothing animation that snapping cleanly
is just better than. Removed. Now rows snap into place; the vibe
matches the rest of the app's motion.

Nothing else in this release. All deferred v0.1.10 items (backup,
focus cues, flicker hunt, scrollbar polish) still queued for a
future release — this one is scoped tight so the auto-update
mechanism can heal cleanly.

---

## v0.1.10 — *Clearer statuses + windows that stay with you* (2026-07-23)

This release makes two parts of Vimyasa feel much more settled: the state
of an item is legible at a glance, and the app stays in the context where
you summoned it.

**A five-state item lifecycle.** Items now move through Default, Active,
Pending, Complete, and Hidden. Active work reads in warm yellow; Pending
breathes gently so it stays present without shouting; Complete resolves in
green with a quiet strike-through; Hidden preserves its place without
disappearing from the row layout. Every change gets a compact confirmation,
so cycling status stays fast and unambiguous.

**Vimyasa windows follow you.** Lists, Entry, Feedback, Settings, and the
other utility surfaces open in the macOS Space you are already using,
including fullscreen apps, and float above the work beneath them. Entry,
Feedback, and the Hot List are created on first use so macOS assigns them
correctly; from then on they stay warm across summons.

**Focus has a clearer meaning.** The Magic Colors input glow now appears
only when both the Vimyasa window and its actual input are focused. The
same focus signal is ready for the quieter default cue planned for a future
pass.

---

## v0.1.9 — *Update-pipeline UX + Magic Colors light-mode* (2026-07-16)

A focused polish release, all follow-on to what shipped in v0.1.8.

**About release notes.** Settings → General now shows the current
version's release notes at the bottom of the tab, rendered as
markdown — same treatment as the auto-update prompt window.
Answers the "wait, what shipped in the version I'm on?" question
without waiting for the next update. Fetched from GitHub once,
cached per version to disk, works offline after.

**Manual update controls in the tray.** Two new entries. **Check
for Updates…** runs a user-initiated check any time you want it —
if a newer version exists, the update prompt shows up; if you're
on the latest, a small confirmation window. The silent 4-hourly
background check that's always been there stays silent. **View
Update Details** appears when you dismissed an update earlier with
Later — one click brings the details window back without waiting.

**Magic Colors read better on light mode.** After v0.1.8 shipped,
light mode's Magic Colors on the four themed input surfaces (Quick
Add, list-item edit, in-list add, feedback input) read as a faint
thin outline. Themes lane iterated in dev with the palette values
actually held constant — the discovery was that it wasn't hue at
all, it was geometry. On a light background, the beam's default
glow depth and strength render as a rim regardless of color. The
fix pulls the glow inward + up in intensity; same palette, present
character. Dark mode is byte-for-byte unchanged.

**Small alongside:** update windows re-center vertically on
adaptive resize (was pinning top edge); Settings window auto-fits
its width to the tab strip (no more clipped tabs); light-mode
legibility fix on the shared onboarding-style buttons; About
release-notes bullets and numbered lists render; the callout-button
glow got tuned to a size that matches the button.

Under the hood there's a small architectural discovery worth
noting: **for a new surface background, check geometry first, then
palette.** That heuristic came out of the Magic Colors light-mode
work and is likely to save time on the next background variant
(some future dark mode variant, a card surface, whatever).

---

## v0.1.8 — *Light mode + Undo* (2026-07-15)

The biggest bundle since v0.1.6. Four things ship together because
they were the right shape for a single release:

**Light mode.** Settings → Appearance now has a real toggle: Light /
Dark / Auto. Default stays Dark (no surprise mode-switch on update
for existing users); Auto follows the macOS system setting. Under
the hood this is Phase 1 + Phase 2 of the color-tokenization effort —
Phase 1 was an invisible restructuring that split the dark-mode
colors into three layers (raw OKLCH palette → semantic tokens →
component shims); Phase 2 added the light-mode mappings and the
appearance-mode plumbing. The proposal at
[`docs/proposals/color-tokenization.md`](docs/proposals/color-tokenization.md)
has the full architecture and the Decision 6 amendment from v0.1.7.

The Magic Colors on the four themed surfaces (entry form, list-item
edit, in-list add, feedback input) render on both modes; a live
dev check confirmed the rainbow palette holds up on a light
background, so Theme 1 stays as-is across both. If a specific
surface starts reading oppressive in light later, the
per-mode-override path is already sketched.

**Undo (⌘Z) / Redo (⇧⌘Z).** Five-step ring buffer that spans every
list including the hot list. Covered actions: add, edit text, change
status, archive, unarchive, reorder within a list, and move to
another list (carry mode, right-click Send, future drag). One entry
per committed action — edits commit on Enter, carry mode commits on
Enter or Esc land. **Delete permanently is NOT undoable** — a
confirmation modal now guards it (*"Heads up: this is permanent.
Undo won't bring it back."*), auto-focusing Cancel so a stray Enter
can't destroy anything.

Cmd+Z is order-sensitive: if you're mid-edit, it cancels the edit
and restores the original text without touching the undo log. If
you're in carry mode, it puts the item back where you picked it up
and exits carry mode, also without consuming a log entry. Only
outside those states does it pop a real undo. Cmd+Shift+Z is
symmetric; the redo stack resets on any non-undo/redo action.

The architecture landed differently from the brief — main process
owns the log instead of a shared Zustand store — because capturing
at the IPC mutation point avoided a whole class of renderer-side
races. Same end result: single source of truth across all list
windows, broadcast on change.

**Release notes in the auto-update prompt.** When electron-updater
finds a new version, you now get a real in-app window — not the
native OS dialog — with the GitHub release notes rendered inline as
markdown. Two phases: **Update available** (with Install Now /
Later) and **Update downloaded** (with Restart Now / Later and the
notes body). Multi-version skips concatenate chronologically with
the latest at top, so if you've been away, you see everything in
one pass instead of clicking through prompts one at a time. The
window sizes adaptively to its content — compact for the "available"
phase, larger when notes need room.

**Hot list feels instant on first summon.** The hot-list window is
now prewarmed at app startup (same pattern as QuickAdd and the
feedback window). The first Cmd+Shift+H after launch skips the
window-create latency; subsequent summons preserve scroll position,
focus, and mid-edit state across hides. If you had an item picked
up in carry mode and hit Esc, hitting Cmd+Shift+H again finds it
where you left it.

**Small alongside:** confirmation modal opacity fix (was reading
through to the list underneath), Appearance radio dot centering
polish, Undo focus-state cleanup after edit/carry cancel.

---

## v0.1.7 — *Darker dark mode* (2026-05-08)

A small, focused release. The interface backgrounds — entry form,
list windows — now use a darker overlay while keeping the same
translucent vibrancy character. Tuned to alpha `0.7` over a pure-black
base via a dev-panel slider iteration session.

Behind the scenes, this is the first commit of a multi-version effort
to fully tokenize vimyasa's interface colors and add a real light
mode. The full design lives in
[`docs/proposals/color-tokenization.md`](docs/proposals/color-tokenization.md);
v0.1.7 is the smallest possible step that validates the architectural
direction. The dev-panel slider stays in `ThemeDevPanel` for future
iteration on neighboring tokens.

The architecture got refined in real time during implementation —
the original "tune OKLCH lightness, keep alpha" reasoning didn't
survive contact with a pure-black overlay (no chroma to dominate
vibrancy with means alpha is the natural knob). Themes lane caught
it, captured the insight in INBOX, and the proposal carries a
footnote pointing at the amendment. OKLCH-component decomposition
still applies for future color modes where chroma and hue matter;
the dark-mode bg is just a degenerate case where simpler is fine.

Future versions will land the full tokenization (Phase 1: invisible
restructuring), then light mode (Phase 2), then extract to a
cross-project shared system (Phase 3).

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
in the air). A directional motion-blur trail via SVG filters is
also available but **off by default** in v0.1.6 — the CSS-filter
off-screen rendering noticeably degraded text quality during dev
verification, so the polish is opt-in via Settings → Advanced for
now. A future version may flip it back on once the rendering trade
is sorted (filter scoped tighter, or a different effect technique).

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
