import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

export function QuickAddFixed({ listId }: { listId: string }) {
  const { lists, addItem } = useStore()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const list = lists.find((l) => l.id === listId)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    await addItem(listId, trimmed)
    window.api.closeWindow()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="flex flex-col h-full"
    >
      {/* Drag region */}
      <div className="drag-region h-6 shrink-0" />

      <div className="flex flex-col gap-3 px-4 pb-4 flex-1">
        {/* Target list label */}
        <div className="flex items-center gap-2">
          <span className="text-sm">{list?.icon || '📋'}</span>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            Add to {list?.name || 'Unknown'}
          </span>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          className="w-full bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] px-3 py-2.5 rounded-lg outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-colors"
          placeholder="What needs to be done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
            if (e.key === 'Escape') {
              window.api.closeWindow()
            }
          }}
        />

        {/* Hint */}
        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-dim)]">
          <span>Enter to add</span>
          <span>Esc to close</span>
        </div>
      </div>
    </motion.div>
  )
}
