import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { StatusDot } from '../shared/StatusDot'

export function ArchiveWindow({ listId }: { listId?: string }) {
  const { items, lists, restoreItem, removeItem } = useStore()
  const [selectedListId, setSelectedListId] = useState<string | 'all'>(listId || 'all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const archivedItems = useMemo(() => {
    return items
      .filter((i) => i.archivedAt)
      .filter((i) => selectedListId === 'all' || i.listId === selectedListId)
      .sort((a, b) => new Date(b.archivedAt!).getTime() - new Date(a.archivedAt!).getTime())
  }, [items, selectedListId])

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      removeItem(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 2000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-sm font-semibold">Archive</span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* List filter */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--color-border)] overflow-x-auto">
        <button
          className={`no-drag px-2 py-0.5 rounded text-xs font-medium transition-colors shrink-0 ${
            selectedListId === 'all'
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
          }`}
          onClick={() => setSelectedListId('all')}
        >
          All
        </button>
        {lists.map((list) => (
          <button
            key={list.id}
            className={`no-drag px-2 py-0.5 rounded text-xs font-medium transition-colors shrink-0 ${
              selectedListId === list.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
            onClick={() => setSelectedListId(list.id)}
          >
            {list.icon} {list.name}
          </button>
        ))}
      </div>

      {/* Archived items */}
      <div className="flex-1 overflow-y-auto py-1">
        <AnimatePresence mode="popLayout">
          {archivedItems.map((item) => {
            const list = lists.find((l) => l.id === item.listId)
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-surface-hover)]"
              >
                <StatusDot status={item.status} />
                <span className="flex-1 text-sm text-[var(--color-text-muted)] truncate line-through">
                  {item.text}
                </span>
                {selectedListId === 'all' && list && (
                  <span className="text-[10px] text-[var(--color-text-dim)] shrink-0">
                    {list.icon}
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="no-drag px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface)] transition-colors"
                    onClick={() => restoreItem(item.id)}
                  >
                    Restore
                  </button>
                  <button
                    className={`no-drag px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      confirmDelete === item.id
                        ? 'bg-[var(--color-red)] text-white'
                        : 'text-[var(--color-red)] hover:bg-[var(--color-surface)]'
                    }`}
                    onClick={() => handleDelete(item.id)}
                  >
                    {confirmDelete === item.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {archivedItems.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[var(--color-text-dim)] text-sm">
            No archived items
          </div>
        )}
      </div>
    </div>
  )
}
