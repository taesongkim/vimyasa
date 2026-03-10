import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'

export function QuickAddFixed({ listId: initialListId }: { listId: string }) {
  const { lists, addItem } = useStore()
  const [text, setText] = useState('')
  const [selectedListId, setSelectedListId] = useState(initialListId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedList = lists.find((l) => l.id === selectedListId)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Global Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (dropdownOpen) {
          setDropdownOpen(false)
        } else {
          window.api.closeWindow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dropdownOpen])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    await addItem(selectedListId, trimmed)
    window.api.closeWindow()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="drag-region flex flex-col justify-center h-full glass-surface px-4 py-2 gap-2"
    >
      {/* Target list selector */}
      <div className="no-drag flex justify-center">
        <div ref={dropdownRef} className="relative inline-block">
          <button
            className="flex items-center gap-1.5 text-[length:var(--font-size-md)] font-medium cursor-pointer transition-default hover:opacity-80"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="text-[color:var(--color-text-muted)]">Add to</span>
            <span className="text-[color:var(--color-text)]">{selectedList?.name || 'Unknown'}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[color:var(--color-text)] mt-px">
              <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 min-w-[140px] max-h-[45px] overflow-y-auto py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[rgb(19,19,19)]"
              style={{ boxShadow: 'var(--shadow-tooltip)' }}
            >
              {lists.map((list) => (
                <button
                  key={list.id}
                  className={`w-full text-left px-3 py-1.5 text-[length:var(--font-size-xs)] transition-default ${
                    list.id === selectedListId
                      ? 'text-[color:var(--color-accent)]'
                      : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)]'
                  }`}
                  onClick={() => {
                    setSelectedListId(list.id)
                    setDropdownOpen(false)
                    inputRef.current?.focus()
                  }}
                >
                  {list.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        className="no-drag w-full bg-[var(--color-surface)] text-[length:var(--font-size-entry)] text-[color:var(--color-text)] placeholder-[color:var(--color-text-ghost)] px-3 py-2 rounded-[var(--radius-md)] outline-none border border-[var(--color-border)] transition-default"
        placeholder=""
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
          if (e.key === 'Tab') {
            e.preventDefault()
            const idx = lists.findIndex((l) => l.id === selectedListId)
            const nextIdx = (idx + 1) % lists.length
            setSelectedListId(lists[nextIdx].id)
          }
        }}
      />
    </motion.div>
  )
}
