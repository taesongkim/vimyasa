import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

export function QuickAddWithSelect() {
  const { lists, addItem } = useStore()
  const [text, setText] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [focusOnList, setFocusOnList] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectedList = lists[selectedIndex]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || !selectedList) return
    await addItem(selectedList.id, trimmed)
    window.api.closeWindow()
  }

  const cycleList = (direction: 'up' | 'down') => {
    setSelectedIndex((i) => {
      if (direction === 'up') return i <= 0 ? lists.length - 1 : i - 1
      return i >= lists.length - 1 ? 0 : i + 1
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
      return
    }
    if (e.key === 'Escape') {
      window.api.closeWindow()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      setFocusOnList((f) => !f)
      if (!focusOnList) {
        listRefs.current[selectedIndex]?.focus()
      } else {
        inputRef.current?.focus()
      }
      return
    }
    // Cmd+Arrow to cycle lists
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
      e.preventDefault()
      cycleList('up')
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
      e.preventDefault()
      cycleList('down')
      return
    }
    // Arrow keys in list mode
    if (focusOnList) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        cycleList('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        cycleList('down')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col h-full glass-surface p-2"
      onKeyDown={handleKeyDown}
    >
      {/* Drag region */}
      <div className="drag-region h-4 shrink-0" />

      <div className="flex flex-col gap-2 pb-1 flex-1">
        {/* Input */}
        <input
          ref={inputRef}
          className="w-full bg-[var(--color-surface)] text-[var(--font-size-md)] text-[var(--color-text)] placeholder-[var(--color-text-ghost)] px-3 py-2 rounded-[var(--radius-md)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-default"
          placeholder="What needs to be done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* List selector */}
        <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
          <span className="text-[var(--font-size-micro)] text-[var(--color-text-ghost)] uppercase tracking-wider mb-1">
            Target list
          </span>
          {lists.map((list, idx) => (
            <button
              key={list.id}
              ref={(el) => { listRefs.current[idx] = el }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-left transition-default ${
                idx === selectedIndex
                  ? 'bg-[var(--active-bg)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--hover-highlight)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => setSelectedIndex(idx)}
              tabIndex={-1}
            >
              <span className="text-[var(--font-size-md)]">{list.icon}</span>
              <span className="text-[var(--font-size-sm)] font-medium truncate">{list.name}</span>
            </button>
          ))}
        </div>

        {/* Hints */}
        <div className="flex items-center justify-between text-[var(--font-size-micro)] text-[var(--color-text-ghost)]">
          <span>⌘↑↓ switch list</span>
          <span>Tab to navigate</span>
          <span>Enter to add</span>
        </div>
      </div>
    </motion.div>
  )
}
