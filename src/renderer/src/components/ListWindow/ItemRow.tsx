import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { StatusDot } from '../shared/StatusDot'
import { useStore } from '../../store/useStore'
import type { Item, ItemStatus, List } from '../../../../../shared/types'

const nextStatus: Record<ItemStatus, ItemStatus> = {
  active: 'done',
  done: 'hold',
  hold: 'active'
}

const statusOpacity: Record<ItemStatus, number> = {
  active: 1,
  done: 0.6,
  hold: 0.35
}

export function ItemRow({
  item,
  isFocused,
  onFocus,
  lists,
  index = 0
}: {
  item: Item
  isFocused: boolean
  onFocus: () => void
  lists: List[]
  index?: number
}) {
  const { editItem, removeItem, changeItemStatus, sendItemToList, archiveItem } = useStore()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const startEditing = useCallback(() => {
    setText(item.text)
    setEditing(true)
  }, [item.text])

  const commitEdit = useCallback(async () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== item.text) {
      await editItem(item.id, { text: trimmed })
    }
    setEditing(false)
  }, [text, item.id, item.text, editItem])

  const cycleStatus = useCallback(() => {
    changeItemStatus(item.id, nextStatus[item.status])
  }, [item.id, item.status, changeItemStatus])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onFocus()

      const statusSubmenu = (['active', 'done', 'hold'] as ItemStatus[]).map((s) => ({
        label: s.charAt(0).toUpperCase() + s.slice(1),
        type: 'radio' as const,
        checked: item.status === s,
        ipcEvent: 'context-menu-action',
        ipcData: { action: 'setStatus', itemId: item.id, status: s }
      }))

      const sendToSubmenu = lists
        .filter((l) => l.id !== item.listId)
        .map((l) => ({
          label: `${l.icon} ${l.name}`,
          ipcEvent: 'context-menu-action',
          ipcData: { action: 'sendTo', itemId: item.id, listId: l.id }
        }))

      window.api.showContextMenu([
        { label: 'Edit', ipcEvent: 'context-menu-action', ipcData: { action: 'edit', itemId: item.id } },
        { label: 'Copy Text', ipcEvent: 'context-menu-action', ipcData: { action: 'copy', itemId: item.id } },
        { type: 'separator' },
        { label: 'Status', type: 'submenu', submenu: statusSubmenu },
        ...(sendToSubmenu.length > 0
          ? [{ label: 'Send to List', type: 'submenu' as const, submenu: sendToSubmenu }]
          : []),
        { type: 'separator' },
        { label: 'Archive', ipcEvent: 'context-menu-action', ipcData: { action: 'archive', itemId: item.id } },
        { label: 'Delete', ipcEvent: 'context-menu-action', ipcData: { action: 'delete', itemId: item.id } }
      ])
    },
    [item, lists, onFocus]
  )

  const isDone = item.status === 'done'

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, delay: index * 0.05 }}
      className={`group flex items-center gap-2 px-3 py-1.5 cursor-default ${
        isFocused ? 'item-row-focused' : ''
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onFocus}
      onDoubleClick={startEditing}
      onContextMenu={handleContextMenu}
    >
      {/* Status dot */}
      <StatusDot status={item.status} onClick={cycleStatus} />

      {/* Text */}
      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none border-b border-[var(--color-accent)]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm truncate`}
          style={{ opacity: statusOpacity[item.status] }}
        >
          {item.text}
        </span>
      )}

      {/* Hover actions — always rendered, opacity-reveal on hover */}
      <div
        className="flex items-center gap-1 shrink-0 transition-default"
        style={{ opacity: hovered && !editing ? 1 : 0, pointerEvents: hovered && !editing ? 'auto' : 'none' }}
      >
        <button
          className="no-drag p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(item.text)
          }}
          title="Copy"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
          </svg>
        </button>
        <button
          className="no-drag p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={(e) => {
            e.stopPropagation()
            window.api.openComments(item.id)
          }}
          title="Comments"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 14.25 14H8.061l-2.574 1.926A1.25 1.25 0 0 1 3.5 14.86V14H1.75A1.75 1.75 0 0 1 0 12.25v-9.5C0 1.784.784 1 1.75 1ZM1.5 2.75v9.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 .75.75v1.557l2.582-1.936a.75.75 0 0 1 .45-.15h5.718a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z" />
          </svg>
        </button>
        <button
          className="no-drag p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-amber)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={(e) => {
            e.stopPropagation()
            archiveItem(item.id)
          }}
          title="Archive"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v2c0 .698-.409 1.3-1 1.582v6.918A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V6.332A1.75 1.75 0 0 1 0 4.75v-2C0 1.784.784 1 1.75 1ZM1.5 2.75v2c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Zm1 3.75v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V6.5Zm4 1.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" />
          </svg>
        </button>
      </div>

      {/* Drag handle — opacity-reveal */}
      <div
        className="no-drag cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-default"
        style={{ opacity: hovered && !editing ? 1 : 0, pointerEvents: hovered && !editing ? 'auto' : 'none' }}
        {...attributes}
        {...listeners}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2" r="1.5" />
          <circle cx="7" cy="2" r="1.5" />
          <circle cx="3" cy="7" r="1.5" />
          <circle cx="7" cy="7" r="1.5" />
          <circle cx="3" cy="12" r="1.5" />
          <circle cx="7" cy="12" r="1.5" />
        </svg>
      </div>
    </motion.div>
  )
}
