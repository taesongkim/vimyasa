import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { StatusDot } from '../shared/StatusDot'
import { GlowSurface } from '../shared/GlowSurface'
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

// Resize a textarea to match its content height. The reset-then-measure
// pattern is required because scrollHeight reflects the larger of content
// and current height — without the reset to 'auto' first, the textarea
// can only grow, not shrink.
function autoResizeTextarea(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export function ItemRow({
  item,
  isFocused,
  isCarrying = false,
  sendDirection = null,
  arrivalFlash = null,
  onFocus,
  lists,
  index = 0,
  dataIndex,
  onCopyRequest,
  onEditRequest
}: {
  item: Item
  isFocused: boolean
  /** True when this row is the active carry-mode item — "picked up." */
  isCarrying?: boolean
  /** When non-null, this row is mid-send — direction encodes the slide.
   *  isCarrying should remain true throughout the send so the lifted
   *  background + shadow + z-index persist while .item-row-sending-*
   *  layers the keyframe transform on top. Routed through React (not
   *  imperative classList) because re-renders during the send would
   *  otherwise clobber an imperatively-added class. */
  sendDirection?: 'left' | 'right' | null
  /** Trigger for the cross-list arrival flash. Parent passes this only
   *  to the row whose id matches a just-arrived item; counter-keyed so
   *  repeat arrivals (same id, two moves in a row) still fire. Reuses
   *  the existing new-item save-flash visual. */
  arrivalFlash?: { itemId: string; key: number } | null
  onFocus: () => void
  lists: List[]
  index?: number
  dataIndex?: number
  onCopyRequest?: (copyFn: () => void) => void
  onEditRequest?: (editFn: () => void) => void
}) {
  const { editItem, removeItem, changeItemStatus, sendItemToList, archiveItem } = useStore()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const [hovered, setHovered] = useState(false)
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false)
  // Save-confirmation flash. The flash is rendered as an overlay sibling
  // inside the row container with a unique `key` per save event — React
  // mounts a fresh element each time, so the CSS animation runs from
  // scratch (re-adding a class to the same element wouldn't replay it).
  // onAnimationEnd unmounts the overlay. flashId === null means no flash.
  //
  // Two triggers feed setFlashId:
  //   1. New-item appearance (lazy useState init below): if this row is
  //      mounting for an item created in the last second, set an initial
  //      flashId. Catches in-list-draft commits (DraftItemRow unmounts →
  //      new ItemRow mounts) AND QuickAdd-into-this-list (IPC arrives →
  //      list re-renders → new ItemRow mounts).
  //   2. Rename commit (in commitEdit below): if the text actually
  //      changed, set a new flashId. The same row stays mounted — the
  //      keyed overlay is what makes the flash replay.
  const [flashId, setFlashId] = useState<string | null>(() => {
    const ageMs = Date.now() - new Date(item.createdAt).getTime()
    return ageMs < 1000 ? `mount-${item.id}` : null
  })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const copyFunctionRef = useRef<() => void>()

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

  // Focus + caret-at-end on edit-mode entry. The earlier select-all
  // behavior made the most common operation (append a couple of words)
  // feel destructive — the user'd type a single keystroke and watch
  // their existing text vanish. Caret-at-end matches the typical
  // "continue from where it left off" expectation; the user can still
  // ⌘A if they want a select-all. After-paint timing is fine here —
  // focus is a user-perceptible action that doesn't need to be
  // pre-paint.
  useEffect(() => {
    if (editing) {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [editing])

  // Resize the textarea to match its content. Must be useLayoutEffect, not
  // useEffect: the resize has to happen between React's commit and the
  // browser's paint, so the height update lands in the same frame as the
  // text update. With a regular useEffect, the browser paints once with
  // the new text in the old (smaller or larger) box — visible squish on
  // line growth, visible stretch on line shrink. useLayoutEffect runs
  // synchronously after commit before paint, eliminating that mid-state.
  useLayoutEffect(() => {
    if (editing) {
      autoResizeTextarea(inputRef.current)
    }
  }, [text, editing])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  // Cross-list arrival flash. Fires when the parent flags this row's
  // id as just-arrived (carry-mode send / right-click "Send to List" /
  // future drag-between-lists). Uses the same flashId mechanism the
  // new-item appearance + rename-commit paths use, so the visual is
  // identical — the user reads "this row just landed" without a new
  // bespoke effect. Counter-keyed dep ensures repeat arrivals re-fire
  // even when itemId stays the same.
  useEffect(() => {
    if (!arrivalFlash || arrivalFlash.itemId !== item.id) return
    setFlashId(`arrival-${arrivalFlash.key}`)
  }, [arrivalFlash, item.id])

  // Register copy function with parent when focused - only on focus change
  useEffect(() => {
    if (onCopyRequest && isFocused) {
      // Use a wrapper function that calls the current copy function from ref
      onCopyRequest(() => copyFunctionRef.current?.())
    }
  }, [isFocused, onCopyRequest])

  const startEditing = useCallback(() => {
    setText(item.text)
    setEditing(true)
  }, [item.text])

  // Register the edit-trigger with the parent when focused, mirroring the
  // copy-fn registration above. Lets ListWindow's context-menu handler
  // call into this row's local editing state without needing a ref map
  // or lifted state. Right-click → ItemRow.handleContextMenu calls
  // onFocus first, so by the time the menu's "Edit" action fires this
  // row is the focused one.
  useEffect(() => {
    if (onEditRequest && isFocused) {
      onEditRequest(startEditing)
    }
  }, [isFocused, onEditRequest, startEditing])

  const commitEdit = useCallback(async () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== item.text) {
      await editItem(item.id, { text: trimmed })
      // Same flash users see on QuickAdd submit + new-item appearance —
      // the row didn't unmount (rename keeps the same item.id), so we
      // mint a fresh flashId to remount the keyed overlay and replay
      // the animation. No-op if text didn't actually change.
      setFlashId(`edit-${Date.now()}`)
    }
    setEditing(false)
  }, [text, item.id, item.text, editItem])

  const cycleStatus = useCallback(() => {
    changeItemStatus(item.id, nextStatus[item.status])
  }, [item.id, item.status, changeItemStatus])

  // Centralized copy function with feedback - called from any copy trigger
  const copyItemWithFeedback = useCallback(() => {
    navigator.clipboard.writeText(item.text)
    setShowCopyConfirmation(true)

    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }

    // Hide confirmation after 400ms
    copyTimeoutRef.current = setTimeout(() => {
      setShowCopyConfirmation(false)
    }, 400)
  }, [item.text])

  // Keep ref updated with current copy function
  copyFunctionRef.current = copyItemWithFeedback

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

      // "Send to List" submenu. The hot list (when present + not the
      // source) gets pinned at the top with a divider below it — it's
      // the high-frequency target for "I'll do this today", so it's
      // worth the visual separation from the regular roster. Right-
      // clicking an item that's already in the hot list naturally has
      // no hot entry (filtered as source), so the divider doesn't
      // appear and the submenu is just the regular lists.
      const sendable = lists.filter((l) => l.id !== item.listId)
      const hotEntry = sendable.find((l) => l.kind === 'hot')
      const regularEntries = sendable.filter((l) => l.kind !== 'hot')
      const sendToSubmenu = [
        ...(hotEntry
          ? [
              {
                label: hotEntry.name,
                ipcEvent: 'context-menu-action',
                ipcData: { action: 'sendTo', itemId: item.id, listId: hotEntry.id }
              },
              { type: 'separator' as const }
            ]
          : []),
        ...regularEntries.map((l) => ({
          label: l.name,
          ipcEvent: 'context-menu-action',
          ipcData: { action: 'sendTo', itemId: item.id, listId: l.id }
        }))
      ]

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
      // Inline opacity via style + Tailwind's transition-opacity on
      // className for the fade. Do NOT switch this back to Framer's
      // animate.opacity (see history below).
      //
      // Hide the source ItemRow during active drag (opacity 0). The
      // visible representation is the ghost rendered via DragOverlay
      // in ListWindow. Hiding the source completely (rather than
      // dimming) means the slot still takes layout space (siblings
      // shift correctly during sortable preview), but nothing
      // visually competes with the ghost.
      //
      // After drop, isDragging flips false. dnd-kit's
      // dropAnimation.sideEffects (configured on the DragOverlay in
      // ListWindow) keeps the source hidden via inline opacity:0
      // throughout the drop animation, then removes the inline style
      // when the animation completes. At that point this React-driven
      // opacity (now 1, since isDragging is false) takes over and the
      // source is visible. Tight coupling between dnd-kit's drop
      // animation timing and the source's reveal — no setTimeout.
      //
      // History: previously used Framer's animate.opacity. Bug: after
      // dragging an item DOWN, Framer's opacity animation got frozen
      // at random mid-transition values and the dragged item stayed
      // dim until remount. Bisected to a Framer + dnd-kit transform
      // interaction — Framer's opacity engine clashes with dnd-kit's
      // style.transform on the same element. Inline CSS opacity is
      // unaffected, hence this approach.
      style={{ ...style, opacity: isDragging ? 0 : 1 }}
      // No `layout` prop — Framer Motion's layout system was leaving
      // stale state on surviving siblings after sequential AnimatePresence
      // exits, producing visible "frozen" rows and phantom scroll space
      // after the second+ archive on a window. The exit animation
      // (slide+fade on the archived item) still runs because it's
      // driven by `exit` below, not `layout`. Sibling reflow on
      // archive/delete now happens via natural CSS flow — items snap
      // to their new positions instead of springing. Reorder via drag
      // is still animated because @dnd-kit/sortable applies its own
      // CSS transition through the `style` prop above.
      //
      // initial={false} skips Framer's initial → animate transition
      // entirely. Items appear in their final position with no fade-in
      // and no horizontal slide — matches the in-place feel of
      // entering/exiting edit mode on an existing item.
      initial={false}
      // animate prop intentionally absent — opacity is now CSS-driven
      // via the inline style above. exit still animates because
      // AnimatePresence handles it independently of animate.
      // While sending, suppress framer's exit animation entirely. The
      // CSS keyframe owns the row's visual through unmount (forwards
      // keeps opacity:0 + visibility:hidden); letting framer also
      // animate opacity here causes the keyframe-vs-framer race that
      // produced the "flash at end position" bug — framer interpolates
      // opacity from its own tracked state (1 by default) and overrides
      // the keyframe's forwards mid-exit.
      exit={sendDirection ? undefined : { opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      // No transition-opacity class. With DragOverlay handling the
      // visual continuity (ghost smoothly snaps to target via dnd-kit's
      // drop animation), the source ItemRow's reveal at the end of the
      // drop is best as an instant pop — fading in over 150ms while
      // the ghost is mid-snap reintroduces the overlap flash we're
      // explicitly avoiding. The ghost arrives, source instantly
      // appears, all in one motion.
      className={`group flex gap-1 px-3 py-2 mx-1 rounded cursor-default bg-[var(--color-surface)] relative ${
        isFocused ? 'item-row-focused' : hovered ? 'item-row-hover' : ''
      } ${isCarrying ? 'item-row-carrying' : ''} ${
        sendDirection === 'left'
          ? 'item-row-sending-left'
          : sendDirection === 'right'
            ? 'item-row-sending-right'
            : ''
      }`}
      data-index={dataIndex}
      // Tag for useUpwardFlip in ListWindow. The hook measures these
      // elements' positions before/after each render and animates
      // upward shifts (archive, delete, editing-row-shrink).
      data-flip-id={item.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onFocus}
      onDoubleClick={startEditing}
      onContextMenu={handleContextMenu}
    >
      {/* Save-confirmation flash overlay. Mounts with a fresh key per
          flash event (new-item appearance, rename commit) so the CSS
          animation runs from scratch. Unmounts itself via onAnimationEnd.
          Renders ABOVE the list-item GlowSurface in DOM order so the
          flash visually stacks on top of the Magic Colors glow during
          the brief moment they overlap. */}
      {flashId && (
        <div
          key={flashId}
          className="absolute inset-0 pointer-events-none item-row-save-flash"
          style={{ borderRadius: 'inherit' }}
          onAnimationEnd={() => setFlashId(null)}
        />
      )}
      {/* `list-item` glow uses overlay mode so the beam runs around the
          motion.div outer edge (where the focus highlight lives) without
          inserting a wrapper div that would break dnd-kit's setNodeRef
          chain or AnimatePresence's exit animations. The overlay is a
          pointer-events:none sibling — it never intercepts clicks. */}
      <GlowSurface surface="list-item" mode="overlay" eventFilter={{ itemId: item.id }} />
      {/* `list-item-edit` glow — same row container as `list-item`, but
          gated on `editing` so it only renders during inline edit. Both
          overlays compose on top of each other (intentional layered
          behavior — the row is "highlighted" + "in edit"). The user's
          mental model is the highlight space of the item being acted on,
          not the textarea — wrap-mode around the textarea was the wrong
          abstraction (see project_theme_merge_plan_with_pr_c memory). */}
      {editing && (
        <GlowSurface surface="list-item-edit" mode="overlay" eventFilter={{ itemId: item.id }} />
      )}
      {/* Content with baseline alignment */}
      <div className="flex items-baseline gap-1 flex-1 transition-opacity duration-150"
           style={{ opacity: showCopyConfirmation ? 0.2 : 1 }}>
        {/* Status dot */}
        <div className="-translate-y-0.5">
          <StatusDot status={item.status} onClick={cycleStatus} />
        </div>

        {/* Text */}
        {editing ? (
          // Textarea (not input) so multi-line items keep their visual
          // height and wrapping during edit instead of collapsing to a
          // single horizontal line. Width/font/line-height/padding match
          // the display span so the box is byte-identical to what the
          // user sees post-edit. Auto-resizes height to content via the
          // useEffect on `text`. resize-none kills the corner handle.
          // overflow-hidden prevents an inner scrollbar (auto-resize
          // makes one unnecessary). Newlines are stripped on input so
          // an item never ends up with \n characters even via paste —
          // items are single logical lines that may visually wrap.
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent text-[length:var(--font-size-md)] text-[color:var(--color-text-primary)] outline-none resize-none overflow-hidden p-0 [overflow-wrap:anywhere]"
            style={{ lineHeight: '1.5rem' }}
            value={text}
            onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Block the textarea's default newline insertion and
                // treat Enter as save. Shift+Enter falls into the same
                // branch — we don't allow newlines either way.
                e.preventDefault()
                commitEdit()
              }
              if (e.key === 'Escape') {
                // We've handled this level (cancel without committing); don't
                // let the window-level Escape handler also run and step focus
                // back another rung.
                e.stopPropagation()
                setEditing(false)
              }
            }}
          />
        ) : (
          <span
            className={`flex-1 text-[length:var(--font-size-md)] [overflow-wrap:anywhere]`}
            style={{ opacity: statusOpacity[item.status], lineHeight: '1.5rem' }}
          >
            {item.text}
          </span>
        )}
      </div>

      {/* Hover actions — always rendered, opacity-reveal on hover.
          During edit, hold them at a slightly higher dim than the
          resting state (0.55 vs 0.3) so the user can still see them
          alongside the textarea without them competing with the focus. */}
      <div
        className="flex items-center gap-1 shrink-0 transition-default"
        style={{
          opacity: showCopyConfirmation
            ? 0.2
            : hovered && !editing
              ? 1
              : editing
                ? 0.55
                : 0.3,
          pointerEvents: hovered && !editing ? 'auto' : 'none'
        }}
      >
        <button
          className="no-drag p-1 rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={(e) => {
            e.stopPropagation()
            copyItemWithFeedback()
          }}
          title="Copy"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
          </svg>
        </button>
        <button
          className="no-drag p-1 rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-accent)] hover:bg-[var(--hover-highlight)] transition-default"
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
          className="no-drag p-1 rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-amber)] hover:bg-[var(--hover-highlight)] transition-default"
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

      {/* Drag handle — opacity-reveal. Same idea as the actions: bumped
          slightly higher during edit (0.45 vs 0.2) so the user can see
          it without it being a focal element. */}
      <div
        className="no-drag cursor-grab active:cursor-grabbing text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] transition-default self-center"
        style={{
          opacity: showCopyConfirmation
            ? 0.2
            : hovered && !editing
              ? 1
              : editing
                ? 0.45
                : 0.2,
          pointerEvents: hovered && !editing ? 'auto' : 'none'
        }}
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

      {/* Copy confirmation overlay */}
      {showCopyConfirmation && (
        <div className="absolute inset-0 rounded bg-[rgba(0,0,0,0.2)] flex items-center justify-center z-10"
             style={{
               animation: showCopyConfirmation ? 'fadeIn 150ms ease-out' : 'fadeOut 200ms ease-out'
             }}
        >
          <span className="text-[length:var(--font-size-sm)] text-white font-medium">
            Copied text to clipboard.
          </span>
        </div>
      )}
    </motion.div>
  )
}
