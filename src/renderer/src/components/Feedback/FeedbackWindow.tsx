import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useSubmitAnimation } from '../../hooks/useSubmitAnimation'
import { useInputGlowActive } from '../../hooks/useInputGlowActive'
import { GlowSurface } from '../shared/GlowSurface'
import type { FeedbackConfig } from '../../../../shared/types'

// Mirror of QuickAddFixed's entrance + exit choreography,
// adapted for a multiline message + Send button + three-state result
// flow (success / rate-limit / network-error). Borrows the same
// hidden-state DOM unmount + showCount keying so the persistent window
// has nothing in the DOM to flicker between win.show() and 'feedback:show'
// arriving. See QuickAddFixed.tsx for the canonical comments on each
// pattern; only the feedback-specific deviations are commented here.

type SendStatus = 'idle' | 'sending' | 'success' | 'limit' | 'error'

const EXIT_DURATION_MS = 150
const EXIT_OFFSET_PX = 4
const SUCCESS_HOLD_MS = 750
const DEV_EMAIL = 'justin@taesongkim.com'
const MESSAGE_MAX_LEN = 10_000

export function FeedbackWindow() {
  const [config, setConfig] = useState<FeedbackConfig | null>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<SendStatus>('idle')
  const [limitInfo, setLimitInfo] = useState<{ sendsToday: number; limit: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputGlow = useInputGlowActive()
  const submitAnim = useSubmitAnimation('white-glow')

  const [exiting, setExiting] = useState(false)
  const [showCount, setShowCount] = useState(0)
  const [hiddenState, setHiddenState] = useState(false)
  const exitingRef = useRef(false)
  // Latest status the success-hide closure should compare against — using
  // a ref because the setTimeout closure captures the status value at
  // the moment it was scheduled, which is stale by the time it fires.
  const statusRef = useRef<SendStatus>('idle')
  statusRef.current = status

  // Refresh persisted config (header copy + clientId) on every summon.
  // Cheap IPC; ensures a Settings → Feedback name change between
  // summons is reflected without a window restart.
  const refreshConfig = useCallback(() => {
    void window.api.feedback.getConfig().then((c) => setConfig(c))
  }, [])

  // First summon creates this window in the user's current Space rather
  // than at app launch. Load the config on that initial mount; later
  // summons also refresh it through the existing show event below.
  useEffect(() => {
    refreshConfig()
  }, [refreshConfig])

  useEffect(() => {
    const onHidden = (): void => {
      setHiddenState(true)
      setExiting(false)
      exitingRef.current = false
    }
    const offIpc = window.api.feedback.onHidden(onHidden)
    return () => {
      offIpc()
    }
  }, [])

  useEffect(() => {
    return window.api.feedback.onShow(() => {
      // Fresh summon: clear text, clear result state, replay entrance.
      setText('')
      setStatus('idle')
      setLimitInfo(null)
      setExiting(false)
      exitingRef.current = false
      submitAnim.reset()
      refreshConfig()
      setShowCount((c) => c + 1)
      setHiddenState(false)
    })
  }, [refreshConfig, submitAnim])

  // Same focus-on-mount-via-ref pattern QuickAddFixed uses — protects
  // against any future GlowSurface wrap that would remount the textarea.
  const handleTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    textareaRef.current = el
    if (el) el.focus()
  }, [])

  // Esc closes the window (or, in result-overlay states, dismisses the
  // overlay first so the user can edit + retry without losing context).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (status === 'limit' || status === 'error') {
        setStatus('idle')
        // Refocus the textarea on next tick — by the time React re-renders
        // the input back into the DOM, the ref callback fires and grabs focus.
        return
      }
      void window.api.feedback.hide()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status])

  const handleSend = async () => {
    if (status !== 'idle') return
    const trimmed = text.trim()
    if (!trimmed) return

    setStatus('sending')
    // Run the submit confirmation animation in parallel with the POST so
    // the visual signal lands the instant the user commits, rather than
    // after the network round-trip.
    const animationPromise = submitAnim.play()
    const result = await window.api.feedback.send(trimmed)
    await animationPromise

    if (result.ok) {
      setStatus('success')
      // Hold the success copy for 1.5s, then run the exit animation and
      // hide. Mirror exitingRef so a re-summon mid-hold can cancel.
      await new Promise<void>((resolve) => setTimeout(resolve, SUCCESS_HOLD_MS))
      if (statusRef.current !== 'success') return
      setExiting(true)
      exitingRef.current = true
      await new Promise<void>((resolve) => setTimeout(resolve, EXIT_DURATION_MS))
      if (!exitingRef.current) return
      void window.api.feedback.hide()
      return
    }

    // Failure paths preserve the typed message and surface a notice that
    // the user can dismiss + retry from. submitAnim.reset() returns the
    // visible UI to its idle look so the notice isn't fighting a stuck
    // glow underneath it.
    submitAnim.reset()
    if (result.code === 'rate-limit') {
      setLimitInfo({
        sendsToday: result.sendsToday ?? 0,
        limit: result.limit ?? 0
      })
      setStatus('limit')
    } else {
      // 'invalid' shouldn't happen given the trim+empty guard above; if it
      // does (e.g. message > 10k) we surface as a generic error so the
      // user gets the same dismiss-and-retry affordance.
      setStatus('error')
    }
  }

  if (hiddenState) return null

  // Header line: "Note to Justin" plus a sender-identity suffix so the
  // user can see at a glance whether they're sending anonymously or
  // attaching their name (set in Settings → Feedback). The suffix's
  // identity word ("<name>" or "anonymously") is a click target that
  // jumps to Settings → Feedback so the user can change it without
  // hunting through menus.
  const senderName = config?.senderName ?? ''
  const openFeedbackSettings = (): void => {
    void window.api.openSettings('feedback')
    void window.api.feedback.hide()
  }

  // Limit notice copy is templated against the actual configured limit so
  // the number stays accurate if the user tweaks it in Settings. The
  // "Settings/Feedback" phrase is an inline button so the user can jump
  // straight to the daily-limit input rather than hunting for it.
  const limitCopy = limitInfo ? (
    <>
      Damn okay, over-achiever — you hit the {limitInfo.limit}-message daily
      limit (I had to put a cap on this to prevent spam attacks). The limit
      resets at midnight your time. If it&apos;s urgent, adjust your personal
      limits in{' '}
      <button
        type="button"
        onClick={openFeedbackSettings}
        className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] underline transition-default cursor-pointer"
      >
        Settings/Feedback
      </button>
      .
    </>
  ) : null
  const errorCopy = `Send failed (network error). Try again in a minute. If it keeps failing, hit me up at ${DEV_EMAIL}. Thanks!`

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
              opacity: { duration: EXIT_DURATION_MS / 1000, ease: 'easeOut' },
              y: { duration: EXIT_DURATION_MS / 1000, ease: 'easeIn' }
            }
          : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
      }
      className={`drag-region flex flex-col h-full glass-surface px-4 py-4 gap-2 ${submitAnim.containerClassName}`}
    >
      {/* Header — sender label is a hover-link to Settings → Feedback so
          the user can rename / un-anonymize without leaving the flow. */}
      <div data-submit-fade className="no-drag flex justify-center">
        <div className="text-[length:var(--font-size-md)] font-medium flex items-center gap-2">
          <JkMailIcon />
          <span className="text-[color:var(--color-text-primary)]">Note to Justin</span>
          <span className="text-[color:var(--color-text-muted)]"> | Sending as </span>
          <button
            type="button"
            onClick={openFeedbackSettings}
            className={`no-drag text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:underline transition-default cursor-pointer ${
              // When it's "Anonymous" the word doesn't read as a name, so
              // a default underline signals click-ability up front. With
              // a real name set, the hover underline is enough.
              senderName ? '' : 'underline'
            }`}
          >
            {senderName || 'Anonymous'}
          </button>
        </div>
      </div>

      {/* Body — input OR success/limit/error overlay */}
      {status === 'success' ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[length:var(--font-size-md)] text-[color:var(--color-text-primary)] font-medium">
            Message sent. Thanks!
          </span>
        </div>
      ) : status === 'limit' || status === 'error' ? (
        <NoticeOverlay
          message={status === 'limit' ? limitCopy : errorCopy}
          typedMessage={text}
          // Rate-limit users have a self-service fix (Settings link is
          // already inline in the copy), so the email fallback is dropped.
          // Network-error users have no self-service fix, so the email
          // fallback stays.
          showCopyEmail={status === 'error'}
          onDismiss={() => setStatus('idle')}
        />
      ) : (
        // GlowSurface wraps the textarea so it can participate in Theme 1
        // (mirror of QuickAddFixed's quickadd-input). The wrapper is itself
        // a flex item (flex-1 min-h-0) and a flex container (display:flex)
        // so the textarea's `flex-1` keeps working when wrapped — without
        // these, BorderBeam's plain div would short-circuit the flex chain
        // and the textarea would collapse.
        <GlowSurface
          surface="feedback-input"
          active={inputGlow.isActive}
          className="flex-1 min-h-0"
          style={{ display: 'flex', width: '100%' }}
        >
          <textarea
            ref={handleTextareaRef}
            value={text}
            maxLength={MESSAGE_MAX_LEN}
            placeholder="Type a quick note…"
            disabled={status !== 'idle'}
            onFocus={inputGlow.onFocus}
            onBlur={inputGlow.onBlur}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Cmd+Enter / Ctrl+Enter sends. Plain Enter inserts a newline
              // (textarea default) — important for multi-paragraph notes.
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void handleSend()
              }
            }}
            className="no-drag flex-1 w-full resize-none bg-[var(--color-surface)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-primary)] placeholder-[color:var(--color-text-ghost)] px-3 py-2 rounded-[var(--radius-md)] outline-none transition-default"
          />
        </GlowSurface>
      )}

      {/* Footer: personal message + send button. Always mounted so the
          success body has equal slack above and below (otherwise the
          success message visually drifts below true center). The Send
          button is hidden in non-idle states; the personal message
          stays as a constant signoff through every state. */}
      <div data-submit-fade className="no-drag flex items-center justify-between gap-2 min-h-[24px]">
        <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)]">
          Thanks for your feedback, guys ♡ J
        </span>
        {status === 'idle' || status === 'sending' ? (
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={status !== 'idle' || text.trim().length === 0}
            className="no-drag px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send / ⌘↵
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}

// JK envelope mark — inlined from `vimyasa support/jk-icon-mail.svg` so
// it bundles without an asset import and inherits color from the parent
// via currentColor. Sized to sit just below the title's cap height.
function JkMailIcon() {
  return (
    <svg
      width="14"
      height="9"
      viewBox="0 0 228 151"
      fill="currentColor"
      aria-hidden="true"
      className="text-[color:var(--color-text-primary)] flex-shrink-0"
      style={{ transform: 'rotate(-18deg)' }}
    >
      <path d="M61.63,72.48L3.76,131.86c-1.34,1.37-3.67.43-3.67-1.49V22.74c0-1.81,2.12-2.81,3.51-1.64l57.87,48.25c.96.8,1.03,2.24.16,3.14Z" />
      <path d="M227.32,21.34v110.72c0,1.92-2.33,2.87-3.67,1.49l-59.53-61.09c-.87-.89-.8-2.34.16-3.14l59.53-49.63c1.39-1.16,3.51-.17,3.51,1.64Z" />
      <path d="M207.07,150.45H18.69c-1.89,0-2.85-2.28-1.53-3.63l60.14-61.71c.78-.8,2.04-.87,2.9-.15l19.72,16.45,11.58,9.65c.79.66,1.95.66,2.74,0l31.32-26.11c.86-.72,2.12-.65,2.9.15l60.14,61.72c1.32,1.36.36,3.63-1.53,3.63Z" />
      <path d="M209.93.27c2,0,2.91,2.5,1.37,3.78l-62.81,52.36-15.42,12.87-20.06,16.72-.13.11-20.17-16.82-15.43-12.87L14.45,4.06c-1.54-1.28-.63-3.78,1.37-3.78h194.11Z" />
    </svg>
  )
}

// Inline notice for limit + error states. Replaces the textarea body
// with the relevant copy + clipboard helpers — the typed message is held
// in the parent's `text` state and survives this re-render, so dismissing
// (Esc or button) returns the user to a textarea that still has their
// draft. Copy buttons exist so a tester whose send is blocked or failing
// can paste their message into the dev's email instead.
function NoticeOverlay({
  message,
  typedMessage,
  showCopyEmail,
  onDismiss
}: {
  message: ReactNode
  typedMessage: string
  showCopyEmail: boolean
  onDismiss: () => void
}) {
  const [copiedField, setCopiedField] = useState<'email' | 'message' | null>(null)

  const copyTo = async (field: 'email' | 'message') => {
    const value = field === 'email' ? DEV_EMAIL : typedMessage
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div className="no-drag flex-1 flex flex-col gap-2 justify-between py-1 min-h-0">
      <p className="text-[length:11px] leading-snug text-[color:var(--color-text-secondary)] overflow-y-auto">
        {message}
      </p>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => void copyTo('message')}
          disabled={!typedMessage.trim()}
          className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)] transition-default disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedField === 'message' ? 'Copied!' : 'Copy your message'}
        </button>
        {showCopyEmail && (
          <button
            type="button"
            onClick={() => void copyTo('email')}
            className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)] transition-default"
          >
            {copiedField === 'email' ? 'Copied!' : 'Copy email'}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)] transition-default"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
