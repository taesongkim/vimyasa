import { globalShortcut } from 'electron'
import { store } from './store'
import { createListWindow, createQuickAddWindow } from './windows'

let cycleIndex = 0

export function registerGlobalShortcuts(): void {
  // Open first list
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    const lists = store.get('lists')
    if (lists.length > 0) {
      createListWindow(lists[0].id)
    }
  })

  // Quick-add to first list (fixed)
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    const lists = store.get('lists')
    if (lists.length > 0) {
      createQuickAddWindow('fixed', lists[0].id)
    }
  })

  // Quick-add with list selector
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    createQuickAddWindow('select')
  })

  // Cycle through all lists
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    const lists = store.get('lists')
    if (lists.length === 0) return
    cycleIndex = cycleIndex % lists.length
    createListWindow(lists[cycleIndex].id)
    cycleIndex = (cycleIndex + 1) % lists.length
  })

  // Register user-defined shortcuts from store
  registerUserShortcuts()
}

export function registerUserShortcuts(): void {
  const shortcuts = store.get('shortcuts')
  const lists = store.get('lists')

  for (const shortcut of shortcuts) {
    try {
      globalShortcut.register(shortcut.accelerator, () => {
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
            if (lists.length === 0) return
            cycleIndex = cycleIndex % lists.length
            createListWindow(lists[cycleIndex].id)
            cycleIndex = (cycleIndex + 1) % lists.length
            break
          }
        }
      })
    } catch (e) {
      console.warn(`Failed to register shortcut ${shortcut.accelerator}:`, e)
    }
  }
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
}
