import { useEffect, useCallback } from 'react'

interface KeyboardConfig {
  onArrowUp?: () => void
  onArrowDown?: () => void
  onEnter?: () => void
  onSpace?: () => void
  onEscape?: () => void
  onBackspace?: () => void
  onN?: () => void
  onCopy?: () => void
  onComments?: () => void
  onC?: () => void
  onO?: () => void
  onA?: () => void
  onNumber1?: () => void
  onNumber2?: () => void
  onNumber3?: () => void
  onNumber4?: () => void
  onNumber5?: () => void
  onNumber6?: () => void
  onNumber7?: () => void
  onNumber8?: () => void
  onNumber9?: () => void
  onTab?: () => void
  enabled?: boolean
}

export function useKeyboard(config: KeyboardConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (config.enabled === false) return

      // Don't intercept when typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only intercept Escape in inputs
        if (e.key === 'Escape') {
          config.onEscape?.()
          e.preventDefault()
        }
        return
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          config.onArrowUp?.()
          break
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          config.onArrowDown?.()
          break
        case 'Enter':
          e.preventDefault()
          config.onEnter?.()
          break
        case ' ':
          e.preventDefault()
          config.onSpace?.()
          break
        case 'Escape':
          e.preventDefault()
          config.onEscape?.()
          break
        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          config.onBackspace?.()
          break
        case 'n':
        case 'N':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            config.onN?.()
          }
          break
        case 'c':
          e.preventDefault()
          if (e.metaKey || e.ctrlKey) {
            config.onCopy?.()
          } else {
            config.onC?.()
          }
          break
        case 'o':
          e.preventDefault()
          if (e.metaKey || e.ctrlKey) {
            config.onComments?.()
          } else {
            config.onO?.()
          }
          break
        case 'a':
        case 'A':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            config.onA?.()
          }
          break
        case '1':
          e.preventDefault()
          config.onNumber1?.()
          break
        case '2':
          e.preventDefault()
          config.onNumber2?.()
          break
        case '3':
          e.preventDefault()
          config.onNumber3?.()
          break
        case '4':
          e.preventDefault()
          config.onNumber4?.()
          break
        case '5':
          e.preventDefault()
          config.onNumber5?.()
          break
        case '6':
          e.preventDefault()
          config.onNumber6?.()
          break
        case '7':
          e.preventDefault()
          config.onNumber7?.()
          break
        case '8':
          e.preventDefault()
          config.onNumber8?.()
          break
        case '9':
          e.preventDefault()
          config.onNumber9?.()
          break
        case 'Tab':
          e.preventDefault()
          config.onTab?.()
          break
      }
    },
    [config]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
