import { useEffect, useState } from 'react'
import type { FeedbackConfig } from '../../../../shared/types'

// PR 1 of the feedback messenger: visible UI is just the two settings.
// PR 2 builds the send window. Until then this tab is the only sign the
// feature exists. See docs/proposals/feedback-messenger.md.

const DAILY_LIMIT_MIN = 1
const DAILY_LIMIT_MAX = 1000
const SENDER_NAME_MAX_LEN = 100

export function FeedbackTab() {
  const [config, setConfig] = useState<FeedbackConfig | null>(null)
  // Local input state so typing doesn't fight the persisted value on
  // every keystroke. We only push to main onBlur / on commit.
  const [nameDraft, setNameDraft] = useState('')
  const [limitDraft, setLimitDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    window.api.feedback.getConfig().then((c) => {
      if (cancelled) return
      setConfig(c)
      setNameDraft(c.senderName)
      setLimitDraft(String(c.dailyLimit))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const commitName = async () => {
    if (!config) return
    const next = nameDraft.trim().slice(0, SENDER_NAME_MAX_LEN)
    if (next === config.senderName) return
    const updated = await window.api.feedback.setConfig({ senderName: next })
    setConfig(updated)
    setNameDraft(updated.senderName)
  }

  const commitLimit = async () => {
    if (!config) return
    const parsed = Number(limitDraft)
    // Reject NaN / non-finite — fall back to the persisted value rather
    // than blowing away the user's setting because they typed garbage.
    if (!Number.isFinite(parsed)) {
      setLimitDraft(String(config.dailyLimit))
      return
    }
    const clamped = Math.max(DAILY_LIMIT_MIN, Math.min(DAILY_LIMIT_MAX, Math.round(parsed)))
    if (clamped === config.dailyLimit) {
      setLimitDraft(String(clamped))
      return
    }
    const updated = await window.api.feedback.setConfig({ dailyLimit: clamped })
    setConfig(updated)
    setLimitDraft(String(updated.dailyLimit))
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      {/* Intro */}
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-base)] font-medium">Feedback</div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          Send a quick note straight to the dev. The send window arrives in a
          later update — these settings configure it ahead of time.
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Sender name */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="feedback-sender-name"
          className="text-[length:var(--font-size-base)] font-medium"
        >
          Your name (optional)
        </label>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          Attached to every message you send. Leave blank to stay anonymous.
        </div>
        <input
          id="feedback-sender-name"
          type="text"
          value={nameDraft}
          maxLength={SENDER_NAME_MAX_LEN}
          placeholder="Anonymous"
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="mt-1 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text)] text-[length:var(--font-size-sm)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Daily limit */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor="feedback-daily-limit"
            className="text-[length:var(--font-size-base)] font-medium"
          >
            Daily limit
          </label>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Max messages per 24 hours. Anti-spam guard rail; bump it if you
            want to fire off more.
          </div>
        </div>
        <input
          id="feedback-daily-limit"
          type="number"
          min={DAILY_LIMIT_MIN}
          max={DAILY_LIMIT_MAX}
          step={1}
          value={limitDraft}
          onChange={(e) => setLimitDraft(e.target.value)}
          onBlur={commitLimit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="w-20 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text)] text-[length:var(--font-size-sm)] text-right focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>
    </div>
  )
}
