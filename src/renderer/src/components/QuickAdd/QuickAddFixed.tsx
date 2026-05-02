import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useSubmitAnimation } from '../../hooks/useSubmitAnimation'
import { GlowSurface } from '../shared/GlowSurface'

export function QuickAddFixed({ listId: initialListId }: { listId: string }) {
  const { lists, addItem } = useStore()
  const [text, setText] = useState('')
  const [selectedListId, setSelectedListId] = useState(initialListId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedList = lists.find((l) => l.id === selectedListId)

  // TODO: source this from settings once the settings UI exists.
  const submitAnim = useSubmitAnimation('white-glow')

  // Form-level exit phase that runs after the white-glow confirmation is
  // done, before the window actually closes. The form translates upward
  // and fades to opacity 0; the still-glowing input fades with it for a
  // "released upward" feel. Distinct concern from the in-form confirmation
  // animation above, so kept separate from useSubmitAnimation.
  const [exiting, setExiting] = useState(false)
  const EXIT_DURATION_MS = 150
  const EXIT_OFFSET_PX = 4

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // If the targeted list is deleted while this form is open, the dropdown
  // can no longer point at anything sensible. Close the window so the user
  // is dropped back into their previous context. Skip during initial
  // hydration so we don't close on first mount before the store populates.
  useEffect(() => {
    if (lists.length > 0 && !lists.some((l) => l.id === selectedListId)) {
      window.api.closeWindow()
    }
  }, [lists, selectedListId])

  // Track whether the onboarding tour is running, so Escape can exit it
  // directly from QuickAdd (which is the focused window during step 01).
  const [tourActive, setTourActive] = useState(false)
  useEffect(() => {
    return window.api.onboarding.onState((s) => setTourActive(s.active))
  }, [])

  // Global Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (tourActive) {
          // Tour-wide Escape: exit the whole onboarding flow.
          void window.api.onboarding.close()
          return
        }
        if (dropdownOpen) {
          setDropdownOpen(false)
        } else {
          window.api.closeWindow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dropdownOpen, tourActive])

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
    if (submitAnim.isPlaying || exiting) return // guard against double-Enter while we're closing
    const trimmed = text.trim()
    if (!trimmed) return
    // Phase 1: in-form confirmation animation (input glows, siblings fade,
    // bg fades). Run in parallel with addItem so the visual signal lands
    // the instant the user hits Enter rather than after the IPC roundtrip.
    const animationPromise = submitAnim.play()
    await addItem(selectedListId, trimmed)
    await animationPromise
    // Phase 2: form slides up + fades, then we actually close the window.
    setExiting(true)
    await new Promise<void>((resolve) => setTimeout(resolve, EXIT_DURATION_MS))
    window.api.closeWindow()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1, y: 8 }}
      animate={
        exiting
          ? { opacity: 0, y: -EXIT_OFFSET_PX }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={
        exiting
          ? {
              // Decouple the two properties so the lift kicks in *during*
              // the fade rather than at the start of it. Opacity ease-out
              // drops alpha fast at the start; y ease-in delays the visual
              // motion to the back half of the same window. End state lands
              // at the same time for both.
              opacity: { duration: EXIT_DURATION_MS / 1000, ease: 'easeOut' },
              y: { duration: EXIT_DURATION_MS / 1000, ease: 'easeIn' }
            }
          : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
      }
      className={`drag-region flex flex-col justify-center h-full glass-surface px-4 py-2 gap-2 ${submitAnim.containerClassName}`}
    >
      {/* Target list selector */}
      <div data-submit-fade className="no-drag flex justify-center">
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
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 min-w-[140px] max-h-[64px] overflow-y-auto py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[rgb(19,19,19)]"
              style={{ boxShadow: 'var(--shadow-tooltip)' }}
            >
              {lists.map((list) => (
                <button
                  key={list.id}
                  className={`w-full text-left px-3 py-0.5 text-[length:var(--font-size-xs)] transition-default ${
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
      <GlowSurface surface="quickadd-input" style={{ display: 'block', width: '100%' }}>
        <input
          ref={inputRef}
          className="no-drag w-full bg-[var(--color-surface)] text-[length:var(--font-size-entry)] text-[color:var(--color-text)] placeholder-[color:var(--color-text-ghost)] px-3 py-2 rounded-[var(--radius-md)] outline-none transition-default"
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
      </GlowSurface>

      {/* Help text */}
      <div data-submit-fade className="flex justify-center">
        <span className="text-[length:10px] text-[color:var(--color-text-muted)]">
          ESC to exit | TAB to cycle target list
        </span>
      </div>
    </motion.div>
  )
}
