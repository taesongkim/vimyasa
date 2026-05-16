import { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { FilterDropdown, type FilterType } from './FilterBar'
import type { List } from '../../../../../shared/types'

export function TitleBar({
  list,
  listNumber,
  numberFlashKey,
  filter,
  onFilterChange,
  counts
}: {
  list: List
  listNumber: number
  numberFlashKey: number
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts: Record<FilterType, number>
}) {
  const { editList, removeList } = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(list.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const startEditing = useCallback(() => {
    setName(list.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [list.name])

  const commitEdit = useCallback(async () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== list.name) {
      await editList(list.id, { name: trimmed })
    }
    setEditing(false)
  }, [name, list.id, list.name, editList])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await removeList(list.id)
    window.api.closeWindow()
  }, [confirmDelete, list.id, removeList])

  return (
    <div className="drag-region flex items-center justify-between px-1 py-2 border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          key={numberFlashKey}
          className={`text-[length:var(--font-size-lg)] font-medium font-tight heading-tracking text-[color:var(--color-text-muted)] shrink-0 ${
            numberFlashKey > 0 ? 'animate-list-number-flash' : ''
          }`}
        >
          {listNumber}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            className="no-drag bg-transparent text-[length:var(--font-size-lg)] font-medium font-tight heading-tracking text-[color:var(--color-text-primary)] outline-none border-b border-[var(--color-border-focus)] w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            className="no-drag text-[length:var(--font-size-lg)] font-medium font-tight heading-tracking truncate cursor-default"
            onDoubleClick={startEditing}
            title="Double-click to rename"
          >
            {list.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Filter dropdown */}
        <FilterDropdown active={filter} onChange={onFilterChange} counts={counts} />

        {/* Settings dropdown */}
        <div ref={menuRef} className="relative">
          <button
            className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
            onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false) }}
            title="List settings"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="2" r="1" fill="currentColor" />
              <circle cx="6" cy="6" r="1" fill="currentColor" />
              <circle cx="6" cy="10" r="1" fill="currentColor" />
            </svg>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-50 min-w-[140px] py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-menu)]"
              style={{ boxShadow: 'var(--shadow-tooltip)' }}
            >
              <button
                className="w-full text-left px-3 py-1.5 text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
                onClick={() => { startEditing(); setMenuOpen(false) }}
              >
                Rename list
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
                onClick={() => { window.api.openArchive(list.id); setMenuOpen(false) }}
              >
                View archive
              </button>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <button
                className={`w-full text-left px-3 py-1.5 text-[length:var(--font-size-xs)] transition-default ${
                  confirmDelete
                    ? 'text-[color:var(--color-red)] font-medium'
                    : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-red)] hover:bg-[var(--hover-highlight)]'
                }`}
                onClick={handleDelete}
              >
                {confirmDelete ? 'Confirm delete' : 'Delete list'}
              </button>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => window.api.closeWindow()}
          title="Close (Esc)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 2L10 10M10 2L2 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
