// Aesthetics-lane primitives for carry-mode (move-item flow). The
// mechanism (state, keyboard, IPC) lives in features lane; this hook +
// helper give features the timing contract and direction rule so the
// visual treatment ships from one place.
//
// See globals.css "Carry mode" section for the matching CSS classes
// and the docs/INBOX.md note dated 2026-05-05 for the wiring contract.

export type SendDirection = 'left' | 'right'

/** Minimum List shape the direction helper needs. Avoids importing the
 *  full List interface so this stays usable from contexts that have
 *  only a partial reference (e.g. an IPC payload). Hot list is signaled
 *  via either `kind === 'hot'` (preferred, available once hot-list lands)
 *  or `isHot: true` (escape hatch for callers without the kind field). */
export interface SendDirectionList {
  sortOrder: number
  kind?: string
  isHot?: boolean
}

/** Decide which way a sent item should fly.
 *
 *  Rule (per user spec, 2026-05-05):
 *    - Hot list ranks highest. Anything → hot = right. Hot → anything = left.
 *    - Otherwise: target.sortOrder > source.sortOrder = right, else left.
 *
 *  The "right = up the order" convention matches the existing hot-list
 *  slide-from-right shipped in v0.1.6 — items moving toward higher-
 *  numbered (or hot) destinations always travel right, regardless of
 *  which list window they happen to appear in. */
export function getSendDirection(
  from: SendDirectionList,
  to: SendDirectionList
): SendDirection {
  const fromIsHot = from.kind === 'hot' || from.isHot === true
  const toIsHot = to.kind === 'hot' || to.isHot === true

  if (toIsHot) return 'right'
  if (fromIsHot) return 'left'
  return to.sortOrder > from.sortOrder ? 'right' : 'left'
}

/** Total send-animation duration. Keep in sync with --carry-send-duration
 *  in globals.css. */
export const CARRY_SEND_DURATION_MS = 80

/** When features should fire sendItemToList during the send animation.
 *  Currently end-fire (== CARRY_SEND_DURATION_MS): the data mutation
 *  happens after the visual completes, so the CSS keyframe owns the
 *  entire on-screen motion. Keep in sync with --carry-send-commit-ms. */
export const CARRY_SEND_COMMIT_MS = 80

/** Motion-blur tier-3 experiment. Peak stdDeviation X for the SVG
 *  trail filter (defined in CarryMotionBlurFilters.tsx). Keep in sync
 *  with --carry-blur-max in globals.css. */
export const CARRY_BLUR_MAX_PX = 6
/** Fraction of CARRY_SEND_DURATION_MS spent ramping blur from 0 → max.
 *  After this, blur holds at max for the remainder of the send (the
 *  row is at low opacity by then anyway, so the held blur fades visually
 *  along with the row rather than snapping off). Keep in sync with
 *  --carry-blur-ramp-fraction. */
export const CARRY_BLUR_RAMP_FRACTION = 0.3
/** Peak alpha for the offset trail copy in the SVG filter chain. Ramped
 *  in lockstep with stdDeviation so the trail is invisible (alpha 0)
 *  while it would be sharp (stdDeviation 0), then fades in as the blur
 *  builds — eliminates the "sharp duplicate" frames at start of slide. */
export const CARRY_TRAIL_ALPHA_MAX = 0.5

/** Play the send animation on a row element. Resolves at the commit
 *  point — features should `await` this and then immediately call
 *  sendItemToList. With end-fire timing (commit == duration), the row
 *  is fully invisible at resolve time (`forwards` fill mode keeps the
 *  keyframe end state), so the subsequent React unmount + framer exit
 *  happen out of sight.
 *
 *  Idempotent: if the element is already mid-send (class present), the
 *  function still resolves on the same schedule. Callers that re-fire
 *  shouldn't expect the animation to restart. */
export function playSend(rowEl: HTMLElement, direction: SendDirection): Promise<void> {
  const className = direction === 'left' ? 'item-row-sending-left' : 'item-row-sending-right'
  rowEl.classList.add(className)
  return new Promise((resolve) => {
    window.setTimeout(resolve, CARRY_SEND_COMMIT_MS)
  })
}

/** Ramp the SVG trail filter's blur intensity AND trail alpha together
 *  over the send duration. RAF-driven — both feGaussianBlur stdDeviation
 *  and feColorMatrix alpha (4th-row, 4th-col) ramp from 0 to their max
 *  values over the first CARRY_BLUR_RAMP_FRACTION of
 *  CARRY_SEND_DURATION_MS, then hold.
 *
 *  Coupling the two ramps eliminates the "sharp duplicate" frames at
 *  start of slide: when stdDeviation is 0 the trail would be a perfect
 *  copy of source, but at that same moment alpha is 0 so the trail is
 *  invisible. By the time the trail fades in, blur has built up enough
 *  to make it read as smear rather than ghost.
 *
 *  CSS can't animate SVG attributes directly. RAF + setAttribute is
 *  the pragmatic path.
 *
 *  Shared filter (one per direction, document-scoped). Carry mode is
 *  single-row so simultaneous sends don't collide; if that ever
 *  changes, swap to a per-send filter clone with a unique id.
 *
 *  Returns a cleanup that resets both attributes immediately — caller
 *  can use this to interrupt the ramp (e.g. component unmount). */
const ALPHA_MATRIX_INVISIBLE =
  '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 0'
const buildAlphaMatrix = (alpha: number): string =>
  `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${alpha} 0`

export function playBlurRamp(direction: SendDirection): () => void {
  const blur = document.querySelector(
    `#carry-trail-${direction} feGaussianBlur`
  )
  const color = document.querySelector(
    `#carry-trail-${direction} feColorMatrix`
  )
  if (!blur || !color) return () => {}

  const start = performance.now()
  let stopped = false
  const tick = (now: number): void => {
    if (stopped) return
    const elapsed = now - start
    const t = Math.min(1, elapsed / CARRY_SEND_DURATION_MS)
    // Linear ramp 0 → 1 over the ramp fraction, then hold at 1.
    const rampT = Math.min(1, t / CARRY_BLUR_RAMP_FRACTION)
    blur.setAttribute('stdDeviation', `${rampT * CARRY_BLUR_MAX_PX} 0`)
    color.setAttribute(
      'values',
      buildAlphaMatrix(rampT * CARRY_TRAIL_ALPHA_MAX)
    )
    if (t < 1) {
      requestAnimationFrame(tick)
    } else {
      // Reset so the next send starts from 0 instead of inheriting
      // this send's peak.
      blur.setAttribute('stdDeviation', '0 0')
      color.setAttribute('values', ALPHA_MATRIX_INVISIBLE)
    }
  }
  requestAnimationFrame(tick)

  return () => {
    stopped = true
    blur.setAttribute('stdDeviation', '0 0')
    color.setAttribute('values', ALPHA_MATRIX_INVISIBLE)
  }
}

/** Trigger a receipt pulse on a list-window root. Generic — fire from
 *  any flow that lands an item into a visible list (carry-mode send,
 *  right-click "Send to List", future drag-between-lists, bulk ops).
 *  The direction encodes which side the item came from, mirroring the
 *  send direction rule (an item sent right arrives on the receiving
 *  window's left edge, and vice versa).
 *
 *  Self-cleans: removes the class after the animation completes so the
 *  next pulse can replay. Re-firing while a pulse is active will skip
 *  this pulse — call sites can guard with their own debounce if needed. */
export function playReceipt(
  rootEl: HTMLElement,
  /** The direction the SOURCE item flew. The receiving edge is the
   *  opposite — sent-right means it arrives on the left edge. */
  sentDirection: SendDirection
): void {
  const className =
    sentDirection === 'right'
      ? 'list-window-receiving-left'
      : 'list-window-receiving-right'
  if (
    rootEl.classList.contains('list-window-receiving-left') ||
    rootEl.classList.contains('list-window-receiving-right')
  ) {
    return
  }
  rootEl.classList.add(className)
  rootEl.addEventListener(
    'animationend',
    () => {
      rootEl.classList.remove(className)
    },
    { once: true }
  )
}
