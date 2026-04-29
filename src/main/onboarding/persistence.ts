import Store from 'electron-store'
import { ONBOARDING_VERSION } from '../../shared/onboarding-steps'

interface OnboardingPersistedState {
  /** ISO timestamp the user finished or dismissed the tour. Null = never. */
  completedAt: string | null
  /** Last step the user was on; reserved for future "resume mid-flight"
   *  feature. Not used in v1 — we always start at welcome. */
  lastStepId: string | null
  /** Schema/version stamp; tour is re-triggered when this falls behind
   *  ONBOARDING_VERSION (bumped when steps change meaningfully). */
  version: number
}

// Separate from the main app data store. Keeps onboarding metadata out of
// the user's content file so we can change persistence shape independently.
const store = new Store<OnboardingPersistedState>({
  name: 'onboarding',
  defaults: {
    completedAt: null,
    lastStepId: null,
    version: ONBOARDING_VERSION
  }
})

export const persistence = {
  read(): OnboardingPersistedState {
    return {
      completedAt: store.get('completedAt'),
      lastStepId: store.get('lastStepId'),
      version: store.get('version')
    }
  },

  /** True if the tour should run on launch (never completed, or completed
   *  against an older version). */
  needsTour(): boolean {
    const completedAt = store.get('completedAt')
    const version = store.get('version')
    return completedAt === null || version !== ONBOARDING_VERSION
  },

  /** Stamp completion. Used both for natural finish and for any dismiss
   *  (Skip on welcome, X mid-tour) — once seen, don't re-prompt. */
  markComplete(): void {
    store.set('completedAt', new Date().toISOString())
    store.set('lastStepId', null)
    store.set('version', ONBOARDING_VERSION)
  },

  /** Wipe completion so the tour runs again on next start(). Used by the
   *  tray's "Replay onboarding tour" item. */
  reset(): void {
    store.set('completedAt', null)
    store.set('lastStepId', null)
    store.set('version', ONBOARDING_VERSION)
  },

  recordStep(stepId: string): void {
    store.set('lastStepId', stepId)
  }
}
