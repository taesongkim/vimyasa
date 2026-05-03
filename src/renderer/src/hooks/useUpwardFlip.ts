import { useLayoutEffect, useRef } from 'react'

// FLIP-based layout animation that ONLY animates items moving UP.
// Items moving down — or staying put — snap into their new positions.
//
// The asymmetric rule: when an editing row grows in height (or a new
// item is inserted above), siblings below shift DOWN. Animating that
// down-shift would briefly let two rows occupy the same vertical space
// during the transition, looking bad. Snap is the safe default.
//
// When items are removed (archive, delete, send-to-list) or the editing
// row shrinks, siblings shift UP into the freed space. Animating that
// looks great because there's no overlap risk — and it gives the user a
// clear visual confirmation that the action took effect.
//
// Implementation: standard FLIP (First, Last, Invert, Play). Each
// useLayoutEffect run measures all items' viewport-relative top
// positions, compares to the prior measurement (stored in a ref), and
// for items that moved up applies an inverse transform + transitions to
// identity. CSS transition runs at 50ms ease-out — fast enough to feel
// snappy, slow enough to read as motion.
//
// No-deps useLayoutEffect: fires after every render. Cheap when nothing
// shifted (measurement only). Necessary because layout shifts can come
// from many sources — items array changing, ItemRow's editing state
// growing/shrinking the row, filter changes — and we don't want to
// enumerate every trigger.

const ANIMATION_DURATION_MS = 50

export function useUpwardFlip(
  containerRef: React.RefObject<HTMLElement | null>,
  // Selector for the items to track. Each matching element must have a
  // unique `data-flip-id` attribute.
  itemSelector: string
): void {
  const previousPositionsRef = useRef<Map<string, number>>(new Map())

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const items = Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector)
    )

    // No cleanup pass: offsetTop (used below) returns the natural
    // CSS layout position, independent of any in-flight transforms,
    // so we don't need to clear transforms before measuring. Touching
    // other items' inline `style.transition` was breaking Framer
    // Motion's opacity animation on items we weren't even FLIPping —
    // notably the dragged item after a downward drop, which got its
    // post-drop opacity transition (0.5 → 1) frozen at 0.5 because
    // we'd set `transition: none` and never cleaned it up (the cleanup
    // happens via transitionend, which only fires for items that
    // actually animate).
    //
    // Use offsetTop, not getBoundingClientRect().top. offsetTop is
    // relative to the offsetParent (the scroll container in our case,
    // since it has position: relative) and is INDEPENDENT of scroll.
    // getBoundingClientRect().top is viewport-relative — it changes
    // when the user (or the auto-scroll on draft creation) scrolls,
    // even if the item didn't actually reflow. Using offsetTop, the
    // measurement only changes when the item's natural document
    // position changes, which is exactly what we want to animate.
    const newPositions = new Map<string, number>()
    for (const item of items) {
      const id = item.dataset.flipId
      if (!id) continue
      newPositions.set(id, item.offsetTop)
    }

    // First pass: figure out which items moved up and by how much.
    const movers: Array<{ el: HTMLElement; delta: number }> = []
    for (const item of items) {
      const id = item.dataset.flipId
      if (!id) continue
      const prevTop = previousPositionsRef.current.get(id)
      const newTop = newPositions.get(id)
      if (prevTop === undefined || newTop === undefined) continue
      const delta = prevTop - newTop // positive = moved up
      if (delta <= 0.5) continue // moved down, stayed, or sub-pixel; snap
      movers.push({ el: item, delta })
    }

    // Update the ref now so the next render's comparison uses the new
    // natural positions (not the mid-animation positions).
    previousPositionsRef.current = newPositions

    if (movers.length === 0) return

    // Invert: place each mover at its old position via inline transform.
    // No transition yet — these jumps should be instant (the browser
    // never paints the natural new position).
    for (const { el, delta } of movers) {
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
    }

    // Force a synchronous reflow so the inverted positions are
    // committed before we set up the transition. Without this, the
    // browser may batch the transform and the transition into a single
    // style application, in which case nothing animates.
    // Reading offsetHeight is the standard "flush layout" trick.
    void container.offsetHeight

    // Play: enable transition, set transform back to identity. The
    // browser interpolates from the inverted position to natural.
    for (const { el } of movers) {
      el.style.transition = `transform ${ANIMATION_DURATION_MS}ms ease-out`
      el.style.transform = ''

      // Clean up inline styles when the animation ends so future
      // (non-FLIP) style assignments aren't constrained by leftover
      // transition declarations.
      const onEnd = (e: TransitionEvent): void => {
        if (e.propertyName !== 'transform') return
        el.style.transition = ''
        el.removeEventListener('transitionend', onEnd)
      }
      el.addEventListener('transitionend', onEnd)
    }
  })
}
