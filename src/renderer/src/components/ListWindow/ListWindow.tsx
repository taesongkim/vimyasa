import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  defaultDropAnimationSideEffects,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useStore } from '../../store/useStore'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useUpwardFlip } from '../../hooks/useUpwardFlip'
import { TitleBar } from './TitleBar'
import { type FilterType } from './FilterBar'
import { ItemRow } from './ItemRow'
import { DraftItemRow } from './DraftItemRow'
import { DragGhost } from './DragGhost'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { Item, ItemStatus } from '../../../../../shared/types'
import { HOT_LIST_ID } from '@shared/types'
import {
  getSendDirection,
  playBlurRamp,
  CARRY_SEND_DURATION_MS,
  type SendDirection
} from '../../hooks/useCarryAnimation'
import { CarryMotionBlurFilters } from './CarryMotionBlurFilters'

export function ListWindow({ listId: initialListId }: { listId: string }) {
  const { items, lists, addItem, reorder, changeItemStatus, removeItem, editItem, sendItemToList, archiveItem } =
    useStore()
  // Gate the JS-side motion blur ramp (Settings → Advanced → "Motion
  // blur on carry-mode send"). The CSS filter is gated separately via
  // a body class set in App.tsx; both must be off for the effect to
  // be fully inert. Skipping the RAF when the toggle's off avoids the
  // SVG attribute mutations (60 frames over ~24ms) when no element
  // references the filter URL anyway.
  const carryMotionBlurEnabled = useStore((s) => s.effects.carryMotionBlur)

  const [activeListId, setActiveListId] = useState(initialListId)
  const [filter, setFilter] = useState<FilterType>('all')
  const [focusIndex, setFocusIndex] = useState(-1)
  // Permanent delete confirmation. Paired with v0.1.8 Undo — undo
  // doesn't cover permanent delete, so the modal makes the
  // destructive action explicit. Backspace + context-menu Delete
  // both flow through this state instead of acting directly.
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null)
  const [cyclePhase, setCyclePhase] = useState<'idle' | 'out' | 'in'>('idle')
  // When QuickAdd notifies us "I just added <itemId> to <listId>", we
  // stash the id here. A separate effect watches `items` for the row's
  // arrival (data-changed → refresh → re-render is async, so the row
  // isn't in the DOM yet at notify time) and scrolls it into view, then
  // clears. Best-effort UX hint; the persistence path is unaffected.
  const [pendingScrollItemId, setPendingScrollItemId] = useState<string | null>(null)
  // Item-arrival flash trigger. The new-item save flash (the white-glow
  // overlay in ItemRow) is what users associate with "this row just
  // landed" — reusing it for cross-list arrivals keeps the visual
  // vocabulary tight. The counter bumps on every arrival so the same
  // itemId arriving twice in a row still re-fires (deps change). Source
  // window receives the broadcast too but its activeListId !== toListId
  // so the handler bails before this state updates.
  const [arrivalFlash, setArrivalFlash] = useState<{ itemId: string; key: number } | null>(null)
  const arrivalCounterRef = useRef(0)
  // Carry mode — sustained "I'm holding this item" state. Entered with
  // `m` on a focused item; exits on commit (0-9 send / Enter land /
  // Esc cancel). While active:
  //   j/k       → reorder up/down within the visible list, focus follows
  //   0-9       → send to list N (0 = hot list, 1-9 = sortedLists[N-1])
  //   Enter/Esc → exit at current position (semantic-only distinction)
  // Visual treatment is a placeholder for now — see ItemRow's
  // `item-row-carrying` class. Aesthetics lane will replace.
  const [carryItemId, setCarryItemId] = useState<string | null>(null)
  const isCarrying = carryItemId !== null
  // Send direction for the in-flight row. Set when carrySendToList fires;
  // cleared after the data mutation. Routed through React (not imperative
  // classList mutation) so re-renders during the send don't clobber the
  // class. While set, isCarrying stays true on the row — the lifted bg
  // + shadow + z-index persist as the keyframe slides on top.
  const [sendDirection, setSendDirection] = useState<SendDirection | null>(null)
  // Whether a new-item draft row is currently active at the bottom of the
  // list. Toggled by the `n` shortcut and the "+ Add item" toolbar button.
  // Save-vs-discard is handled inside DraftItemRow on Enter / blur / Esc /
  // Tab; this flag just controls whether the row is rendered.
  const [isAddingItem, setIsAddingItem] = useState(false)
  const focusedItemCopyFnRef = useRef<(() => void) | null>(null)
  // Same pattern as copy: the focused ItemRow registers its
  // startEditing callback here, so the context menu's "Edit" action
  // (which fires on the item the user right-clicked → that item gets
  // focused before the menu pops, see ItemRow.handleContextMenu)
  // can trigger the row's local editing state from this scope.
  const focusedItemEditFnRef = useRef<(() => void) | null>(null)
  const cycleTargetRef = useRef<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Container holding the items themselves (inside the scroll container,
  // outside DndContext/SortableContext). Passed to useUpwardFlip so it
  // can find rows tagged with data-flip-id and animate ones moving up.
  const itemsContainerRef = useRef<HTMLDivElement>(null)
  useUpwardFlip(itemsContainerRef, '[data-flip-id]')

  // Custom scrollbar state
  const [scrollbarVisible, setScrollbarVisible] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollbarTop, setScrollbarTop] = useState(0)
  const [scrollbarHeight, setScrollbarHeight] = useState(0)
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Note: Escape used to exit the tour from this window, but the
  // 'escape' step's prompt teaches users to try Esc — and they were
  // accidentally exiting the tour by following the lesson. Tour exit
  // now lives only on the callout's dismiss X.

  // Lists in canonical display order. `lists` from the store is in insertion
  // order; the user-facing order is governed by `sortOrder`, which the
  // Settings → Lists tab updates on drag-reorder. Every position-y display
  // here (list number, number-key 1–9 switching, Tab cycling) reads from
  // sortedLists so it stays in sync with what Settings shows.
  // sortedLists drives both the title-bar list number AND the 1-9
  // number-key navigation. Filtering to regular lists means:
  //   - regular lists get listNumber 1..N (in user-facing order)
  //   - hot list's findIndex returns -1, so listNumber renders as 0
  //     (matching the proposal's "hot list holds slot 0" stance)
  //   - 1-9 key presses stay scoped to user lists; they can't
  //     accidentally land on the hot list
  // PR 3 wires the actual `0` key handler that switches into the hot
  // list — the visual `0.` on the title bar is just a free side
  // effect of using the same source.
  const sortedLists = useMemo(
    () => lists.filter((l) => l.kind !== 'hot').sort((a, b) => a.sortOrder - b.sortOrder),
    [lists]
  )

  const list = lists.find((l) => l.id === activeListId)
  const listNumber = sortedLists.findIndex((l) => l.id === activeListId) + 1

  // If the active list is deleted from somewhere else (Settings → Lists,
  // a future tray action, etc.), this window has nothing left to show.
  // Close it. Skip the empty-lists case during initial hydration so we
  // don't close on first mount before the store has populated.
  useEffect(() => {
    if (lists.length > 0 && !lists.some((l) => l.id === activeListId)) {
      window.api.closeWindow()
    }
  }, [lists, activeListId])

  // Flash the title-bar number any time it could feel "fresh" to the user:
  // initial window mount, reorder while the same list stays active, Tab
  // cycle, number-key jump. Bumping numberFlashKey re-keys the span in
  // TitleBar, which restarts the CSS keyframe. Same animation code as
  // before — just a broader trigger condition. The first useEffect run
  // after mount handles the launch flash naturally; subsequent runs
  // handle every (activeListId, listNumber) change.
  const [numberFlashKey, setNumberFlashKey] = useState(0)
  useEffect(() => {
    setNumberFlashKey((k) => k + 1)
  }, [activeListId, listNumber])

  // Update custom scrollbar position and the scroll-edge fade strengths.
  // Fade strength scales from 0 (edge item fully visible) to 1 (edge item
  // fully clipped past the edge), with a quadratic ease-out so the fade
  // ramps in quickly at first and plateaus near full strength. Written
  // directly to CSS custom properties on the scroll container — no React
  // state, no re-render on every scroll tick.
  const updateScrollbar = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const hasOverflow = scrollHeight > clientHeight

    setScrollbarVisible(hasOverflow)

    // Measure first/last items to know how much "scroll budget" exists at
    // each edge before the edge item is fully gone. Using getBoundingClientRect
    // because items have variable heights (text wraps).
    const firstItem = container.querySelector('[data-index="0"]') as HTMLElement | null
    const firstHeight = firstItem ? firstItem.getBoundingClientRect().height : 0
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop
    const lastItem = container.querySelector(
      `[data-index="${(container.querySelectorAll('[data-index]').length || 1) - 1}"]`
    ) as HTMLElement | null
    const lastHeight = lastItem ? lastItem.getBoundingClientRect().height : 0

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 2)
    const topRaw = firstHeight > 0 ? Math.min(scrollTop / firstHeight, 1) : 0
    const bottomRaw = lastHeight > 0 ? Math.min(distanceFromBottom / lastHeight, 1) : 0

    container.style.setProperty('--top-fade-strength', String(easeOut(topRaw)))
    container.style.setProperty('--bottom-fade-strength', String(easeOut(bottomRaw)))

    if (hasOverflow) {
      const scrollRatio = scrollTop / (scrollHeight - clientHeight)
      const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 30)
      const thumbTop = scrollRatio * (clientHeight - thumbHeight)

      setScrollbarTop(thumbTop)
      setScrollbarHeight(thumbHeight)
    }
  }, [])

  // Filter and sort items
  const listItems = useMemo(() => {
    return items
      .filter((i) => i.listId === activeListId && !i.archivedAt)
      .filter((i) => filter === 'all' || i.status === filter)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [items, activeListId, filter])

  // Counts for filter bar
  const counts = useMemo(() => {
    const all = items.filter((i) => i.listId === activeListId && !i.archivedAt)
    return {
      all: all.length,
      active: all.filter((i) => i.status === 'active').length,
      done: all.filter((i) => i.status === 'done').length,
      hold: all.filter((i) => i.status === 'hold').length
    }
  }, [items, activeListId])

  const focusedItem = listItems[focusIndex] || null

  // After a destructive item action (archive, delete), do two things:
  //   1. Slide the focus indicator to the next item (or clear if list is now empty).
  //      Using listItems.length - 2 because listItems still has the pre-action length
  //      at the time this runs — the React re-render that filters out the removed
  //      item happens after the current event handler returns.
  //   2. Force DOM focus back to body. When the focused row unmounts, Electron
  //      sometimes hands DOM focus to the next focusable sibling (e.g. an open
  //      DraftItemRow textarea or the toolbar's "+ Add item" button) instead
  //      of falling back to body. If that happens, the window-level keyboard
  //      handler bails out on every subsequent keypress because it ignores
  //      keys when an input/textarea/contentEditable is focused — meaning
  //      j/k/a appear to silently stop working.
  const handlePostDestructive = useCallback(() => {
    setFocusIndex((i) => Math.min(i, listItems.length - 2))
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  }, [listItems.length])

  // After the visible list shrinks (archive, delete, filter change), if
  // the scroll position now points past the bottom of the content,
  // smooth-scroll up to compact the view. Without this, the user is
  // left with empty scrollable space below the last item — annoying
  // when they archive several items at the bottom and the viewport
  // doesn't follow. Smooth (vs instant) so the adjustment feels like a
  // deliberate pull-up rather than a snap.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
    if (el.scrollTop > maxScrollTop) {
      el.scrollTo({ top: maxScrollTop, behavior: 'smooth' })
    }
  }, [listItems.length])

  // Clear focus-scoped action refs when nothing's focused, so a stale
  // copy/edit fn can't fire on whatever was last focused. Refs get
  // re-populated on the next focus by ItemRow's onCopyRequest /
  // onEditRequest effects.
  useEffect(() => {
    if (focusIndex === -1) {
      focusedItemCopyFnRef.current = null
      focusedItemEditFnRef.current = null
    }
  }, [focusIndex])

  // Switch to list by number (1-indexed)
  const switchToListByNumber = useCallback((listNumber: number) => {
    const targetList = sortedLists[listNumber - 1]
    if (targetList && targetList.id !== activeListId && cyclePhase === 'idle') {
      cycleTargetRef.current = targetList.id
      setCyclePhase('out')
    }
  }, [sortedLists, activeListId, cyclePhase])

  // Cross-side window swap. Closes the current window, opens the target.
  // Order matters: open first so there's never a "no windows" gap.
  // Used by `0` from a regular list and `1`-`9` from the hot list (see
  // the keyboard config below). Stays as a stable helper even if the
  // 0-key navigation gets disabled later — carry mode reuses it.
  const swapToList = useCallback((targetId: string) => {
    void window.api.openListWindow(targetId)
    void window.api.closeWindow()
  }, [])

  // ── Carry mode helpers ─────────────────────────────────────────
  // Snapshot the full ordered ids of the carry item's list as it
  // was when carry started. Two purposes:
  //   1. Cmd+Z while carrying restores to this snapshot, so the user
  //      can back out of a botched pickup (j/k drift) without leaving
  //      a trail.
  //   2. On normal carry exit (Enter / Esc / m re-press at current
  //      position), if the order changed, we push ONE 'reorder' undo
  //      entry from snapshot → current. The per-j/k reorders during
  //      the session use `silent=true` so we don't flood the log
  //      with intermediate steps.
  const carryStartingOrderRef = useRef<string[] | null>(null)
  const carryStartingListIdRef = useRef<string | null>(null)
  // Visible-list index at carry-start time. Cmd+Z restore uses THIS,
  // not `startingOrder.indexOf(carryItemId)`, because startingOrder
  // includes archived items (the silent reorder needs the full list
  // to preserve relative positions of hidden rows). On a list with N
  // archived items, snapshot.indexOf could return a number >>
  // listItems.length-1, and setFocusIndex(thatNumber) would strand
  // focus past the visible roster — j/k still update focusIndex but
  // listItems[focusIndex] stays undefined → no row highlights.
  const carryStartingVisibleIdxRef = useRef<number>(-1)

  const enterCarry = useCallback(() => {
    if (!focusedItem) return
    const snapshot = items
      .filter((i) => i.listId === activeListId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => i.id)
    carryStartingOrderRef.current = snapshot
    carryStartingListIdRef.current = activeListId
    // Save the visible-list index too — see ref declaration for why
    // snapshot.indexOf isn't the right lookup on lists with archived
    // items. focusedItem comes from listItems[focusIndex], so saving
    // focusIndex itself is correct and cheap.
    carryStartingVisibleIdxRef.current = focusIndex
    setCarryItemId(focusedItem.id)
  }, [focusedItem, items, activeListId, focusIndex])

  // Normal carry exit (Enter / Esc / m re-press). Captures one
  // aggregate 'reorder' undo entry covering the whole session, then
  // clears the snapshot. carrySendToList exits via a different path
  // (move-list captures its own entry).
  const exitCarry = useCallback(() => {
    const startingOrder = carryStartingOrderRef.current
    const startingListId = carryStartingListIdRef.current
    if (startingOrder && startingListId === activeListId) {
      const currentOrder = items
        .filter((i) => i.listId === activeListId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => i.id)
      void window.api.undo.pushReorderEntry(
        activeListId,
        startingOrder,
        currentOrder
      )
    }
    carryStartingOrderRef.current = null
    carryStartingListIdRef.current = null
    carryStartingVisibleIdxRef.current = -1
    setCarryItemId(null)
  }, [items, activeListId])

  // Reorder the carry item by ±1 within the visible list. Uses the
  // FULL ordered list of items in the active list as the basis for
  // the reorder IPC (passing only a subset would clobber other items'
  // sortOrder, since the IPC sets sortOrder = index). Visible neighbor
  // is the one we swap with — if a hidden item sits between, it stays
  // put; the user perceives single-step movement in the visible roster.
  const carryReorder = useCallback(
    (delta: -1 | 1) => {
      if (!carryItemId) return
      const visibleIdx = listItems.findIndex((i) => i.id === carryItemId)
      if (visibleIdx < 0) return
      const newVisibleIdx = visibleIdx + delta
      if (newVisibleIdx < 0 || newVisibleIdx >= listItems.length) return
      const swapTargetId = listItems[newVisibleIdx].id
      const allInList = items
        .filter((i) => i.listId === activeListId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const fullCarryIdx = allInList.findIndex((i) => i.id === carryItemId)
      const fullTargetIdx = allInList.findIndex((i) => i.id === swapTargetId)
      if (fullCarryIdx < 0 || fullTargetIdx < 0) return
      const fullOrder = [...allInList]
      ;[fullOrder[fullCarryIdx], fullOrder[fullTargetIdx]] = [
        fullOrder[fullTargetIdx],
        fullOrder[fullCarryIdx]
      ]
      // silent=true: each j/k step is part of one logical carry
      // session. The aggregate undo entry is pushed on exit (see
      // exitCarry) so the user sees the whole reorder as one undo
      // step instead of N per-keystroke steps.
      reorder(
        activeListId,
        fullOrder.map((i) => i.id),
        true
      )
      // Focus follows the carry so the highlight stays glued to the
      // moving row instead of stranding on the fixed visible index.
      setFocusIndex(newVisibleIdx)
    },
    [carryItemId, listItems, items, activeListId, reorder]
  )

  // Safety: if the carry item disappears (archived from elsewhere,
  // deleted, or moved to another list via context menu), exit carry
  // so we don't strand the state on a non-existent itemId. Also the
  // exit path for carrySendToList — the send leaves these flags set
  // intentionally so the unmounting row preserves its sending +
  // carrying classes through AnimatePresence (otherwise the row
  // reappears at opacity 1 / no transform between the optimistic data
  // mutation and framer's exit, producing a brief flash).
  useEffect(() => {
    if (!carryItemId) return
    const stillHere = items.some(
      (i) => i.id === carryItemId && i.listId === activeListId && !i.archivedAt
    )
    if (!stillHere) {
      // Item left the list via send / archive / external delete.
      // Don't push the aggregate-reorder undo entry here — the
      // move-list IPC already captured its own entry, and any
      // mid-carry j/k drift in the source list is intentionally
      // abandoned in favor of the commit action.
      carryStartingOrderRef.current = null
      carryStartingListIdRef.current = null
      carryStartingVisibleIdxRef.current = -1
      setCarryItemId(null)
      setSendDirection(null)
    }
  }, [carryItemId, items, activeListId])

  // Cmd+Z while carry mode is active. useGlobalUndo dispatches
  // `undo-check-carry` on the window; if we're carrying, restore
  // the pre-carry order silently (no undo entry), exit carry, and
  // `preventDefault()` so the hook doesn't fall through to the
  // default log-pop path. Per spec: "no log consumption" — the
  // restore itself uses silent=true and we don't push an entry on
  // exit either.
  useEffect(() => {
    const onCheckCarry = (e: Event): void => {
      if (!carryItemId) return
      const startingOrder = carryStartingOrderRef.current
      const startingListId = carryStartingListIdRef.current
      if (startingOrder && startingListId === activeListId) {
        // Silent reorder back to the snapshot.
        reorder(activeListId, startingOrder, true)
      }
      // Restore focusIndex to the carry item's VISIBLE position at
      // carry-start time. `startingOrder.indexOf` would point into
      // the full snapshot (including archived rows), which can be
      // way past listItems.length on archive-heavy lists and would
      // strand focus out of range — j/k would still increment
      // focusIndex but listItems[focusIndex] would be undefined.
      const startVisibleIdx = carryStartingVisibleIdxRef.current
      if (startVisibleIdx >= 0) setFocusIndex(startVisibleIdx)
      carryStartingVisibleIdxRef.current = -1
      carryStartingOrderRef.current = null
      carryStartingListIdRef.current = null
      setCarryItemId(null)
      e.preventDefault()
    }
    window.addEventListener('undo-check-carry', onCheckCarry)
    return () => window.removeEventListener('undo-check-carry', onCheckCarry)
  }, [carryItemId, activeListId, reorder])

  const carrySendToList = useCallback(
    (listNumber: number) => {
      if (!carryItemId) return
      const targetId =
        listNumber === 0 ? HOT_LIST_ID : sortedLists[listNumber - 1]?.id
      if (!targetId) return // No matching list — stay in carry, no-op
      if (targetId === activeListId) {
        // Same-list send is a no-op; treat as commit + exit.
        exitCarry()
        return
      }
      const fromList = lists.find((l) => l.id === activeListId)
      const toList = lists.find((l) => l.id === targetId)
      if (!fromList || !toList) return
      const direction = getSendDirection(fromList, toList)
      const itemId = carryItemId
      // Set the React-driven send class. ItemRow keeps both
      // .item-row-carrying AND .item-row-sending-{direction} during the
      // send so the lifted state visually persists into the throw —
      // no snap-back of background or shadow before the slide.
      setSendDirection(direction)
      // Tier-3 motion blur: ramp the SVG trail filter's stdDeviation
      // over the first ~30% of the slide so the blur eases on rather
      // than snapping to full strength when the row starts moving.
      // Gated by Settings → Advanced; off by default.
      if (carryMotionBlurEnabled) {
        playBlurRamp(direction)
      }
      // After the visual completes, mutate the data. End-fire (vs
      // mid-flight) sidesteps an AnimatePresence-vs-keyframe conflict:
      // the row is fully invisible (forwards keeps opacity 0) by the
      // time React unmounts it, so framer's exit prop transform-reset
      // happens out of sight.
      //
      // Don't clear sendDirection / carryItemId here — the safety
      // effect picks them up after the optimistic store update removes
      // the item from this list. Clearing them synchronously would
      // strip the .item-row-sending-* / .item-row-carrying classes off
      // the about-to-unmount row in the same render that AnimatePresence
      // captures for exit, so the row would reappear at opacity 1 and
      // default position for the duration of framer's exit (visible
      // flash). Leaving the flags set means AnimatePresence preserves
      // the classes; the keyframe's `forwards` keeps opacity 0.
      window.setTimeout(() => {
        void sendItemToList(itemId, targetId)
      }, CARRY_SEND_DURATION_MS)
      // The item is leaving this list; reset focus so the highlight
      // doesn't strand on whatever happens to fall into its old slot.
      setFocusIndex(-1)
    },
    [carryItemId, sortedLists, activeListId, sendItemToList, exitCarry, lists, carryMotionBlurEnabled]
  )

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const focusedElement = container.querySelector(`[data-index="${focusIndex}"]`) as HTMLElement

      if (focusedElement) {
        const containerRect = container.getBoundingClientRect()
        const elementRect = focusedElement.getBoundingClientRect()

        const isAbove = elementRect.top < containerRect.top
        const isBelow = elementRect.bottom > containerRect.bottom

        if (isAbove || isBelow) {
          const targetScrollTop = isAbove
            ? container.scrollTop + elementRect.top - containerRect.top
            : container.scrollTop + elementRect.bottom - containerRect.bottom

          // Fast smooth scroll
          container.style.scrollBehavior = 'smooth'
          container.scrollTo({ top: targetScrollTop })

          // Reset scroll behavior after a brief delay
          setTimeout(() => {
            container.style.scrollBehavior = ''
          }, 150)
        }
      }
    }
  }, [focusIndex])

  // Subscribe to entry-form add hints. We only care about adds that
  // landed in our active list — others go to a different list window.
  // The actual scroll waits until the new item appears in `items`
  // (handled by the effect below) so the DOM has the row to scroll to.
  useEffect(() => {
    return window.api.quickAdd.onItemAdded(({ itemId, listId }) => {
      if (listId !== activeListId) return
      setPendingScrollItemId(itemId)
    })
  }, [activeListId])

  // Subscribe to cross-list arrivals (carry-mode send, right-click
  // "Send to List", future drag-between-lists / bulk ops). Two
  // reactions when the arrival lands in our active list:
  //   - `arrivalFlash` → ItemRow whose id matches replays the new-item
  //     save flash (white-glow overlay). Same visual vocabulary as
  //     fresh-create + rename-commit — users read "this row just
  //     landed" without needing a new effect. Counter-bumped so a
  //     repeat arrival of the same itemId still fires.
  //   - `setPendingScrollItemId` so the existing scroll-into-view
  //     effect (originally built for entry-form adds) brings the new
  //     row into view once `items` reconciles.
  useEffect(() => {
    return window.api.onItemArrived(({ itemId, toListId }) => {
      if (toListId !== activeListId) return
      arrivalCounterRef.current += 1
      setArrivalFlash({ itemId, key: arrivalCounterRef.current })
      setPendingScrollItemId(itemId)
    })
  }, [activeListId])

  // Once the pending item shows up in `items` (refresh has reconciled),
  // find its DOM row and scroll it into view. Mirror of the focus-change
  // auto-scroll effect above (same scrollBehavior toggle + 150ms reset)
  // so both scroll triggers feel identical to the user — anything else
  // would create a perceptual seam between "added via n" and "added
  // via entry form".
  useEffect(() => {
    if (!pendingScrollItemId) return
    if (!items.some((i) => i.id === pendingScrollItemId)) return
    const container = scrollContainerRef.current
    if (!container) {
      setPendingScrollItemId(null)
      return
    }
    const el = container.querySelector(
      `[data-flip-id="${pendingScrollItemId}"]`
    )
    if (el instanceof HTMLElement) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = el.getBoundingClientRect()
      const isAbove = elementRect.top < containerRect.top
      const isBelow = elementRect.bottom > containerRect.bottom
      if (isAbove || isBelow) {
        const targetScrollTop = isAbove
          ? container.scrollTop + elementRect.top - containerRect.top
          : container.scrollTop + elementRect.bottom - containerRect.bottom
        container.style.scrollBehavior = 'smooth'
        container.scrollTo({ top: targetScrollTop })
        setTimeout(() => {
          container.style.scrollBehavior = ''
        }, 150)
      }
    }
    setPendingScrollItemId(null)
  }, [pendingScrollItemId, items])

  // Listen for context menu actions from main process. Subscribed via
  // window.api.onContextMenuAction — an earlier version reached for
  // window.electron?.ipcRenderer?.on(...) which silently no-op'd
  // because nothing in preload exposes window.electron, and every
  // context-menu click was being thrown away.
  useEffect(() => {
    return window.api.onContextMenuAction((data) => {
      switch (data.action) {
        case 'edit':
          // ItemRow registers its startEditing fn into focusedItemEditFnRef
          // when focused. handleContextMenu in ItemRow calls onFocus()
          // before popping the menu, so the right-clicked row is the
          // focused row by the time this fires.
          focusedItemEditFnRef.current?.()
          break
        case 'copy':
          // Centralized copy fn (includes feedback overlay).
          focusedItemCopyFnRef.current?.()
          break
        case 'setStatus':
          if (data.itemId && data.status) {
            changeItemStatus(data.itemId, data.status as ItemStatus)
          }
          break
        case 'sendTo':
          if (data.itemId && data.listId) {
            sendItemToList(data.itemId, data.listId)
          }
          break
        case 'archive':
          if (data.itemId) {
            archiveItem(data.itemId)
            handlePostDestructive()
          }
          break
        case 'delete':
          // Route context-menu Delete through the same confirmation
          // modal as Backspace. The IPC handler captures the item id
          // before the modal opens — the right-click already moved
          // focus to this row in handleContextMenu.
          if (data.itemId) {
            setPendingDeleteItemId(data.itemId)
          }
          break
      }
    })
  }, [changeItemStatus, sendItemToList, archiveItem, removeItem, handlePostDestructive])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Track which item is currently being dragged so DragOverlay can
  // render its ghost. The source ItemRow's visibility during active
  // drag is controlled by `isDragging` from useSortable directly
  // (opacity: isDragging ? 0 : 1). During the drop animation,
  // dnd-kit's `dropAnimation.sideEffects` applies an inline opacity:0
  // to the source, then removes it when the animation completes —
  // perfectly synced with the ghost's animation duration. No setTimeout
  // dance, no risk of mismatch.
  const DROP_ANIMATION_MS = 250
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const activeDragItem = activeDragId
    ? listItems.find((i) => i.id === activeDragId) ?? null
    : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      // Reorder synchronously (optimistic).
      if (over && active.id !== over.id) {
        const oldIndex = listItems.findIndex((i) => i.id === active.id)
        const newIndex = listItems.findIndex((i) => i.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...listItems]
          const [moved] = newOrder.splice(oldIndex, 1)
          newOrder.splice(newIndex, 0, moved)
          reorder(
            activeListId,
            newOrder.map((i) => i.id)
          )
        }
      }
      // Clear activeDragId immediately — the source's visibility
      // through the drop animation is now handled by dnd-kit's
      // dropAnimation.sideEffects (see DragOverlay below).
      setActiveDragId(null)
    },
    [listItems, activeListId, reorder]
  )

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null)
  }, [])

  // List-cycle helper. Used by Tab in the empty list area and Tab inside
  // the draft row's textarea (where the parent's keyboard listener doesn't
  // fire because focus is in a text input).
  const cycleToNextList = useCallback(() => {
    const idx = sortedLists.findIndex((l) => l.id === activeListId)
    if (sortedLists.length > 1 && cyclePhase === 'idle') {
      const nextList = sortedLists[(idx + 1) % sortedLists.length]
      cycleTargetRef.current = nextList.id
      setCyclePhase('out')
    }
  }, [sortedLists, activeListId, cyclePhase])

  // Draft handlers. The DraftItemRow owns the textarea + UX; the list
  // window owns persistence (addItem) and the visibility flag.
  const startDraft = useCallback(() => {
    // Drop any previously-focused item — keeping the old highlight on
    // a row while the user starts typing a NEW item is visually
    // confusing (looks like the focused row is being edited). The
    // draft surface owns the spotlight from this point until commit
    // / discard.
    setFocusIndex(-1)
    setIsAddingItem(true)
  }, [])

  const commitDraft = useCallback(
    (text: string) => {
      // Empty text reaches here when DraftItemRow's commit logic decided
      // there's nothing to save (e.g. blur with empty content). DraftItemRow
      // calls onDiscard in that path, not onSave; this guard is a belt
      // against any future caller that forgets to trim.
      //
      // addItem is optimistic — it inserts the new Item synchronously
      // before awaiting IPC. Together with the synchronous
      // setIsAddingItem(false) below, React batches both state changes
      // into a single render: the draft unmounts AND the new item
      // appears in the same frame, so there's no intermediate "draft
      // gone, new item not yet rendered" state for the browser to
      // clamp scrollTop on or for Framer Motion to read as a layout
      // change.
      if (text) {
        void addItem(activeListId, text)
      }
      setIsAddingItem(false)
    },
    [addItem, activeListId]
  )

  const discardDraft = useCallback(() => {
    setIsAddingItem(false)
  }, [])

  // Tab from inside the draft textarea: commit-or-discard, then cycle to
  // the next list. The parent's onTab in useKeyboard doesn't fire while
  // focus is in a text input, so we route Tab through here explicitly.
  const handleDraftTab = useCallback(
    (text: string) => {
      if (text) {
        void addItem(activeListId, text)
      }
      setIsAddingItem(false)
      cycleToNextList()
    },
    [addItem, activeListId, cycleToNextList]
  )

  // Keyboard navigation
  useKeyboard({
    onArrowUp: () => {
      // In carry mode, j/k (mapped to arrow handlers via jkMode) AND
      // arrow keys all reorder. The user is "holding" the item; every
      // up/down primitive moves it.
      if (isCarrying) {
        carryReorder(-1)
        return
      }
      setFocusIndex((i) => {
        if (listItems.length === 0) return -1
        if (i === -1) return listItems.length - 1 // nothing selected → focus last
        return i === 0 ? listItems.length - 1 : i - 1 // up = previous, wrap to bottom
      })
    },
    onArrowDown: () => {
      if (isCarrying) {
        carryReorder(1)
        return
      }
      setFocusIndex((i) => {
        if (listItems.length === 0) return -1
        if (i === -1) return 0 // nothing selected → focus first
        return i === listItems.length - 1 ? 0 : i + 1 // down = next, wrap to top
      })
    },
    onEnter: () => {
      // Enter no longer archives — A keeps that role. Frees Enter to
      // commit + exit carry mode at the current position. Outside
      // carry, Enter is a deliberate no-op (was a frequent accidental
      // archive trigger after rename / move).
      if (isCarrying) {
        exitCarry()
      }
    },
    onSpace: () => {
      if (focusedItem) {
        const next: Record<ItemStatus, ItemStatus> = {
          active: 'done',
          done: 'hold',
          hold: 'active'
        }
        changeItemStatus(focusedItem.id, next[focusedItem.status])
      }
    },
    onBackspace: () => {
      // Open the permanent-delete confirmation modal. The double-tap
      // timer pattern that lived here is gone — the modal is a clear
      // commit point and pairs with the Undo work (delete is the one
      // mutation that's NOT undoable, so it earns an explicit confirm).
      if (focusedItem && !pendingDeleteItemId) {
        setPendingDeleteItemId(focusedItem.id)
      }
    },
    onCopy: () => {
      if (focusedItemCopyFnRef.current) {
        focusedItemCopyFnRef.current()
      }
    },
    onComments: () => {
      if (focusedItem) {
        window.api.openComments(focusedItem.id)
      }
    },
    onC: () => {
      if (focusedItemCopyFnRef.current) {
        focusedItemCopyFnRef.current()
      }
    },
    onO: () => {
      if (focusedItem) {
        window.api.openComments(focusedItem.id)
      }
    },
    onA: () => {
      if (focusedItem) {
        archiveItem(focusedItem.id)
        handlePostDestructive()
      }
    },
    onR: () => {
      // Same code path as the right-click → Edit context menu action
      // and the double-click handler: focused row's startEditing was
      // registered into focusedItemEditFnRef on focus change. Bare `r`
      // (Cmd+R is reload, never clobber) just calls it.
      focusedItemEditFnRef.current?.()
    },
    onM: () => {
      // Toggle: m enters carry mode on the focused item, m again
      // lands at current position (third land path alongside Enter
      // and Esc). Lets the user pop in and out with the same finger.
      if (isCarrying) {
        exitCarry()
      } else {
        enterCarry()
      }
    },
    onN: startDraft,
    onEscape: () => {
      // Hierarchical Escape — step back exactly one focus level per press:
      //   carry mode   → exit carry (item lands at current position)
      //   input focus  → blur the input             (lands in item or window focus)
      //   item focus   → clear focusIndex            (lands in window focus)
      //   window focus → close the window           (top of the stack)
      // The order matters: input check has to come first because focusIndex
      // is -1 in *both* input focus and window focus, so we can't tell them
      // apart without consulting document.activeElement.
      if (isCarrying) {
        exitCarry()
        return
      }
      const active = document.activeElement as HTMLElement | null
      const isTypingInInput =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)

      if (isTypingInInput) {
        active?.blur?.()
        return
      }
      if (focusIndex !== -1) {
        setFocusIndex(-1)
        return
      }
      window.api.closeWindow()
    },
    // Number-key navigation. Carry mode takes priority over the
    // regular/hot navigation flows — when carrying, every number key
    // is "send to list N" (0 = hot list).
    //
    //   carry mode,   `0`-`9`  → send carry item to list N + exit.
    //   regular list, `1`-`9`  → in-place active-list swap (existing).
    //   regular list, `0`      → close + open the hot list.            [REMOVABLE]
    //   hot list,     `1`-`9`  → close + open regular list N.          [REMOVABLE]
    //   hot list,     `0`      → no-op.
    //
    // To revert to "regular lists only navigate 1-9 in-place; hot list
    // ignores number keys entirely", delete the [REMOVABLE] branches.
    // Carry-mode and the in-place path are unaffected.
    onNumber0: isCarrying
      ? () => carrySendToList(0)
      : list?.kind === 'hot'
        ? undefined
        : () => swapToList(HOT_LIST_ID), // [REMOVABLE]
    onNumber1: isCarrying
      ? () => carrySendToList(1)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[0]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(1),
    onNumber2: isCarrying
      ? () => carrySendToList(2)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[1]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(2),
    onNumber3: isCarrying
      ? () => carrySendToList(3)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[2]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(3),
    onNumber4: isCarrying
      ? () => carrySendToList(4)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[3]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(4),
    onNumber5: isCarrying
      ? () => carrySendToList(5)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[4]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(5),
    onNumber6: isCarrying
      ? () => carrySendToList(6)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[5]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(6),
    onNumber7: isCarrying
      ? () => carrySendToList(7)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[6]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(7),
    onNumber8: isCarrying
      ? () => carrySendToList(8)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[7]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(8),
    onNumber9: isCarrying
      ? () => carrySendToList(9)
      : list?.kind === 'hot'
        ? () => { const t = sortedLists[8]; if (t) swapToList(t.id) } // [REMOVABLE]
        : () => switchToListByNumber(9),
    onTab: cycleToNextList
  })

  // Custom scrollbar event listeners
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      updateScrollbar()
      setIsScrolling(true)

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Hide scrollbar after 300ms of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 300)
    }
    const handleResize = () => updateScrollbar()

    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    // Initial update
    updateScrollbar()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [updateScrollbar, listItems.length])

  // Scrollbar mouse interactions
  useEffect(() => {
    if (!isDraggingScrollbar) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const relativeY = e.clientY - containerRect.top
      const scrollRatio = relativeY / (containerRect.height - scrollbarHeight)
      const newScrollTop = scrollRatio * (container.scrollHeight - container.clientHeight)

      container.scrollTop = Math.max(0, Math.min(newScrollTop, container.scrollHeight - container.clientHeight))
    }

    const handleMouseUp = () => {
      setIsDraggingScrollbar(false)
      setIsScrolling(true)
      // Hide scrollbar after 300ms when drag ends
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 300)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingScrollbar, scrollbarHeight])

  if (!list) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--color-text-muted)]">
        List not found
      </div>
    )
  }

  // Slide direction mirrors the spatial position: regular lists stack
  // from the left and slide in from the left (-20 → 0); the hot list
  // anchors to the right edge and slides in from the right (+20 → 0).
  // The user develops a left/right muscle memory for "everyday work"
  // vs. "today's commitments." If `list` is briefly undefined during
  // a delete, default to the regular direction — the window will close
  // shortly anyway.
  const isHot = list?.kind === 'hot'
  const slideEnterX = isHot ? 20 : -20
  const slideExitX = isHot ? 30 : -30

  return (
    <motion.div
      key={activeListId}
      initial={{ opacity: 0, x: slideEnterX }}
      animate={cyclePhase === 'out' ? { opacity: 0, x: slideExitX } : { opacity: 1, x: 0 }}
      transition={{ duration: cyclePhase === 'out' ? 0.08 : 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      onAnimationComplete={() => {
        if (cyclePhase === 'out' && cycleTargetRef.current) {
          setActiveListId(cycleTargetRef.current)
          setFilter('all')
          setFocusIndex(-1)
          cycleTargetRef.current = null
          setCyclePhase('idle')
        }
      }}
      className="flex flex-col h-full glass-surface relative"
      style={{ padding: `var(--space-component-padding) var(--space-container-padding)` }}
    >
      <CarryMotionBlurFilters />
      <TitleBar list={list} listNumber={listNumber} numberFlashKey={numberFlashKey} filter={filter} onFilterChange={setFilter} counts={counts} />

      {/* Item list */}
      <div
        ref={scrollContainerRef}
        // tabIndex=-1 makes the container programmatically focusable
        // (focus() works) but skipped from sequential Tab navigation.
        // Used by the Cmd+Z-during-edit and Cmd+Z-during-carry paths to
        // hand keyboard focus back to a safe non-input element so
        // useKeyboard's "is the active element a textarea?" guard
        // doesn't bail on every j/k after the cancel.
        tabIndex={-1}
        className="flex-1 py-2 overflow-y-scroll scrollbar-hidden relative scroll-fade focus:outline-none"
      >
        <div
          ref={itemsContainerRef}
          className={`flex flex-col${isCarrying ? ' list-carrying' : ''}`}
          style={{ gap: `var(--space-item-gap)` }}
        >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          // restrictToVerticalAxis: zeros the X component of the drag
          // transform so the dragged item can only travel up/down.
          // Without this, dragging sideways triggers dnd-kit's auto-scroll
          // horizontally — clipping on the left edge and infinite scroll
          // on the right.
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={listItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {listItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isFocused={idx === focusIndex}
                  isCarrying={item.id === carryItemId}
                  arrivalFlash={
                    arrivalFlash && arrivalFlash.itemId === item.id
                      ? arrivalFlash
                      : null
                  }
                  sendDirection={item.id === carryItemId ? sendDirection : null}
                  onFocus={() => setFocusIndex(idx)}
                  lists={lists}
                  index={idx}
                  dataIndex={idx}
                  onCopyRequest={(fn) => { focusedItemCopyFnRef.current = fn }}
                  onEditRequest={(fn) => { focusedItemEditFnRef.current = fn }}
                  onEditUndoCancel={(rowIdx) => {
                    // Cmd+Z while editing this row — restore focus +
                    // re-park it on a non-input element so j/k keeps
                    // working. Matches the carry-cancel handler above.
                    setFocusIndex(rowIdx)
                    scrollContainerRef.current?.focus()
                  }}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
          {/* DragOverlay portal-renders the ghost. dropAnimation.sideEffects
              applies inline opacity: 0 to the source (active draggable)
              for the duration of the drop animation, then removes it
              when complete. This means the source stays hidden through
              the entire ghost-snap-to-target animation and reveals on
              the same frame the ghost unmounts. Tighter coupling than
              setTimeout-based syncing — dnd-kit owns the timing. */}
          <DragOverlay
            dropAnimation={{
              duration: DROP_ANIMATION_MS,
              easing: 'ease-out',
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: '0' } }
              })
            }}
          >
            {activeDragItem ? <DragGhost item={activeDragItem} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Draft row for new-item creation. Rendered at the end of the
            list (inside the scroll area) so it scrolls into view as it
            grows. Lives outside SortableContext because it has no id-on-
            disk to reorder against. */}
        {isAddingItem && (
          <DraftItemRow
            onSave={commitDraft}
            onDiscard={discardDraft}
            onTab={handleDraftTab}
          />
        )}
        </div>

        {listItems.length === 0 && !isAddingItem && (
          <div className="flex items-center justify-center h-20 text-[color:var(--color-text-muted)] text-[length:var(--font-size-base)]">
            {filter === 'all' ? 'No items yet. Press N to add one.' : `No ${filter} items.`}
          </div>
        )}

      </div>

      {/* Bottom toolbar — replaces the old AddRow input field. Designed
          as a flex container so future actions can sit alongside the
          add-item button without restructuring. */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-[var(--color-border)]">
        <button
          className="no-drag flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={startDraft}
          title="Add item (N)"
        >
          <span className="text-[length:var(--font-size-md)]">+</span>
          <span>Add item</span>
        </button>
      </div>

      {/* Custom scrollbar - positioned outside scroll container but aligned to it */}
      {scrollbarVisible && (
        <div
          className="absolute right-2 w-px bg-[var(--white-priority-1)] pointer-events-auto"
          style={{
            top: `${scrollContainerRef.current?.offsetTop || 0}px`,
            height: `${scrollContainerRef.current?.clientHeight || 0}px`,
            opacity: (isScrolling || isDraggingScrollbar) ? 1 : 0,
            transition: `opacity ${(isScrolling || isDraggingScrollbar) ? '100ms' : '350ms'} ease`
          }}
        >
          <div
            ref={scrollbarRef}
            className="absolute right-0 w-px bg-[var(--white-priority-2)] cursor-pointer hover:bg-[var(--white-priority-3)] transition-default"
            style={{
              top: `${scrollbarTop}px`,
              height: `${scrollbarHeight}px`
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsDraggingScrollbar(true)
            }}
          />
        </div>
      )}

      {/* Permanent delete confirmation modal. Paired with the v0.1.8
          Undo work — undo doesn't cover delete, so this is the one
          point in the keyboard / context-menu flow where the user
          explicitly commits to losing the row. */}
      {pendingDeleteItemId && (() => {
        const target = items.find((i) => i.id === pendingDeleteItemId)
        if (!target) {
          // Race: item disappeared (cross-window delete, etc.). Close
          // the modal silently rather than confirm against a phantom.
          setPendingDeleteItemId(null)
          return null
        }
        return (
          <ConfirmDeleteDialog
            itemText={target.text}
            onCancel={() => setPendingDeleteItemId(null)}
            onConfirm={() => {
              removeItem(target.id)
              setPendingDeleteItemId(null)
              handlePostDestructive()
            }}
          />
        )
      })()}

    </motion.div>
  )
}
