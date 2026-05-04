# Vibrancy + always-mounted empty wrapper paints black

A macOS Electron quirk: an empty `<div>` with `overflow: hidden` +
`border-radius` inside a `vibrancy: 'under-window'` BrowserWindow can
paint as opaque black instead of letting the OS backdrop show through.

## Symptom

In Vimyasa's BrowserWindows (`vibrancy: 'under-window'` +
`transparent: true` + `frame: false`), an empty wrapping `<div>` with
`position: relative; border-radius: Npx; overflow: hidden;` and no
children that fill it can render as **opaque black** rather than
transparent. The OS vibrancy backdrop fails to composite through that
layer, and the user sees a black rectangle wherever the wrapper covers.

## How it was discovered

While fixing the QuickAdd focus regression. To preserve input focus on
themes hydration, GlowSurface ALWAYS-mounted the BorderBeam wrapper (an
empty div with the styles above) even for disabled wrap-mode surfaces.

On the list window — where this wrapper covered the entire 360×~1000
frame around hundreds of items — the wrapper compositor-failed and
painted black across the whole list area.

The bug looked like "a black box covering items" because the
always-mounted wrapper had `overflow: hidden + border-radius +
position: relative` but no children that filled it.

## Confirmed cause

Removing the always-mount fixed it: GlowSurface in wrap mode now returns
`<>{children}</>` when the surface is inactive. Black box gone
immediately. We did NOT need to change vibrancy or any window-level
setting.

## How to apply this

- **Avoid mounting empty layout-affecting wrappers** (especially with
  `overflow: hidden` / `border-radius` / `position: relative`) inside
  vibrancy BrowserWindows.
- If a wrapper must always exist for layout/identity stability (e.g., to
  preserve descendant focus across hydration), **give it children that
  fill it** — or solve the underlying problem differently (in our case:
  a focus ref callback in QuickAddFixed instead of a stable parent
  wrapper).
- When debugging suspicious "transparent" elements painting opaque,
  reach for `elementsFromPoint(x,y)` and check the computed `background`
  of each layer — and remember that vibrancy compositing failures are a
  candidate even when no element has a background set.

## Memory note

The corresponding memory entry was last verified ~2 days before this doc
was written. If you encounter related compositing weirdness, re-verify
the current `GlowSurface.tsx` behavior before assuming the workaround is
still in place.
