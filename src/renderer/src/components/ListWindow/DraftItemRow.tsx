import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { StatusDot } from '../shared/StatusDot'
import { GlowSurface } from '../shared/GlowSurface'

// New-item creation row. Rendered at the end of the list when the user
// presses `n` or clicks "+ Add item" in the bottom toolbar. Visually
// matches an ItemRow in edit mode (status dot + textarea) so the user
// experiences a consistent edit affordance across "create" and "rename".
//
// Lifecycle:
//   - Mounted with empty text, textarea auto-focused.
//   - Save (Enter / blur with content / Tab): onSave(text).
//   - Discard (Escape / blur empty): onDiscard().
//   - Auto-scrolls itself into view on mount and on every text change so
//     the bottom of the growing textarea stays visible.
// Drag-reorder isn't supported here (not sortable) — there's no id-on-disk
// to reorder against. Drag elsewhere triggers blur on this textarea, which
// commits or discards before the drag proceeds.

function autoResizeTextarea(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

interface DraftItemRowProps {
  onSave: (text: string) => void
  onDiscard: () => void
  // Tab keypress handler. Receives current text so the parent can decide
  // save-vs-discard before whatever it does next (typically cycling to
  // another list).
  onTab: (text: string) => void
}

export function DraftItemRow({ onSave, onDiscard, onTab }: DraftItemRowProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const commit = useCallback(() => {
    const trimmed = text.trim()
    if (trimmed) {
      onSave(trimmed)
    } else {
      onDiscard()
    }
  }, [text, onSave, onDiscard])

  // Focus the textarea on mount.
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Resize before paint so the textarea's height matches its content in the
  // same frame as a text change. Same pattern as ItemRow's edit mode.
  useLayoutEffect(() => {
    autoResizeTextarea(textareaRef.current)
  }, [text])

  // Auto-scroll the row into view on mount and on every height change so
  // the user's cursor stays visible as the row grows past the scroll edge.
  // 'instant' (not 'smooth') because browser smooth-scroll defaults to
  // ~300-500ms with an ease-out curve — long enough for the user to read
  // it as a "spring" and lose the sense that the draft and the scroll are
  // a single event. Snap puts the draft in its final visual position in
  // one frame, alongside the row appearing.
  useEffect(() => {
    rowRef.current?.scrollIntoView({ block: 'end', behavior: 'instant' })
  }, [text])

  return (
    <motion.div
      ref={rowRef}
      // Match the entrance feel of new items appearing — slide in from
      // the left, fade in. No layout animation here: the draft's height
      // is governed by the textarea and we want it instant (same reason
      // as ItemRow's editing-mode layout override).
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="group flex gap-1 px-3 py-2 mx-1 rounded cursor-default bg-[var(--color-surface)] relative"
    >
      {/* `list-add-new` glow — overlay on the DraftItemRow's outer
          row container. The user's mental model is the highlight
          space of the row being created, not the textarea (see
          project_theme_merge_plan_with_pr_c memory). DraftItemRow
          only mounts while a draft is in progress, so the surface
          fires automatically during creation and tears down on
          save/discard. */}
      <GlowSurface surface="list-add-new" mode="overlay" />
      <div className="flex items-baseline gap-1 flex-1">
        <div className="-translate-y-0.5">
          <StatusDot status="active" />
        </div>
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 bg-transparent text-[length:var(--font-size-md)] text-[color:var(--color-text-primary)] outline-none resize-none overflow-hidden p-0 [overflow-wrap:anywhere]"
          style={{ lineHeight: '1.5rem' }}
          value={text}
          // Strip newlines on every change so an item never carries \n
          // even via paste. Items are single logical lines that may
          // visually wrap.
          onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Block textarea's default newline insertion; treat as save.
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              // Stop the window-level Escape handler from also firing
              // and stepping focus another rung.
              e.stopPropagation()
              e.preventDefault()
              onDiscard()
            } else if (e.key === 'Tab') {
              // Don't tab-out of the textarea (default behavior). Hand
              // off to the parent so it can save-or-discard and cycle
              // to the next list as it normally would on Tab.
              e.preventDefault()
              onTab(text.trim())
            }
          }}
        />
      </div>

      {/* Right-side icons — visible at reduced opacity during the draft
          so the user can see the actions that will become available
          once the item is saved. Non-functional here (no click
          handlers, pointer-events:none) since the item doesn't exist
          on disk yet. Same JSX shape as ItemRow's actions + drag
          handle so the textarea wraps at the same width and there's
          no horizontal jump when the draft becomes a saved ItemRow.
          Keep the SVG paths in sync with ItemRow if those icons
          change. */}
      <div
        className="flex items-center gap-1 shrink-0 transition-default"
        style={{ opacity: 0.15, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div className="p-1 text-[color:var(--color-text-muted)]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
          </svg>
        </div>
        <div className="p-1 text-[color:var(--color-text-muted)]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 14.25 14H8.061l-2.574 1.926A1.25 1.25 0 0 1 3.5 14.86V14H1.75A1.75 1.75 0 0 1 0 12.25v-9.5C0 1.784.784 1 1.75 1ZM1.5 2.75v9.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 .75.75v1.557l2.582-1.936a.75.75 0 0 1 .45-.15h5.718a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z" />
          </svg>
        </div>
        <div className="p-1 text-[color:var(--color-text-muted)]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v2c0 .698-.409 1.3-1 1.582v6.918A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V6.332A1.75 1.75 0 0 1 0 4.75v-2C0 1.784.784 1 1.75 1ZM1.5 2.75v2c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Zm1 3.75v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V6.5Zm4 1.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" />
          </svg>
        </div>
      </div>
      <div
        className="self-center text-[color:var(--color-text-muted)] transition-default"
        style={{ opacity: 0.15, pointerEvents: 'none' }}
        aria-hidden="true"
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
