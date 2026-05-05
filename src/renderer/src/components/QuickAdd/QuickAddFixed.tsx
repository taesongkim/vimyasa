import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { useSubmitAnimation } from '../../hooks/useSubmitAnimation'
import { GlowSurface } from '../shared/GlowSurface'
import { getRegularLists } from '@shared/types'

export function QuickAddFixed({ listId: initialListId }: { listId: string }) {
  const { lists, addItem } = useStore()
  const [text, setText] = useState('')
  const [selectedListId, setSelectedListId] = useState(initialListId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // Quick-add never targets the hot list — it has its own dedicated
  // surface (number-0 from a list, Cmd+Shift+H global). Filter it out
  // of the dropdown options + Tab-cycle.
  const regularLists = getRegularLists(lists)
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

  // Pre-warmed window: the renderer stays alive across summons. We
  // *unmount* the form contents whenever the window is hidden — that way
  // there's nothing in the DOM to flicker visible during the brief gap
  // between win.show() and the 'quickadd:show' IPC arriving. On show,
  // motion.div mounts fresh and the fade-up animation plays cleanly.
  //
  // hiddenState starts true so the pre-warmed window has no content
  // rendered. visibilitychange flips it to true on every hide; the show
  // event flips it to false. showCount keys motion.div so each summon
  // gets a fresh mount of the form's visible tree (replays the fade-
  // up entrance). It does NOT reset useSubmitAnimation — that hook
  // lives at the component level, outside the keyed subtree, and is
  // explicitly reset via submitAnim.reset() in the show handler below.
  const [showCount, setShowCount] = useState(0)
  const [hiddenState, setHiddenState] = useState(true)
  // Mirror of `exiting` for the post-submit hide path. After the
  // await-setTimeout returns, the closure can't read live state — we read
  // this ref to detect whether a 'quickadd:show' event cancelled the
  // pending hide (by setting exiting back to false).
  const exitingRef = useRef(false)

  useEffect(() => {
    const onHidden = (): void => {
      // Window is hiding — drop content from DOM so the next show starts
      // clean. Authoritative path is the IPC from main (sent BEFORE
      // win.hide()). The visibilitychange fallback below catches any
      // edge case where main forgets / a different code path hides.
      setHiddenState(true)
      setExiting(false)
      exitingRef.current = false
    }
    const offIpc = window.api.quickAdd.onHidden(onHidden)
    const onVis = (): void => {
      if (document.hidden) onHidden()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      offIpc()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    return window.api.quickAdd.onShow((payload) => {
      // Reset form state. Runs synchronously before the next paint, so
      // when motion.div mounts (next render) it has the right listId and
      // no stale text.
      setText('')
      setSelectedListId(payload.listId || regularLists[0]?.id || initialListId)
      setDropdownOpen(false)
      setExiting(false)
      exitingRef.current = false
      // Clear any stuck submit-confirmation state from the previous
      // summon. play() intentionally doesn't auto-reset (resetting
      // mid-flow would visibly snap the faded siblings + glowing
      // input back to normal before the exit animation can hide
      // them — see useSubmitAnimation.ts). On the next summon this
      // is the natural fresh-start point.
      submitAnim.reset()
      setShowCount((c) => c + 1)
      setHiddenState(false) // re-mounts motion.div, fade-up plays
    })
  }, [lists, initialListId, submitAnim])

  // Focus on every mount via a ref callback rather than a one-shot
  // useEffect. Reason: when the user has the quickadd-input GlowSurface
  // enabled, themes hydration flips us from "children rendered bare" to
  // "<BorderBeam>children</BorderBeam>", which remounts the input — a
  // mount-time useEffect would run on the OLD instance and lose focus.
  // The ref callback fires on every (re)mount and re-applies focus.
  const handleInputRef = useCallback((el: HTMLInputElement | null) => {
    inputRef.current = el
    if (el) el.focus()
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

  // Note: Escape used to exit the onboarding tour from QuickAdd, but
  // the 'escape' step's prompt teaches users to try Esc — and they were
  // accidentally exiting the tour by following the lesson. Tour exit
  // now lives only on the callout's dismiss X.

  // Global Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (dropdownOpen) {
          setDropdownOpen(false)
        } else {
          void window.api.quickAdd.hide()
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
    if (submitAnim.isPlaying || exiting) return // guard against double-Enter while we're closing
    const trimmed = text.trim()
    if (!trimmed) return
    // Phase 1: in-form confirmation animation (input glows, siblings fade,
    // bg fades). Run in parallel with addItem so the visual signal lands
    // the instant the user hits Enter rather than after the IPC roundtrip.
    const animationPromise = submitAnim.play()
    const saved = await addItem(selectedListId, trimmed)
    // Hint to any open list window for `selectedListId`: scroll the
    // new item into view. Best-effort UX nudge — the createItem
    // broadcast has already reconciled persistence; this is purely
    // about getting the user's eye to the new row when it lands
    // outside the visible area.
    void window.api.quickAdd.notifyItemAdded(saved.id, selectedListId)
    await animationPromise
    // Phase 2: form slides up + fades, then we hide the (pre-warmed)
    // window. We mirror `exiting` into a ref so the closure can detect
    // a re-summon mid-exit (the show handler resets exitingRef.current
    // to false) and bail without hiding.
    setExiting(true)
    exitingRef.current = true
    await new Promise<void>((resolve) => setTimeout(resolve, EXIT_DURATION_MS))
    if (!exitingRef.current) return // user re-summoned during the exit fade
    void window.api.quickAdd.hide()
  }

  // While hidden, render nothing — keeps the pre-warmed window's vibrancy
  // visible without any content that could flicker on summon before the
  // show IPC arrives and remounts motion.div for the fade-up.
  if (hiddenState) return null

  return (
    <motion.div
      key={showCount}
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
              {regularLists.map((list) => (
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
          ref={handleInputRef}
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
              const idx = regularLists.findIndex((l) => l.id === selectedListId)
              if (regularLists.length === 0) return
              const nextIdx = (idx + 1) % regularLists.length
              setSelectedListId(regularLists[nextIdx].id)
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
