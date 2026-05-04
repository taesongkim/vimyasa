# Parallel-instance flicker

## Symptom

A brief flicker of an unidentified window-shaped paint slightly under
and off to the side of the QuickAdd entry form on first summon after
vimyasa starts. Usually too quick to identify clearly.

## What it is NOT

The BrowserWindow lifecycle log
([src/main/window-logging.ts](../../src/main/window-logging.ts), gated
on `is.dev`) instruments every `new BrowserWindow` site:

- `windows.ts` via `makeWindow`
- `theme-dev-panel.ts`
- `onboarding/dim-overlay.ts`
- `onboarding/callout-window.ts`

When the flicker reproduces, the log shows ONLY the expected windows
constructed/shown — there is no stray BrowserWindow inside the running
process.

## What it likely IS — primary diagnosis

A SECOND vimyasa process running concurrently — usually because
parallel-worktree dev iterations are going and one was forgotten about.
Both processes register a tray icon and share electron-store paths;
focus events and tray repaints from the other instance can leak visible
briefly when this instance's QuickAdd is summoned.

Confirmed once: the flicker stopped after
`pkill -f electron-vite; pkill -f vimyasa; pkill -f Electron` killed all
instances.

## Open question (as of v0.1.4)

The user has reported seeing the flicker **without** any other instance
running. If reproducible with only one process, the parallel-instance
diagnosis is incomplete and there is a second cause to find. Re-read the
window-logging output around a flickering summon — if it still shows no
stray window, the cause is something other than `new BrowserWindow`
(possible candidates: tray icon repaint, screen capture overlay, prior
hidden window being unhidden, OS-level focus animation).

This is tracked as a P3 bug in [BACKLOG.md](../BACKLOG.md).

## What NOT to do

Do not add `app.requestSingleInstanceLock()` as a fix. Parallel worktree
dev iterations are an intentional workflow — a single-instance lock
would break it.

## Diagnostic recipe when it reappears

1. `ps aux | grep -iE "electron|vimyasa" | grep -v grep`
2. If anything other than the current dev server's electron tree shows
   up, kill those processes and try again.
3. If the flicker still reproduces with only one instance running, read
   the window-logging output around the summon and see what fired —
   that's the second cause.
