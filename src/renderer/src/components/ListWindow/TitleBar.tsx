import { useState, useRef, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import type { List } from '../../../../../shared/types'

export function TitleBar({ list }: { list: List }) {
  const { editList, lists, groups, addList } = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(list.name)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

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

  const startCreating = useCallback(() => {
    setCreating(true)
    setNewName('')
    setTimeout(() => newInputRef.current?.focus(), 0)
  }, [])

  const commitCreate = useCallback(async () => {
    const trimmed = newName.trim()
    if (trimmed) {
      // Use the same group as the current list
      const newList = await addList(list.groupId, trimmed)
      // Open the new list in a window
      window.api.openListWindow(newList.id)
    }
    setCreating(false)
    setNewName('')
  }, [newName, list.groupId, addList])

  const cancelCreate = useCallback(() => {
    setCreating(false)
    setNewName('')
  }, [])

  return (
    <>
      <div className="drag-region flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[14px] shrink-0">{list.icon}</span>
          {editing ? (
            <input
              ref={inputRef}
              className="no-drag bg-transparent text-[14px] font-medium font-tight heading-tracking text-[var(--color-text)] outline-none border-b border-[var(--color-border-focus)] w-full"
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
              className="no-drag text-[14px] font-medium font-tight heading-tracking truncate cursor-default"
              onDoubleClick={startEditing}
              title="Double-click to rename"
            >
              {list.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Add new list button */}
          <button
            className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
            onClick={startCreating}
            title="New list"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Close button */}
          <button
            className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
            onClick={() => window.api.closeWindow()}
            title="Close (Esc)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1 1L9 9M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline new list creation bar */}
      {creating && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-accent)] bg-[var(--color-surface)]">
          <span className="text-xs text-[var(--color-text-muted)] shrink-0">New list:</span>
          <input
            ref={newInputRef}
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder-[var(--color-text-ghost)]"
            value={newName}
            placeholder="List name..."
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              if (!newName.trim()) cancelCreate()
              else commitCreate()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCreate()
              if (e.key === 'Escape') cancelCreate()
            }}
          />
          <span className="text-xs text-[var(--color-text-ghost)]">↵ create · esc cancel</span>
        </div>
      )}
    </>
  )
}
