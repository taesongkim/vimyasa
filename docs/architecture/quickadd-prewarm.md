# QuickAdd first-summon creation + sync theme hydration

How Vimyasa keeps QuickAdd fast after its first use without violating
macOS Space behavior, plus the synchronous theme handoff that prevents a
mid-entrance remount.

## The lifecycle

QuickAdd, Feedback, and the Hot List must create their native window when
the user first summons them. Creating hidden native windows at app launch
bound them to the main macOS Space; summoning from a fullscreen app then
swiped the user away from their current context.

After the first summon, each window stays alive and hides rather than
closing. Later summons are the fast `win.show()` path while preserving
correct Space membership.

- QuickAdd and Feedback unmount their form contents on an explicit main
  process hide IPC, then remount on the next show for a clean entrance.
- The Hot List keeps its React tree mounted across hides so its scroll
  position, focused row, and edit state survive naturally.
- Do not use `document.visibilitychange` as a hide signal for QuickAdd or
  Feedback: macOS reports a renderer as hidden while it is occluded during
  a Space transition. Treating that as a close leaves the window blank when
  the user returns.

## Sync theme hydration

Main reads `themesStore.getThemesState()` synchronously and serializes it
into a `--themes-initial=…` argument for every BrowserWindow. The preload
script exposes that snapshot as `window.themesInitial`, so the renderer's
theme store is hydrated on its first render.

Without this handoff, `<GlowSurface>` can switch from bare children to a
`<BorderBeam>` wrapper after async hydration. That remounts descendants and
interrupts entrance motion or input focus.

- Helper: `getThemesPreloadArg()` in `src/main/themes-store.ts`.
- The same handoff is used by windows that bypass `makeWindow`.

## QuickAdd show/hide contract

On a later summon, main sends `quickadd:show` before `win.show()` so the
renderer can reset text, target list, dropdown state, and its keyed motion
tree before paint. On hide, main sends `quickadd:hidden` before `win.hide()`
so stale form contents cannot flash during the next show.

The first summon does not need that show IPC: it opens directly from a route
that contains its initial list target. This avoids an IPC-listener race while
the renderer is mounting.

## Cost

There is no resident QuickAdd, Feedback, or Hot List renderer before its
first summon. After first use, the persistent hidden renderer costs memory
but ParticleLayer pauses its animation loop while hidden, keeping idle CPU
at zero.
