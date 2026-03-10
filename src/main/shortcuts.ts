import { globalShortcut } from 'electron'
import { store } from './store'
import { createListWindow, createQuickAddWindow } from './windows'
import type { BuiltinShortcuts } from '../shared/types'
import { DEFAULT_BUILTIN_SHORTCUTS } from '../shared/types'

let cycleIndex = 0

// Track registered accelerators so we can selectively unregister
const registeredBuiltinAccelerators: string[] = []
const registeredUserAccelerators: string[] = []

export function registerGlobalShortcuts(): void {
  registerBuiltinShortcuts()
  registerUserShortcuts()
}

function registerBuiltinShortcuts(): void {
  const config: BuiltinShortcuts = store.get('builtinShortcuts') || DEFAULT_BUILTIN_SHORTCUTS

  // Open first list
  tryRegisterBuiltin(config.openFirstList, () => {
    const lists = store.get('lists')
    if (lists.length > 0) {
      createListWindow(lists[0].id)
    }
  })

  // Quick-add to first list (fixed)
  tryRegisterBuiltin(config.quickAddFirst, () => {
    const lists = store.get('lists')
    if (lists.length > 0) {
      createQuickAddWindow('fixed', lists[0].id)
    }
  })

  // Quick-add with list selector
  tryRegisterBuiltin(config.quickAddSelect, () => {
    createQuickAddWindow('select')
  })

  // Cycle through all lists
  tryRegisterBuiltin(config.cycleAllLists, () => {
    const lists = store.get('lists')
    if (lists.length === 0) return
    cycleIndex = cycleIndex % lists.length
    createListWindow(lists[cycleIndex].id)
    cycleIndex = (cycleIndex + 1) % lists.length
  })
}

function tryRegisterBuiltin(accelerator: string, callback: () => void): void {
  if (!accelerator) return
  try {
    const success = globalShortcut.register(accelerator, callback)
    if (success) {
      registeredBuiltinAccelerators.push(accelerator)
    }
  } catch (e) {
    console.warn(`Failed to register builtin shortcut ${accelerator}:`, e)
  }
}

function registerUserShortcuts(): void {
  const shortcuts = store.get('shortcuts')
  const lists = store.get('lists')

  for (const shortcut of shortcuts) {
    try {
      const success = globalShortcut.register(shortcut.accelerator, () => {
        switch (shortcut.action) {
          case 'openList':
            if (shortcut.targetId) createListWindow(shortcut.targetId)
            break
          case 'quickAddFixed':
            createQuickAddWindow('fixed', shortcut.targetId || lists[0]?.id)
            break
          case 'quickAddSelect':
            createQuickAddWindow('select')
            break
          case 'cycleAllLists': {
            const currentLists = store.get('lists')
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

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
  registeredBuiltinAccelerators.length = 0
  registeredUserAccelerators.length = 0
}
