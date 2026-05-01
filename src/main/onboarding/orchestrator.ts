import { BrowserWindow, type Rectangle } from 'electron'
import {
  ONBOARDING_STEPS,
  TOTAL_MAIN,
  getStepById,
  getNextStepId,
  getPrevStepId,
  type OnboardingStep
} from '../../shared/onboarding-steps'
import { CalloutWindow } from './callout-window'
import { DimOverlay } from './dim-overlay'
import { persistence } from './persistence'

// Pause between detecting a success action and advancing the callout.
// Long enough that the user sees their action register (e.g. the form
// opening, the item adding) before the tour moves on.
const TRANSITION_DELAY_MS = 600

export type ReportEvent =
  | { kind: 'shortcut'; shortcutId: 'press-summon' | 'press-list' }
  | { kind: 'item-added' }
  | { kind: 'tray-click' }

type HostName = 'quickadd' | 'list' | 'tray' | 'none'

export interface CalloutPayload {
  stepId: string
  step: number
  welcome: boolean
  subStep: boolean
  label: string
  title: string
  autoAdvanceHint: string | null
  successAction: string | null
  /** 1..6 for numbered steps, 0 for welcome. Sub-steps share the parent's
   *  number. */
  mainStepIndex: number
  totalMain: number
  /** Items added so far during 'capture-add'. Renderer uses this to render
   *  the "1 / 3" indicator. */
  itemsAddedCount: number
  /** Configured accelerator strings — pulled live from store so replay
   *  reflects user remapping. */
  shortcuts: { quickAdd: string; openList: string; reference: string }
}

class Orchestrator {
  private callout = new CalloutWindow()
  private dim = new DimOverlay()
  private currentStepId: string | null = null
  private active = false
  private itemsAddedCount = 0

  // Functions injected from the rest of main process so the orchestrator
  // doesn't need to reach into windows.ts / tray.ts directly.
  private hostProviders: Record<HostName, () => BrowserWindow | null> = {
    quickadd: () => null,
    list: () => null,
    tray: () => null,
    none: () => null
  }
  private trayBoundsProvider: () => Rectangle | null = () => null
  private shortcutsProvider: () => CalloutPayload['shortcuts'] = () => ({
    quickAdd: 'CommandOrControl+Shift+;',
    openList: 'CommandOrControl+Shift+L',
    reference: "CommandOrControl+Shift+'"
  })

  registerHostProvider(name: HostName, getter: () => BrowserWindow | null): void {
    this.hostProviders[name] = getter
  }

  setTrayBoundsProvider(getter: () => Rectangle | null): void {
    this.trayBoundsProvider = getter
  }

  setShortcutsProvider(getter: () => CalloutPayload['shortcuts']): void {
    this.shortcutsProvider = getter
  }

  isActive(): boolean {
    return this.active
  }

  getCurrentStep(): OnboardingStep | null {
    return this.currentStepId ? getStepById(this.currentStepId) ?? null : null
  }

  /** Snapshot of what the callout renderer needs to draw the current step.
   *  Returns null when no tour is active. Used both for sending on step
   *  change and for answering get-state requests from a freshly-mounted
   *  callout renderer (which may have missed the show-step push). */
  getCurrentCalloutPayload(): CalloutPayload | null {
    const step = this.getCurrentStep()
    if (!step) return null
    return {
      stepId: step.id,
      step: step.step,
      welcome: step.welcome ?? false,
      subStep: step.subStep ?? false,
      label: step.label,
      title: step.title,
      autoAdvanceHint: step.autoAdvanceHint,
      successAction: step.successAction,
      mainStepIndex: step.welcome ? 0 : step.step,
      totalMain: TOTAL_MAIN,
      itemsAddedCount: this.itemsAddedCount,
      shortcuts: this.shortcutsProvider()
    }
  }

  /** Run the tour if persistence says it hasn't been completed. Used on
   *  app launch. */
  maybeRun(): void {
    if (persistence.needsTour()) {
      this.start()
    }
  }

  /** Kicks off the tour. Pre-loads both the dim window and the callout
   *  window in parallel, then shows them in deliberate order: dim first,
   *  callout 100ms later. The async work happens in preloadAndShow();
   *  this method stays sync so callers (tray menu, maybeRun) don't need
   *  to await it. */
  start(): void {
    if (this.active) return
    this.active = true
    this.itemsAddedCount = 0
    void this.preloadAndShow()
    this.broadcastState()
  }

  private async preloadAndShow(): Promise<void> {
    try {
      await Promise.all([
        this.dim.createAndPreload(),
        this.callout.createAndPreload()
      ])
    } catch (e) {
      console.error('[onboarding] failed to preload tour windows:', e)
      this.stop(false)
      return
    }

    // User may have dismissed during the preload (e.g. rapid Replay).
    if (!this.active) return

    // Set up the welcome step content while both windows are still hidden
    // — the callout's renderer receives the payload and renders the
    // welcome content, so by the time we show the window it has its
    // first frame already painted with the right step.
    this.showStep('welcome')

    // Show the dim first — its 250ms CSS fade-in starts immediately.
    this.dim.showNow()

    // Brief pause so the dim is partway through its fade-in by the time
    // the welcome callout appears on top of it. Deterministic ordering;
    // no race against macOS's window-allocation timing.
    setTimeout(() => {
      if (!this.active) return
      this.callout.showNow()
    }, 100)
  }

  /** Wipe persistence and re-run from welcome. Triggered by the tray menu's
   *  "Replay onboarding tour" item. */
  replay(): void {
    persistence.reset()
    if (this.active) {
      this.stop(false)
    }
    this.start()
  }

  /** End the tour. markComplete=true treats the dismissal as "I've seen
   *  enough" — sets completedAt so we don't re-prompt on next launch. */
  stop(markComplete = true): void {
    if (!this.active) return
    this.active = false
    this.currentStepId = null
    this.itemsAddedCount = 0
    // Hide the dim instead of destroying it — kept warm for the next
    // tour start so the next show() is near-instant. The callout still
    // gets destroyed because its lighter content reloads quickly.
    this.dim.hide()
    this.callout.destroy()
    if (markComplete) {
      persistence.markComplete()
    }
    this.broadcastState()
  }

  /** Tear down the dim overlay only — leaves the tour running. Triggered
   *  by the dim window's dismiss button when the user wants their full
   *  desktop visible while still being walked through the tour. */
  dismissDim(): void {
    this.dim.hide()
  }

  /** Pre-warm the dim window at app start. After this resolves, future
   *  start() calls can show the dim near-instantly without waiting for
   *  ~470ms of cold-load. Call once during app.whenReady. */
  preloadDim(): Promise<void> {
    return this.dim.createAndPreload()
  }

  /** Move forward one step. Used by Next / Start Tour / Let's go and by
   *  the auto-advance timer after a successful action. */
  advance(): void {
    if (!this.active || !this.currentStepId) return
    const next = getNextStepId(this.currentStepId)
    if (next === null) {
      // Already on the final step — advancing means complete the tour.
      this.stop(true)
      return
    }
    this.showStep(next)
  }

  back(): void {
    if (!this.active || !this.currentStepId) return
    const prev = getPrevStepId(this.currentStepId)
    if (prev === null) return
    this.showStep(prev)
  }

  /** Dismiss X / Skip on welcome. */
  close(): void {
    this.stop(true)
  }

  /** Called from the rest of main process when a user action happens that
   *  might satisfy the active step's success condition. Idempotent — only
   *  triggers a transition if the active step actually wants this kind of
   *  event. */
  report(event: ReportEvent): void {
    if (!this.active || !this.currentStepId) return
    const step = getStepById(this.currentStepId)
    if (!step || !step.successAction) return

    let matches = false
    switch (step.successAction) {
      case 'press-summon':
        matches = event.kind === 'shortcut' && event.shortcutId === 'press-summon'
        break
      case 'press-list':
        matches = event.kind === 'shortcut' && event.shortcutId === 'press-list'
        break
      case 'click-tray':
        matches = event.kind === 'tray-click'
        break
      case 'add-3-items':
        if (event.kind === 'item-added') {
          this.itemsAddedCount += 1
          // Tell the callout so the "X of 3 added" indicator updates.
          this.callout.send('onboarding:items-progress', this.itemsAddedCount)
          matches = this.itemsAddedCount >= 3
        }
        break
    }

    if (!matches) return

    // Capture the step we matched on, so a delayed advance is a no-op if
    // the user has navigated away in the meantime (Back, Skip, etc.).
    const matchedStepId = step.id
    setTimeout(() => {
      if (!this.active) return
      if (this.currentStepId !== matchedStepId) return
      this.advance()
    }, TRANSITION_DELAY_MS)
  }

  /** Re-run anchor positioning against the current host bounds. Call this
   *  whenever a host window is created, moved, resized, hidden, shown, or
   *  the display configuration changes. Cheap when no tour is active. */
  refreshPosition(): void {
    if (!this.active) return
    this.repositionForCurrentStep()
  }

  /** Pass a renderer-reported content height through to the callout window
   *  so it can resize itself + re-anchor. Invoked by the
   *  onboarding:request-resize IPC. */
  setCalloutHeight(height: number): void {
    this.callout.setContentHeight(height)
  }

  private showStep(stepId: string): void {
    const step = getStepById(stepId)
    if (!step) return
    this.currentStepId = stepId

    // Reset the items counter when (re)entering capture-add so going Back
    // and forward gives a clean count rather than stacking.
    if (stepId === 'capture-add') {
      this.itemsAddedCount = 0
    }

    persistence.recordStep(stepId)
    this.repositionForCurrentStep()

    const payload = this.getCurrentCalloutPayload()
    if (payload) {
      this.callout.send('onboarding:show-step', payload)
    }

    this.broadcastState()
  }

  private repositionForCurrentStep(): void {
    const step = this.getCurrentStep()
    if (!step) return
    const host = this.hostProviders[step.hostWindow]?.() ?? null
    const trayBounds = this.trayBoundsProvider()
    this.callout.reposition(step.anchor, host, trayBounds)
  }

  /** Tell every renderer the current onboarding state so they can mount
   *  step-specific listeners (e.g. the QuickAdd renderer arming the "items
   *  added" reporter only during capture-add). */
  private broadcastState(): void {
    const payload = { active: this.active, stepId: this.currentStepId }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('onboarding:state', payload)
      }
    }
  }
}

// Singleton — there is only ever one tour at a time.
export const orchestrator = new Orchestrator()

// Re-export step constants so consumers can import from ./onboarding without
// reaching across into shared types.
export { ONBOARDING_STEPS }
