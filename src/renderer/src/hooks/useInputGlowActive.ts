import { useEffect, useState } from 'react'

/**
 * True only while both the native window and its specific text control are
 * focused. This is the shared interaction signal for input emphasis: themed
 * glow uses it today, and the baseline non-theme focus treatment can reuse
 * it later without inferring focus from visual state.
 */
export function useInputGlowActive(): {
  isActive: boolean
  onFocus: () => void
  onBlur: () => void
} {
  const [windowFocused, setWindowFocused] = useState(() => document.hasFocus())
  const [inputFocused, setInputFocused] = useState(false)

  useEffect(() => {
    const onWindowFocus = (): void => setWindowFocused(true)
    const onWindowBlur = (): void => setWindowFocused(false)
    window.addEventListener('focus', onWindowFocus)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [])

  return {
    isActive: windowFocused && inputFocused,
    onFocus: () => setInputFocused(true),
    onBlur: () => setInputFocused(false)
  }
}
