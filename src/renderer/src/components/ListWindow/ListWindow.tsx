import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
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
import { FilterBar, type FilterType } from './FilterBar'
import { ItemRow } from './ItemRow'
import { AddRow, type AddRowHandle } from './AddRow'
import type { Item, ItemStatus } from '../../../../../shared/types'

export function ListWindow({ listId }: { listId: string }) {
  const { items, lists, reorder, changeItemStatus, removeItem, editItem, sendItemToList, archiveItem } =
    useStore()

  const [filter, setFilter] = useState<FilterType>('all')
  const [focusIndex, setFocusIndex] = useState(-1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const addRowRef = useRef<AddRowHandle>(null)

  const list = lists.find((l) => l.id === listId)

  // Filter and sort items
  const listItems = useMemo(() => {
    return items
      .filter((i) => i.listId === listId && !i.archivedAt)
      .filter((i) => filter === 'all' || i.status === filter)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [items, listId, filter])

  // Counts for filter bar
  const counts = useMemo(() => {
    const all = items.filter((i) => i.listId === listId && !i.archivedAt)
    return {
      all: all.length,
      active: all.filter((i) => i.status === 'active').length,
      done: all.filter((i) => i.status === 'done').length,
      hold: all.filter((i) => i.status === 'hold').length
    }
  }, [items, listId])

  const focusedItem = listItems[focusIndex] || null

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
        listId,
        newOrder.map((i) => i.id)
      )
    },
    [listItems, listId, reorder]
  )

  // Keyboard navigation
  useKeyboard({
    onArrowUp: () => setFocusIndex((i) => Math.max(0, i - 1)),
    onArrowDown: () => setFocusIndex((i) => Math.min(listItems.length - 1, i + 1)),
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
    onN: () => addRowRef.current?.focus(),
    onEscape: () => window.api.closeWindow(),
    onFilter1: () => setFilter('all'),
    onFilter2: () => setFilter('active'),
    onFilter3: () => setFilter('done'),
    onFilter4: () => setFilter('hold')
  })

  if (!list) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        List not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full glass-surface">
      <TitleBar list={list} />
      <FilterBar active={filter} onChange={setFilter} counts={counts} />

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
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
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {listItems.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[var(--color-text-muted)] text-[13px]">
            {filter === 'all' ? 'No items yet. Press N to add one.' : `No ${filter} items.`}
          </div>
        )}
      </div>

      <AddRow ref={addRowRef} listId={listId} />

      {/* Delete confirmation toast */}
      {confirmDelete && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-red)] text-white text-[11px] font-medium" style={{ boxShadow: 'var(--shadow-tooltip)' }}>
          Press again to delete
        </div>
      )}
    </div>
  )
}
