// Composes + posts the feedback payload to the Cloudflare Worker that
// forwards it to email via Resend. Deliberately lives in main (not
// renderer) for two reasons: (1) avoids CORS friction since Node fetch
// has no Origin header to argue with the Worker about, and (2) keeps
// the Worker URL out of the renderer's DevTools / network panel — not a
// security boundary (anyone can unpack the binary), but it reduces the
// casual attack surface for shoulder-surfers / DevTools-curious testers.
//
// See docs/proposals/feedback-messenger.md for the full design and
// infra/feedback-worker/index.js for the Worker side.

import { app } from 'electron'
import os from 'os'
import {
  canSendFeedback,
  getFeedbackConfig,
  recordFeedbackSend
} from './feedback-store'

const WORKER_URL = 'https://vimyasa-feedback.taesongkim.workers.dev'
const PROJECT_TAG = 'vimyasa'
const MESSAGE_MAX_LEN = 10_000
const REQUEST_TIMEOUT_MS = 10_000

export type FeedbackSendResult =
  | { ok: true }
  | { ok: false; code: 'invalid' | 'rate-limit' | 'network-error'; sendsToday?: number; limit?: number }

export async function submitFeedback(message: string): Promise<FeedbackSendResult> {
  const trimmed = typeof message === 'string' ? message.trim() : ''
  if (!trimmed) return { ok: false, code: 'invalid' }
  if (trimmed.length > MESSAGE_MAX_LEN) return { ok: false, code: 'invalid' }

  const can = canSendFeedback()
  if (!can.canSend) {
    return { ok: false, code: 'rate-limit', sendsToday: can.sendsToday, limit: can.limit }
  }

  const config = getFeedbackConfig()
  const body = {
    message: trimmed,
    name: config.senderName || undefined,
    projectTag: PROJECT_TAG,
    clientId: config.clientId,
    appVersion: app.getVersion(),
    os: `${process.platform} ${os.release()}`,
    locale: app.getLocale()
  }

  // AbortController guards against a hung Worker — if the network call
  // takes longer than the timeout we surface a network-error rather than
  // leaving the renderer's "Sending…" spinner up indefinitely.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (!res.ok) {
      // 4xx (bad payload) and 5xx (Worker / Resend failure) both surface
      // as network-error to the user — the distinction doesn't help them
      // and we don't want to leak Worker internals into the renderer.
      console.warn('[feedback] worker rejected', res.status)
      return { ok: false, code: 'network-error' }
    }
  } catch (err) {
    console.warn('[feedback] post failed:', err)
    return { ok: false, code: 'network-error' }
  } finally {
    clearTimeout(timer)
  }

  // Only record on success — failed sends shouldn't burn the daily quota.
  recordFeedbackSend()
  return { ok: true }
}
