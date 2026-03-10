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
    <div className="flex flex-col h-full glass-surface p-2">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-1 py-2 border-b border-[var(--color-border)]">
        <span className="text-[length:var(--font-size-base)] font-tight heading-tracking font-semibold">Archive</span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* List filter */}
      <div className="flex items-center gap-1 px-1 py-1.5 border-b border-[var(--color-border)] overflow-x-auto">
        <button
          className={`no-drag px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium transition-default shrink-0 ${
            selectedListId === 'all'
              ? 'bg-[var(--active-bg)] text-[color:var(--color-text)]'
              : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
          }`}
          onClick={() => setSelectedListId('all')}
        >
          All
        </button>
        {lists.map((list) => (
          <button
            key={list.id}
            className={`no-drag px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium transition-default shrink-0 ${
              selectedListId === list.id
                ? 'bg-[var(--active-bg)] text-[color:var(--color-text)]'
                : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-2 px-1 py-1.5 hover:bg-[var(--hover-highlight)] transition-default"
              >
                <StatusDot status={item.status} />
                <span className="flex-1 text-[length:var(--font-size-md)] text-[color:var(--color-text-muted)] truncate line-through">
                  {item.text}
                </span>
                {selectedListId === 'all' && list && (
                  <span className="text-[length:var(--font-size-micro)] text-[color:var(--color-text-ghost)] shrink-0">
                    {list.icon}
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-default shrink-0">
                  <button
                    className="no-drag px-2 py-0.5 rounded-[var(--radius-xs)] text-[length:var(--font-size-micro)] font-medium text-[color:var(--color-accent)] hover:bg-[var(--hover-highlight)] transition-default"
                    onClick={() => restoreItem(item.id)}
                  >
                    Restore
                  </button>
                  <button
                    className={`no-drag px-2 py-0.5 rounded-[var(--radius-xs)] text-[length:var(--font-size-micro)] font-medium transition-default ${
                      confirmDelete === item.id
                        ? 'bg-[var(--color-red)] text-white'
                        : 'text-[color:var(--color-red)] hover:bg-[var(--hover-highlight)]'
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
          <div className="flex items-center justify-center h-20 text-[color:var(--color-text-muted)] text-[length:var(--font-size-base)]">
            No archived items
          </div>
        )}
      </div>
    </div>
  )
}
