// Persistence for the in-app feedback messenger. Kept in its own
// electron-store file (separate from `data` and `themes`) so wiping
// feedback metadata never risks user lists or theme configuration, and
// so its schema can evolve independently. PR 2 will add the send flow
// and consume `canSend` / `recordSend`.
//
// See docs/proposals/feedback-messenger.md for the full design.

import Store from 'electron-store'
import { v4 as uuid } from 'uuid'
import type { FeedbackCanSendResult, FeedbackConfig } from '../shared/types'

interface FeedbackStoreSchema {
  schemaVersion: number
  clientId: string
  senderName: string
  dailyLimit: number
  // Rolling window of POSIX-ms send timestamps. Pruned to the last 24h
  // on every read/write so it never grows unbounded.
  sentTimestamps: number[]
}

const DEFAULT_DAILY_LIMIT = 30
const SENDER_NAME_MAX_LEN = 100
const DAILY_LIMIT_MIN = 1
const DAILY_LIMIT_MAX = 1000
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000

const defaults: FeedbackStoreSchema = {
  schemaVersion: 1,
  clientId: '',
  senderName: '',
  dailyLimit: DEFAULT_DAILY_LIMIT,
  sentTimestamps: []
}

const store = new Store<FeedbackStoreSchema>({
  name: 'feedback',
  defaults
})

/** Return the client UUID, generating + persisting one on first read.
 *  Opaque to the user; sent with every feedback POST so the dev can
 *  spot floods without learning anything PII. */
function getOrCreateClientId(): string {
  const existing = store.get('clientId')
  if (existing && typeof existing === 'string' && existing.length > 0) {
    return existing
  }
  const fresh = uuid()
  store.set('clientId', fresh)
  return fresh
}

function clampDailyLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_DAILY_LIMIT
  }
  const rounded = Math.round(value)
  if (rounded < DAILY_LIMIT_MIN) return DAILY_LIMIT_MIN
  if (rounded > DAILY_LIMIT_MAX) return DAILY_LIMIT_MAX
  return rounded
}

function clampSenderName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, SENDER_NAME_MAX_LEN)
}

/** Drop timestamps older than the rolling window. Mutates and persists.
 *  The 24h prune window keeps the buffer bounded; the actual quota check
 *  uses today's-local-midnight (see countSendsToday) so the user-facing
 *  copy ("limit resets at midnight your time") matches behavior. */
function pruneTimestamps(): number[] {
  const cutoff = Date.now() - ROLLING_WINDOW_MS
  const raw = store.get('sentTimestamps')
  const arr = Array.isArray(raw) ? raw.filter((t) => typeof t === 'number' && t >= cutoff) : []
  if (!Array.isArray(raw) || arr.length !== raw.length) {
    store.set('sentTimestamps', arr)
  }
  return arr
}

function todaysLocalMidnight(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function countSendsToday(timestamps: number[]): number {
  const cutoff = todaysLocalMidnight()
  return timestamps.filter((t) => t >= cutoff).length
}

export function getFeedbackConfig(): FeedbackConfig {
  return {
    clientId: getOrCreateClientId(),
    senderName: clampSenderName(store.get('senderName')),
    dailyLimit: clampDailyLimit(store.get('dailyLimit'))
  }
}

export function setFeedbackConfig(
  updates: Partial<Pick<FeedbackConfig, 'senderName' | 'dailyLimit'>>
): FeedbackConfig {
  if (updates.senderName !== undefined) {
    store.set('senderName', clampSenderName(updates.senderName))
  }
  if (updates.dailyLimit !== undefined) {
    store.set('dailyLimit', clampDailyLimit(updates.dailyLimit))
  }
  return getFeedbackConfig()
}

export function canSendFeedback(): FeedbackCanSendResult {
  const limit = clampDailyLimit(store.get('dailyLimit'))
  const sendsToday = countSendsToday(pruneTimestamps())
  return {
    canSend: sendsToday < limit,
    sendsToday,
    limit
  }
}

/** Record a successful send. Caller (PR 2) invokes this only after the
 *  Worker POST resolves OK, so failed sends don't burn the daily quota. */
export function recordFeedbackSend(): void {
  const pruned = pruneTimestamps()
  store.set('sentTimestamps', [...pruned, Date.now()])
}
