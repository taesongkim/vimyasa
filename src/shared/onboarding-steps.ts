// Onboarding tour data — single source of truth for the step machine.
// Body content (the rich JSX inside each callout) lives in the renderer at
// src/renderer/src/components/Onboarding/step-bodies.tsx, looked up by id.
// The metadata here is shared between main and renderer (no JSX), so this
// file can be imported from either side without bringing React into the
// main-process bundle.

export type Anchor =
  | 'above-quickadd'
  | 'right-of-list'
  | 'below-tray'
  | 'centered'

// What user action signals "step complete" and triggers auto-advance.
// `null` means the step is Next-driven (user clicks the Next button).
export type SuccessAction =
  | 'press-summon' // ⌘⇧; — opens the QuickAdd window (step 01)
  | 'add-3-items' // 3 successful Enter submits in QuickAdd (step 01·)
  | 'press-list' // ⌘⇧L — opens the first list window (step 02)
  | 'click-tray' // user clicks the tray icon (step 03)
  | null

// Which window the callout is positioning itself relative to. 'none' means
// no host yet (we use a fallback rect so the callout is visible while the
// user is being instructed to summon the host).
export type HostWindow = 'quickadd' | 'list' | 'tray' | 'none'

export interface OnboardingStep {
  /** Stable string id; matches keys in the renderer's step-bodies map. */
  id: string
  /** Numbered step (1..6). 0 for the welcome screen. Sub-steps share their
   *  parent's number — both `capture` and `capture-add` are step 1. */
  step: number
  /** Welcome screen has special chrome: no progress dots, no "X / 06"
   *  counter, Skip + Start Tour buttons in the footer instead of the X. */
  welcome?: boolean
  /** Sub-step shares its parent's progress dot — the dot does not advance
   *  between primary and sub. Marker also affects the back-button target. */
  subStep?: boolean
  /** Short label rendered in the counter line ("01 / 06 · CAPTURE"). */
  label: string
  /** Main heading at the top of the callout. */
  title: string
  hostWindow: HostWindow
  anchor: Anchor
  /** Optional gray hint line under the body — describes the auto-advance
   *  condition ("Press ⌘⇧; to continue", "Add 3 items to continue
   *  automatically"). Null when the step is Next-driven and there's
   *  nothing to wait for. */
  autoAdvanceHint: string | null
  successAction: SuccessAction
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    step: 0,
    welcome: true,
    label: 'WELCOME',
    title: 'Welcome to Vimyasa!',
    hostWindow: 'none',
    anchor: 'centered',
    autoAdvanceHint: null,
    successAction: null
  },
  {
    id: 'capture',
    step: 1,
    label: 'CAPTURE',
    title: 'The Entry Form is your new best friend',
    hostWindow: 'none',
    anchor: 'above-quickadd',
    autoAdvanceHint: 'Press ⌘⇧; to continue',
    successAction: 'press-summon'
  },
  {
    id: 'capture-add',
    step: 1,
    subStep: true,
    label: 'CAPTURE',
    title: 'Great. Capture any stray thought here.',
    hostWindow: 'quickadd',
    anchor: 'above-quickadd',
    autoAdvanceHint: 'Add 3 items to continue automatically',
    successAction: 'add-3-items'
  },
  {
    id: 'navigate',
    step: 2,
    label: 'NAVIGATE',
    title: 'Open your list',
    hostWindow: 'none',
    anchor: 'right-of-list',
    autoAdvanceHint: 'Press ⌘⇧L to continue',
    successAction: 'press-list'
  },
  {
    id: 'navigate-actions',
    step: 2,
    subStep: true,
    label: 'NAVIGATE',
    title:
      'All regular actions can be done here without lifting your hands to use your mouse.',
    hostWindow: 'list',
    anchor: 'right-of-list',
    autoAdvanceHint: null,
    successAction: null
  },
  {
    id: 'tray',
    step: 3,
    label: 'TRAY',
    title: 'Find your settings in the tray icon',
    hostWindow: 'tray',
    anchor: 'below-tray',
    autoAdvanceHint: 'Click the tray icon to continue',
    successAction: 'click-tray'
  },
  {
    id: 'lists',
    step: 4,
    label: 'MULTIPLE LISTS',
    title: '(Optional now) Add additional lists via the menu bar.',
    hostWindow: 'none',
    anchor: 'centered',
    autoAdvanceHint: null,
    successAction: null
  },
  {
    id: 'escape',
    step: 5,
    label: 'ESCAPE HATCH',
    title: 'Use ESC as a back or exit button',
    hostWindow: 'none',
    anchor: 'centered',
    autoAdvanceHint: null,
    successAction: null
  },
  {
    id: 'done',
    step: 6,
    label: "YOU'RE SET",
    title: "That's it! Hope you enjoy ♡",
    hostWindow: 'none',
    anchor: 'centered',
    autoAdvanceHint: null,
    successAction: null
  }
]

/** Steps that get a numbered progress dot and counter. Excludes welcome
 *  (special chrome) and sub-steps (share their parent's dot). */
export const MAIN_STEPS: OnboardingStep[] = ONBOARDING_STEPS.filter(
  (s) => !s.subStep && !s.welcome
)
export const TOTAL_MAIN = MAIN_STEPS.length // 6

export function getStepById(id: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.id === id)
}

export function getNextStepId(currentId: string): string | null {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === currentId)
  if (idx === -1 || idx === ONBOARDING_STEPS.length - 1) return null
  return ONBOARDING_STEPS[idx + 1].id
}

export function getPrevStepId(currentId: string): string | null {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === currentId)
  if (idx <= 0) return null
  return ONBOARDING_STEPS[idx - 1].id
}

/** Bump when the step structure or copy changes meaningfully — forces the
 *  tour to re-trigger for users who already saw the previous version. */
export const ONBOARDING_VERSION = 1
