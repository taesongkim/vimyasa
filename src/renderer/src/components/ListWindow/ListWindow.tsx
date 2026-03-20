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
import { AddRow, type AddRowHandle } from './AddRow'
import type { Item, ItemStatus } from '../../../../../shared/types'

export function ListWindow({ listId: initialListId }: { listId: string }) {
  const { items, lists, reorder, changeItemStatus, removeItem, editItem, sendItemToList, archiveItem } =
    useStore()

  const [activeListId, setActiveListId] = useState(initialListId)
  const [filter, setFilter] = useState<FilterType>('all')
  const [focusIndex, setFocusIndex] = useState(-1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [cyclePhase, setCyclePhase] = useState<'idle' | 'out' | 'in'>('idle')
  const cycleTargetRef = useRef<string | null>(null)
  const addRowRef = useRef<AddRowHandle>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const list = lists.find((l) => l.id === activeListId)

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
            const item = items.find((i) => i.id === data.itemId)
            if (item) navigator.clipboard.writeText(item.text)
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
          break
        case 'delete':
          removeItem(data.itemId)
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
  }, [items, changeItemStatus, sendItemToList, archiveItem, removeItem])

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

  // Keyboard navigation
  useKeyboard({
    onArrowUp: () => {
      setFocusIndex((i) => {
        if (listItems.length === 0) return -1
        if (i === -1) return 0 // k when nothing selected = first item
        return i === listItems.length - 1 ? 0 : i + 1 // wrap from bottom to top
      })
    },
    onArrowDown: () => {
      setFocusIndex((i) => {
        if (listItems.length === 0) return -1
        if (i === -1) return listItems.length - 1 // j when nothing selected = last item
        return i === 0 ? listItems.length - 1 : i - 1 // wrap from top to bottom
      })
    },
    onEnter: () => {
      if (focusedItem) {
        archiveItem(focusedItem.id)
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
          setFocusIndex((i) => Math.min(i, listItems.length - 2))
        } else {
          setConfirmDelete(focusedItem.id)
          setTimeout(() => setConfirmDelete(null), 2000)
        }
      }
    },
    onCopy: () => {
      if (focusedItem) {
        navigator.clipboard.writeText(focusedItem.text)
      }
    },
    onComments: () => {
      if (focusedItem) {
        window.api.openComments(focusedItem.id)
      }
    },
    onC: () => {
      if (focusedItem) {
        navigator.clipboard.writeText(focusedItem.text)
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
      }
    },
    onN: () => addRowRef.current?.focus(),
    onEscape: () => {
      if (focusIndex === -1) {
        window.api.closeWindow()
      } else {
        setFocusIndex(-1) // deselect if something is selected
      }
    },
    onFilter1: () => setFilter('all'),
    onFilter2: () => setFilter('active'),
    onFilter3: () => setFilter('done'),
    onFilter4: () => setFilter('hold'),
    onTab: () => {
      const idx = lists.findIndex((l) => l.id === activeListId)
      if (lists.length > 1 && cyclePhase === 'idle') {
        const nextList = lists[(idx + 1) % lists.length]
        cycleTargetRef.current = nextList.id
        setCyclePhase('out')
      }
    }
  })

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
      className="flex flex-col h-full glass-surface px-4 py-2"
    >
      <TitleBar list={list} filter={filter} onFilterChange={setFilter} counts={counts} />

      {/* Item list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col gap-1.5">
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
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
        </div>

        {listItems.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[color:var(--color-text-muted)] text-[length:var(--font-size-base)]">
            {filter === 'all' ? 'No items yet. Press N to add one.' : `No ${filter} items.`}
          </div>
        )}
      </div>

      <AddRow ref={addRowRef} listId={activeListId} />

      {/* Delete confirmation toast */}
      {confirmDelete && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-red)] text-white text-[length:var(--font-size-xs)] font-medium" style={{ boxShadow: 'var(--shadow-tooltip)' }}>
          Press again to delete
        </div>
      )}
    </motion.div>
  )
}
