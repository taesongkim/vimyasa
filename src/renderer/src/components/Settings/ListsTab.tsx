import { useState, useCallback } from 'react'
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
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore'
import { getRegularLists, type List } from '@shared/types'

interface SortableListItemProps {
  list: List
  index: number
  onEdit: (list: List) => void
  onDelete: (list: List) => void
}

function SortableListItem({ list, index, onEdit, onDelete }: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ${
        isDragging ? 'ring-2 ring-[var(--color-accent)] ring-opacity-50' : ''
      }`}
    >
      {/* List number */}
      <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] font-mono w-6 text-center shrink-0">
        {index + 1}
      </span>

      {/* List name */}
      <span className="flex-1 text-[length:var(--font-size-md)] text-[color:var(--color-text-primary)] truncate">
        {list.name}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => onEdit(list)}
          title="Edit list"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" />
            <path d="M5.25 5.25a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h6.75a3 3 0 0 0 3-3V9a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5H11a.75.75 0 0 0 0-1.5H5.25Z" />
          </svg>
        </button>

        <button
          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-red)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => onDelete(list)}
          title="Delete list"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 1.152L3 14.176a1.5 1.5 0 0 0 1.491 1.324h7.018a1.5 1.5 0 0 0 1.49-1.324l.505-11.524A.58.58 0 0 0 13.494 2.5H11Z" />
          </svg>
        </button>
      </div>

      {/* Drag handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] transition-default p-1"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </div>
    </div>
  )
}

export function ListsTab() {
  const { lists, editList, removeList } = useStore()
  const [editingList, setEditingList] = useState<List | null>(null)
  const [newName, setNewName] = useState('')

  // Hide the hot list from this UI — its order isn't user-configurable
  // and it isn't deletable/renameable here. The IPC delete-guard is the
  // ultimate fallback if it ever leaks into a UI that does mutate lists.
  const sortedLists = getRegularLists(lists).sort((a, b) => a.sortOrder - b.sortOrder)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = sortedLists.findIndex((list) => list.id === active.id)
      const newIndex = sortedLists.findIndex((list) => list.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Reorder the lists
      const reorderedLists = [...sortedLists]
      const [movedList] = reorderedLists.splice(oldIndex, 1)
      reorderedLists.splice(newIndex, 0, movedList)

      // Update sortOrder for each list
      for (let i = 0; i < reorderedLists.length; i++) {
        await editList(reorderedLists[i].id, { sortOrder: i })
      }
    },
    [sortedLists, editList]
  )

  const handleEdit = useCallback((list: List) => {
    setEditingList(list)
    setNewName(list.name)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (editingList && newName.trim() && newName.trim() !== editingList.name) {
      await editList(editingList.id, { name: newName.trim() })
    }
    setEditingList(null)
    setNewName('')
  }, [editingList, newName, editList])

  const handleCancelEdit = useCallback(() => {
    setEditingList(null)
    setNewName('')
  }, [])

  const handleDelete = useCallback(async (list: List) => {
    if (confirm(`Are you sure you want to delete "${list.name}"? This will also delete all items in this list.`)) {
      await removeList(list.id)
    }
  }, [removeList])

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[length:var(--font-size-base)] font-medium text-[color:var(--color-text-primary)] mb-1">
          Manage Lists
        </h2>
        <p className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          Drag lists to reorder them. The number determines which keyboard shortcut (1-9) opens each list.
        </p>
      </div>

      {/* Lists */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedLists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {/*
            12px breathing room above the first row. Inline style instead
            of a Tailwind class — earlier attempts with mt-3 weren't
            propagating, possibly because of dnd-kit context wrappers or
            v4 class-extraction edge cases. Inline is the deterministic
            fallback that doesn't depend on either.
          */}
          <div className="flex flex-col gap-2" style={{ marginTop: '12px' }}>
            {sortedLists.map((list, index) => (
              <SortableListItem
                key={list.id}
                list={list}
                index={index}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Edit dialog */}
      {editingList && (
        <div className="fixed inset-0 bg-[var(--backdrop-dim)] flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-menu)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 min-w-[320px]">
            <h3 className="text-[length:var(--font-size-md)] font-medium text-[color:var(--color-text-primary)] mb-3">
              Edit List Name
            </h3>
            <input
              type="text"
              className="w-full p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[color:var(--color-text-primary)] text-[length:var(--font-size-sm)] outline-none focus:border-[var(--color-accent)]"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
                if (e.key === 'Escape') handleCancelEdit()
              }}
              autoFocus
              placeholder="List name"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-default"
                onClick={handleSaveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}