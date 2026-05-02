import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { useStore } from '../../store/useStore'
import { useKeyboard } from '../../hooks/useKeyboard'
import { TitleBar } from './TitleBar'
import { type FilterType } from './FilterBar'
import { ItemRow } from './ItemRow'
import { DraftItemRow } from './DraftItemRow'
import type { Item, ItemStatus } from '../../../../../shared/types'

export function ListWindow({ listId: initialListId }: { listId: string }) {
  const { items, lists, addItem, reorder, changeItemStatus, removeItem, editItem, sendItemToList, archiveItem } =
    useStore()

  const [activeListId, setActiveListId] = useState(initialListId)
  const [filter, setFilter] = useState<FilterType>('all')
  const [focusIndex, setFocusIndex] = useState(-1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [cyclePhase, setCyclePhase] = useState<'idle' | 'out' | 'in'>('idle')
  // Whether a new-item draft row is currently active at the bottom of the
  // list. Toggled by the `n` shortcut and the "+ Add item" toolbar button.
  // Save-vs-discard is handled inside DraftItemRow on Enter / blur / Esc /
  // Tab; this flag just controls whether the row is rendered.
  const [isAddingItem, setIsAddingItem] = useState(false)
  const focusedItemCopyFnRef = useRef<(() => void) | null>(null)
  const cycleTargetRef = useRef<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Custom scrollbar state
  const [scrollbarVisible, setScrollbarVisible] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollbarTop, setScrollbarTop] = useState(0)
  const [scrollbarHeight, setScrollbarHeight] = useState(0)
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track whether the onboarding tour is running, so Escape can exit it
  // directly from this window. Subscribed to the broadcast in main.
  const [tourActive, setTourActive] = useState(false)
  useEffect(() => {
    return window.api.onboarding.onState((s) => setTourActive(s.active))
  }, [])


  // Lists in canonical display order. `lists` from the store is in insertion
  // order; the user-facing order is governed by `sortOrder`, which the
  // Settings → Lists tab updates on drag-reorder. Every position-y display
  // here (list number, number-key 1–9 switching, Tab cycling) reads from
  // sortedLists so it stays in sync with what Settings shows.
  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => a.sortOrder - b.sortOrder),
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

  // Clear copy function when focus changes
  useEffect(() => {
    if (focusIndex === -1) {
      focusedItemCopyFnRef.current = null
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

  // Listen for context menu actions from main process
  useEffect(() => {
    const handleContextAction = (_e: any, data: any) => {
      switch (data.action) {
        case 'edit':
          // Start editing via double-click simulation — handled in ItemRow
          break
        case 'copy':
          {
            // Use the centralized copy function which includes feedback
            if (focusedItemCopyFnRef.current) {
              focusedItemCopyFnRef.current()
            }
          }
          break
        case 'setStatus':
          changeItemStatus(data.itemId, data.status)
          break
        case 'sendTo':
          sendItemToList(data.itemId, data.listId)
          break
        case 'archive':
          archiveItem(data.itemId)
          handlePostDestructive()
          break
        case 'delete':
          removeItem(data.itemId)
          handlePostDestructive()
          break
      }
    }

    // Use window.api pattern instead of direct ipcRenderer
    // Context menu events come through electron's IPC
    if (typeof window !== 'undefined' && 'electron' in window) {
      // @ts-ignore
      window.electron?.ipcRenderer?.on('context-menu-action', handleContextAction)
    }

    return () => {
      if (typeof window !== 'undefined' && 'electron' in window) {
        // @ts-ignore
        window.electron?.ipcRenderer?.removeListener('context-menu-action', handleContextAction)
      }
    }
  }, [items, changeItemStatus, sendItemToList, archiveItem, removeItem, handlePostDestructive])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = listItems.findIndex((i) => i.id === active.id)
      const newIndex = listItems.findIndex((i) => i.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = [...listItems]
      const [moved] = newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, moved)

      reorder(
        activeListId,
        newOrder.map((i) => i.id)
      )
    },
    [listItems, activeListId, reorder]
  )

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
      setFocusIndex((i) => {
        if (listItems.length === 0) return -1
        if (i === -1) return listItems.length - 1 // nothing selected → focus last
        return i === 0 ? listItems.length - 1 : i - 1 // up = previous, wrap to bottom
      })
    },
    onArrowDown: () => {
      setFocusIndex((i) => {
        if (listItems.length === 0) return -1
        if (i === -1) return 0 // nothing selected → focus first
        return i === listItems.length - 1 ? 0 : i + 1 // down = next, wrap to top
      })
    },
    onEnter: () => {
      if (focusedItem) {
        archiveItem(focusedItem.id)
        handlePostDestructive()
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
      if (focusedItem) {
        if (confirmDelete === focusedItem.id) {
          removeItem(focusedItem.id)
          setConfirmDelete(null)
          handlePostDestructive()
        } else {
          setConfirmDelete(focusedItem.id)
          setTimeout(() => setConfirmDelete(null), 2000)
        }
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
    onN: startDraft,
    onEscape: () => {
      // While the onboarding tour is running, Escape is a one-shot exit
      // for the tour itself — easier than hunting for the dismiss X on
      // whichever step is active. Wins over the normal hierarchical
      // logic because the tour wraps the whole experience.
      if (tourActive) {
        void window.api.onboarding.close()
        return
      }
      // Hierarchical Escape — step back exactly one focus level per press:
      //   input focus  → blur the input             (lands in item or window focus)
      //   item focus   → clear focusIndex            (lands in window focus)
      //   window focus → close the window           (top of the stack)
      // The order matters: input check has to come first because focusIndex
      // is -1 in *both* input focus and window focus, so we can't tell them
      // apart without consulting document.activeElement.
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
    onNumber1: () => switchToListByNumber(1),
    onNumber2: () => switchToListByNumber(2),
    onNumber3: () => switchToListByNumber(3),
    onNumber4: () => switchToListByNumber(4),
    onNumber5: () => switchToListByNumber(5),
    onNumber6: () => switchToListByNumber(6),
    onNumber7: () => switchToListByNumber(7),
    onNumber8: () => switchToListByNumber(8),
    onNumber9: () => switchToListByNumber(9),
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

  return (
    <motion.div
      key={activeListId}
      initial={{ opacity: 0, x: -20 }}
      animate={cyclePhase === 'out' ? { opacity: 0, x: -30 } : { opacity: 1, x: 0 }}
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
      <TitleBar list={list} listNumber={listNumber} numberFlashKey={numberFlashKey} filter={filter} onFilterChange={setFilter} counts={counts} />

      {/* Item list */}
      <div ref={scrollContainerRef} className="flex-1 py-2 overflow-y-scroll scrollbar-hidden relative scroll-fade">
        <div className="flex flex-col" style={{ gap: `var(--space-item-gap)` }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={listItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {listItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isFocused={idx === focusIndex}
                  onFocus={() => setFocusIndex(idx)}
                  lists={lists}
                  index={idx}
                  dataIndex={idx}
                  onCopyRequest={(fn) => { focusedItemCopyFnRef.current = fn }}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
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
          className="no-drag flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
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

      {/* Delete confirmation toast */}
      {confirmDelete && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-red)] text-white text-[length:var(--font-size-xs)] font-medium" style={{ boxShadow: 'var(--shadow-tooltip)' }}>
          Press again to delete
        </div>
      )}

    </motion.div>
  )
}
