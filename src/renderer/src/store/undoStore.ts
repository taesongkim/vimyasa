// Renderer-side Zustand mirror of main's in-memory undo / redo log.
// Mirrors the themesStore pattern: subscribe to onChanged at store
// creation, install the subscription exactly once per renderer
// process, and snap whatever main broadcasts into local state.
// `performUndo` / `performRedo` just delegate to the IPC — main does
// the actual data-store mutation and broadcasts data-changed for
// every window to refresh against.

import { create } from 'zustand'
import type { UndoSnapshot } from '../../../../shared/types'

interface UndoStoreState extends UndoSnapshot {
  /** Pop the most recent undo entry. Returns the id main says was
   *  touched so the caller can scroll / focus that row. Null if
   *  the log was empty. */
  performUndo: () => Promise<string | null>
  performRedo: () => Promise<string | null>
}

const INITIAL: UndoSnapshot = { undoDepth: 0, redoDepth: 0 }

export const useUndoStore = create<UndoStoreState>((set) => {
  // Pull current snapshot once on mount; subsequent changes flow via
  // onChanged below. The IPC is cheap; running it once per renderer
  // process is fine.
  if (typeof window !== 'undefined' && window.api?.undo) {
    void window.api.undo.get().then((snapshot) => set(snapshot))
    window.api.undo.onChanged((next) => {
      set(next)
    })
  }

  return {
    ...INITIAL,

    performUndo: async () => {
      const result = await window.api.undo.performUndo()
      return result?.affectedItemId ?? null
    },

    performRedo: async () => {
      const result = await window.api.undo.performRedo()
      return result?.affectedItemId ?? null
    }
  }
})
