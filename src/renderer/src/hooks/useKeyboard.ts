import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'

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
  onR?: () => void
  onM?: () => void
  onNumber0?: () => void
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
  // jkMode is a user preference: 'standard' (vim: j down, k up) vs
  // 'inverse' (j up, k down). Arrow keys are unaffected.
  const jkMode = useStore((s) => s.jkMode)

  // Read `config` through a ref so the keydown listener stays
  // referentially stable across renders. The parent's config object
  // is rebuilt every render (inline literal with fresh closures over
  // current state), so without the ref this hook would re-install
  // its window listener on EVERY ListWindow render. Two problems with
  // that: (1) wasted work, and (2) a race window between commit and
  // useEffect-run where the OLD listener catches the next keypress
  // with stale closures. The carry-cancel + Cmd+Z path was hitting
  // case (2): after Cmd+Z fired setCarryItemId(null), the user's
  // next j press caught the old listener whose `isCarrying=true`
  // closure called the old `carryReorder`, which had its own stale
  // `carryItemId` closure — j appeared dead.
  const configRef = useRef(config)
  configRef.current = config

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const config = configRef.current
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

      // In standard mode, j fires onArrowDown and k fires onArrowUp.
      // In inverse mode, the j/k assignment flips. Arrow keys are
      // always literal.
      const jHandler = jkMode === 'inverse' ? config.onArrowUp : config.onArrowDown
      const kHandler = jkMode === 'inverse' ? config.onArrowDown : config.onArrowUp

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          config.onArrowUp?.()
          break
        case 'ArrowDown':
          e.preventDefault()
          config.onArrowDown?.()
          break
        case 'j':
          e.preventDefault()
          jHandler?.()
          break
        case 'k':
          e.preventDefault()
          kHandler?.()
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
        case 'r':
        case 'R':
          // Bare `r` only — Cmd+R is reload everywhere; never clobber it.
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            config.onR?.()
          }
          break
        case 'm':
        case 'M':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            config.onM?.()
          }
          break
        case '0':
          e.preventDefault()
          config.onNumber0?.()
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
    // configRef.current is read at call time; only jkMode is captured
    // here (changes rarely; safe to re-install on flip).
    [jkMode]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
