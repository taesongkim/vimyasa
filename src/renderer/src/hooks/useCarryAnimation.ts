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
export const CARRY_SEND_DURATION_MS = 220

/** When features should fire the actual sendItemToList during the send
 *  animation. Resolving the playSend() promise mid-flight (rather than
 *  at the end) makes the commit feel instant — by the time the user
 *  perceives the row leaving, the data has already moved. The remaining
 *  ~110ms of animation runs on a row that's about to unmount; React's
 *  AnimatePresence + the existing useUpwardFlip handle the sibling
 *  reflow without further help. Keep in sync with --carry-send-commit-ms. */
export const CARRY_SEND_COMMIT_MS = 110

/** Play the send animation on a row element. Resolves at the commit
 *  point (mid-flight) — features should `await` this and then
 *  immediately call sendItemToList. The animation continues to its
 *  natural end via `forwards` fill mode in the CSS; there's no further
 *  cleanup here because the row is expected to unmount as part of the
 *  send.
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
