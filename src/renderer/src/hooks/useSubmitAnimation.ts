import { useState, useCallback } from 'react'

// One named "skin" for the post-submit confirmation animation. Each preset
// is a CSS class applied to the *form container* — descendant selectors in
// the corresponding stylesheet rule drive the rest (the highlighted input,
// the fading siblings, the container background). Bundling the visuals in
// one class on one element keeps the hook API small and lets a future
// settings UI swap presets just by passing a different name.
export type SubmitAnimationPreset = 'white-glow' | 'none'

interface PresetConfig {
  /** Class applied to the form/container element while the animation plays. */
  containerClassName: string
  /** Length of the visual transition (matches the CSS transition duration). */
  durationMs: number
  /** How long to hold the final state after the transition completes,
   *  before play() resolves. Lets the caller pause briefly so the user
   *  perceives the confirmation before, e.g., closing the window. */
  holdMs: number
}

const PRESETS: Record<SubmitAnimationPreset, PresetConfig> = {
  'white-glow': {
    containerClassName: 'submit-confirming-white-glow',
    durationMs: 120,
    holdMs: 70
  },
  none: {
    containerClassName: '',
    durationMs: 0,
    holdMs: 0
  }
}

export interface SubmitAnimationApi {
  /** Toggle this onto the form container's className. The preset's CSS rule
   *  uses descendant selectors to highlight the input, fade marked siblings
   *  (anything carrying data-submit-fade), and fade the container bg. */
  containerClassName: string
  /** True from the moment play() starts until its promise resolves. */
  isPlaying: boolean
  /** Plays the animation. Resolves once the visual transition has completed
   *  and the hold has elapsed. Safe to call when isPlaying is already true —
   *  becomes a no-op. */
  play: () => Promise<void>
  /** Reset to the off state. play() intentionally does NOT auto-reset
   *  because the caller usually wants the visual state to persist
   *  through a follow-up window-exit animation; resetting at the wrong
   *  moment causes a visible reflash as the CSS transition reverses.
   *  Callers using a prewarm/persist pattern (e.g. QuickAdd) should
   *  call reset() at the natural "fresh start" point — typically when
   *  the form is summoned anew. Callers whose component unmounts
   *  between submits don't need to call this. */
  reset: () => void
}

export function useSubmitAnimation(
  preset: SubmitAnimationPreset = 'white-glow'
): SubmitAnimationApi {
  const [active, setActive] = useState(false)
  const config = PRESETS[preset]

  const play = useCallback(async (): Promise<void> => {
    if (!config.containerClassName) return
    setActive(true)
    await new Promise<void>((resolve) =>
      setTimeout(resolve, config.durationMs + config.holdMs)
    )
    // Intentionally NOT calling setActive(false) here. The caller's
    // typical pattern is: play → addItem → exit-animate → hide window.
    // Resetting active mid-flow makes the CSS transition snap the
    // faded siblings + glowing input back to normal for ~120ms before
    // the exit animation hides the form, producing a visible flicker.
    // Caller is responsible for calling reset() at the natural fresh-
    // start point (e.g. when the form is re-summoned).
  }, [config.containerClassName, config.durationMs, config.holdMs])

  const reset = useCallback((): void => {
    setActive(false)
  }, [])

  return {
    containerClassName: active ? config.containerClassName : '',
    isPlaying: active,
    play,
    reset
  }
}
