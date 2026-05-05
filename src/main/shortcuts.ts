import { globalShortcut } from 'electron'
import { store } from './store'
import {
  createFeedbackWindow,
  createListWindow,
  createQuickAddWindow,
  createShortcutsOverviewWindow
} from './windows'
import type { BuiltinShortcuts, List } from '../shared/types'
import { DEFAULT_BUILTIN_SHORTCUTS, getRegularLists } from '../shared/types'
import { orchestrator } from './onboarding'

let cycleIndex = 0

// "First list" semantics across the app mean the user-facing first list,
// i.e. the topmost row in Settings → Lists / the first entry in the tray
// menu. That order is governed by list.sortOrder; the array stored on
// disk is in insertion order. The hot list is excluded — it has its own
// dedicated shortcut and never participates in the regular 1–9 ordering.
function listsInDisplayOrder(): List[] {
  return getRegularLists(store.get('lists')).sort((a, b) => a.sortOrder - b.sortOrder)
}

// Track registered accelerators so we can selectively unregister
const registeredBuiltinAccelerators: string[] = []
const registeredUserAccelerators: string[] = []

export function registerGlobalShortcuts(): void {
  registerBuiltinShortcuts()
  registerUserShortcuts()
}

function registerBuiltinShortcuts(): void {
  const raw = store.get('builtinShortcuts')
  const config: BuiltinShortcuts = raw && typeof raw === 'object'
    ? { ...DEFAULT_BUILTIN_SHORTCUTS, ...raw }
    : DEFAULT_BUILTIN_SHORTCUTS

  // Filter out unwanted shortcuts
  Object.keys(config).forEach((key) => {
    if (['CommandOrControl+Shift+A', 'CommandOrControl+Shift+J'].includes(config[key as keyof BuiltinShortcuts])) {
      delete config[key as keyof BuiltinShortcuts]
    }
  })

  console.log('[shortcuts] Registering builtin shortcuts:', JSON.stringify(config))

  // Open first list
  tryRegisterBuiltin(config.openFirstList, () => {
    const lists = listsInDisplayOrder()
    if (lists.length > 0) {
      createListWindow(lists[0].id)
    }
    // Notify the onboarding orchestrator so its 'navigate' step can match.
    // Cheap when no tour is active.
    orchestrator.report({ kind: 'shortcut', shortcutId: 'press-list' })
  })

  // Quick-add to first list (fixed)
  tryRegisterBuiltin(config.quickAddFirst, () => {
    const lists = listsInDisplayOrder()
    if (lists.length > 0) {
      createQuickAddWindow('fixed', lists[0].id)
    }
    orchestrator.report({ kind: 'shortcut', shortcutId: 'press-summon' })
  })

  // Shortcuts overview
  tryRegisterBuiltin('CommandOrControl+Shift+\'', () => {
    createShortcutsOverviewWindow()
  })

  // Feedback messenger — see docs/proposals/feedback-messenger.md.
  // Hard-coded for now (not in BuiltinShortcuts type) since rebinding
  // hasn't been requested. If user-rebinding lands, promote it then.
  tryRegisterBuiltin('CommandOrControl+Shift+\\', () => {
    createFeedbackWindow()
  })

}

function tryRegisterBuiltin(accelerator: string, callback: () => void): void {
  if (!accelerator) return
  try {
    const success = globalShortcut.register(accelerator, callback)
    console.log(`[shortcuts] Register builtin "${accelerator}": ${success ? 'OK' : 'FAILED (already taken?)'}`)
    if (success) {
      registeredBuiltinAccelerators.push(accelerator)
    }
  } catch (e) {
    console.warn(`[shortcuts] Failed to register builtin shortcut ${accelerator}:`, e)
  }
}

function registerUserShortcuts(): void {
  const shortcuts = store.get('shortcuts')

  for (const shortcut of shortcuts) {
    try {
      const success = globalShortcut.register(shortcut.accelerator, () => {
        switch (shortcut.action) {
          case 'openList':
            if (shortcut.targetId) createListWindow(shortcut.targetId)
            break
          case 'quickAddFixed': {
            const fallback = listsInDisplayOrder()[0]?.id
            createQuickAddWindow('fixed', shortcut.targetId || fallback)
            break
          }
          case 'cycleAllLists': {
            const currentLists = listsInDisplayOrder()
            if (currentLists.length === 0) return
            cycleIndex = cycleIndex % currentLists.length
            createListWindow(currentLists[cycleIndex].id)
            cycleIndex = (cycleIndex + 1) % currentLists.length
            break
          }
        }
      })
      if (success) {
        registeredUserAccelerators.push(shortcut.accelerator)
      }
    } catch (e) {
      console.warn(`Failed to register shortcut ${shortcut.accelerator}:`, e)
    }
  }
}

/**
 * Unregister and re-register built-in shortcuts from store config.
 * Call after the user changes built-in shortcut bindings.
 */
export function refreshBuiltinShortcuts(): void {
  console.log('[shortcuts] Refreshing builtin shortcuts, unregistering:', registeredBuiltinAccelerators)
  for (const accel of registeredBuiltinAccelerators) {
    try {
      globalShortcut.unregister(accel)
    } catch { /* already unregistered */ }
  }
  registeredBuiltinAccelerators.length = 0
  registerBuiltinShortcuts()
}

/**
 * Unregister all user-defined shortcuts and re-register from store.
 * Call after any shortcut CRUD operation.
 */
export function refreshUserShortcuts(): void {
  for (const accel of registeredUserAccelerators) {
    try {
      globalShortcut.unregister(accel)
    } catch { /* already unregistered */ }
  }
  registeredUserAccelerators.length = 0
  registerUserShortcuts()
}

export function pauseGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}

export function resumeGlobalShortcuts(): void {
  registerBuiltinShortcuts()
  registerUserShortcuts()
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
  registeredBuiltinAccelerators.length = 0
  registeredUserAccelerators.length = 0
}

/** Live snapshot of the configured builtin shortcuts for the onboarding
 *  callouts to display. Reads through to the store on every call so replay
 *  reflects any remapping the user has made. */
export function getCurrentBuiltinShortcuts(): {
  quickAdd: string
  openList: string
  reference: string
} {
  const raw = store.get('builtinShortcuts')
  const config: BuiltinShortcuts =
    raw && typeof raw === 'object'
      ? { ...DEFAULT_BUILTIN_SHORTCUTS, ...raw }
      : DEFAULT_BUILTIN_SHORTCUTS
  return {
    quickAdd: config.quickAddFirst,
    openList: config.openFirstList,
    reference: "CommandOrControl+Shift+'"
  }
}
