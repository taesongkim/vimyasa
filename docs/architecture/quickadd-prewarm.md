# QuickAdd pre-warm + sync theme hydration

How the always-alive QuickAdd renderer + preload-injected themes work,
the IPC flicker-prevention contract, and what to copy if pre-warming the
list window next.

## The shift

The QuickAdd window was converted from "destroy on close, recreate on
summon" (~180–260ms cold per summon, with intermittent ~250ms outliers,
plus a fade-up animation that got interrupted by async theme hydration)
to "create once at app startup, hide on close, show on summon"
(consistent 6–21ms summons, clean fade-up every time).

Two architectural shifts made it work; both are needed and both have
load-bearing details.

## 1. Sync theme hydration via preload argv handoff

Main reads `themesStore.getThemesState()` synchronously and JSON-stringifies
it into a `--themes-initial=…` flag passed via
`webPreferences.additionalArguments` for every BrowserWindow creation
(`makeWindow` + the three windows that bypass it: `callout-window.ts`,
`dim-overlay.ts`, `theme-dev-panel.ts`).

The preload script extracts it from `process.argv` and exposes it as
`window.themesInitial`. The renderer's `themesStore` initializes from
that synchronously with `hydrated:true` from the first render.

Cross-window mutations still flow over the existing `themes:onChanged`
IPC, with the subscription installed once at store creation.

- Helper: `getThemesPreloadArg()` in `src/main/themes-store.ts`.

**Why this matters.** Without sync hydration, `<GlowSurface>` would flip
from `<>{children}</>` to `<BorderBeam>{children}</BorderBeam>` when
async hydration completed mid-render → React unmounts and remounts
everything inside, which restarts framer-motion's fade-up animation.
The flicker / interrupted fade you saw before was this exact remount.

## 2. Pre-warm the QuickAdd window itself

`ensureQuickAddPrewarmed()` in `src/main/windows.ts` creates the window
once at app startup with `show: false`, loads `/quickadd/fixed/`, and
parks it hidden.

`createQuickAddWindow(targetListId)` becomes: send `quickadd:show` IPC
with the listId, then `win.show()`. `quickAddHide` IPC sends
`quickadd:hidden` to the renderer FIRST, then calls `win.hide()` — that
ordering is critical (see flicker note below).

- Pre-warm is called from `src/main/index.ts` after IPC handlers + tray
  are wired.
- The toggle path (focused-and-visible shortcut press → hide) also sends
  `quickadd:hidden` before hiding.

## Flicker prevention contract (load-bearing)

The QuickAddFixed renderer holds a `hiddenState` bool that gates whether
`motion.div` is in the DOM at all (`if (hiddenState) return null`
early-return).

Both an explicit IPC listener (`window.api.quickAdd.onHidden`) AND a
`document.visibilitychange` fallback set `hiddenState = true` on hide.
The IPC is authoritative because `visibilitychange` from `win.hide()`
can fire late, leaving prior content in the DOM during the brief window
between the next `win.show()` paint and the `quickadd:show` IPC arriving
— the user sees a flash of stale content (e.g. "Add to Inbox" from the
previous summon) before it disappears and fades up.

With both signals, even if one is late, the unmount happens reliably
before the next show.

State reset (text, listId, dropdown, exiting) plus a
`setShowCount(c => c + 1)` (used as `key={showCount}` on motion.div to
force a fresh remount + replay the fade-up) all happen in the `onShow`
handler.

## Particle pause-on-hidden

`ParticleLayer` listens to `visibilitychange` and cancels its RAF loop
while the document is hidden. Without this, the always-alive prewarmed
window would burn ~5–15% sustained CPU running particle physics no one
can see. Critical for the snappiness-at-zero-idle-cost ethos. Resume on
visible, reset `last` so dt doesn't jump.

## Costs paid

- ~30–80MB resident for the always-alive QuickAdd renderer.
- ~0% idle CPU (RAF pause).
- On modern Macs neither shows up.

## Extending to list windows

Same architecture, different state-reset semantics. Each list window has
its own scroll position, focus index, edit-mode state — those need to
survive across summons, which is *opposite* of QuickAdd (QuickAdd resets
to a fresh form every show; lists should resume where the user left
off).

Option to consider: keep the renderer alive but skip the unmount-on-hide
step so React state persists naturally. Window per listId; need a Map of
pre-warmed list windows keyed by listId. The IPC contracts (`list:show`,
`list:hidden`) mirror QuickAdd's.

The dnd-kit and AnimatePresence interactions in ItemRow may need extra
care — pre-warming with hundreds of items in the AnimatePresence can be
costly even when hidden. Test with the user's actual list before
declaring it done.

The **hot list** (see [proposals/hot-list.md](../proposals/hot-list.md))
is a particularly good candidate for first-of-kind list prewarming: only
one instance, well-defined contents, hotkey summoning is the primary
interaction.
