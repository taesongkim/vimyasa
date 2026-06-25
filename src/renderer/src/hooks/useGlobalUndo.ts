import { useEffect } from 'react'
import { useUndoStore } from '../store/undoStore'

// Window-level Cmd+Z / Cmd+Shift+Z handler. Order-sensitive per the
// BACKLOG Undo dispatch:
//   1. If the focused input is an in-flight transient (item edit
//      mode, new-item draft) — cancel it locally. NO log consumption.
//   2. If carry mode is active in this window — restore the item to
//      its pre-pickup position + exit carry. NO log consumption.
//   3. Otherwise — pop the undo log (or push back on redo).
//
// (1) is detected by `data-undo-cancel` attribute on the active
// element. The hook dispatches a `undo-cancel` CustomEvent on the
// element; the component owning the input listens for it (so the
// hook doesn't need to know about every transient flavor).
//
// (2) is detected by dispatching `undo-check-carry` on `window`.
// ListWindow registers a listener that calls `preventDefault()` if
// carry is active in that window (after handling the restore +
// exit). The hook respects defaultPrevented as the "handled" signal.

export interface UndoCancelDetail {
  kind: 'undo' | 'redo'
}

export function useGlobalUndo(): void {
  const performUndo = useUndoStore((s) => s.performUndo)
  const performRedo = useUndoStore((s) => s.performRedo)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isCmd = e.metaKey || e.ctrlKey
      if (!isCmd) return
      // Cmd+Z = undo, Cmd+Shift+Z = redo. The "y" alias for redo on
      // some platforms is intentionally not wired here — keep it to
      // the one-handed pair the spec calls out.
      if (e.key !== 'z' && e.key !== 'Z') return
      const isRedo = e.shiftKey

      const active = document.activeElement as HTMLElement | null

      // (1) Local cancel for in-flight transients (edit-mode textarea
      // OR draft input). Undo direction only — Cmd+Shift+Z while
      // typing in a textarea falls through to the default redo path,
      // not a "re-enter the edit you cancelled" semantic.
      if (!isRedo && active?.dataset?.undoCancel) {
        e.preventDefault()
        active.dispatchEvent(
          new CustomEvent<UndoCancelDetail>('undo-cancel', {
            detail: { kind: 'undo' },
            bubbles: false
          })
        )
        return
      }

      // (2) Carry-mode restore. Undo direction only — Cmd+Shift+Z
      // mid-carry would have nothing meaningful to redo.
      if (!isRedo) {
        const carryEvent = new CustomEvent('undo-check-carry', {
          cancelable: true,
          bubbles: false
        })
        window.dispatchEvent(carryEvent)
        if (carryEvent.defaultPrevented) {
          e.preventDefault()
          return
        }
      }

      // (3) Default: log pop.
      e.preventDefault()
      if (isRedo) {
        void performRedo()
      } else {
        void performUndo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [performUndo, performRedo])
}
