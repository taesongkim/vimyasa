import { contextBridge, ipcRenderer } from 'electron'
import type { VimyasaAPI } from '../shared/types'

// Sync hand-off of the persisted themes state from main → renderer. Main
// passes a `--themes-initial=<json>` argv flag when creating each
// BrowserWindow; we parse it here (preload runs before the renderer's JS)
// and expose the parsed snapshot so the themes store can initialize on
// first render without an async IPC roundtrip. See themes-store.ts:
// getThemesPreloadArg.
function readThemesInitial(): unknown {
  const flag = process.argv.find((a) => a.startsWith('--themes-initial='))
  if (!flag) return null
  try {
    return JSON.parse(flag.slice('--themes-initial='.length))
  } catch {
    // Malformed JSON — fall back to null. The renderer will use its
    // built-in defaults and the existing onChanged subscription will
    // catch up once main re-broadcasts.
    return null
  }
}
contextBridge.exposeInMainWorld('themesInitial', readThemesInitial())

const api: VimyasaAPI = {
  // Lifecycle
  ping: () => ipcRenderer.invoke('ping'),

  // Data
  getAll: () => ipcRenderer.invoke('getAll'),

  // Groups
  createGroup: (name) => ipcRenderer.invoke('createGroup', name),
  updateGroup: (id, updates) => ipcRenderer.invoke('updateGroup', id, updates),
  deleteGroup: (id) => ipcRenderer.invoke('deleteGroup', id),

  // Lists
  createList: (groupId, name) => ipcRenderer.invoke('createList', groupId, name),
  updateList: (id, updates) => ipcRenderer.invoke('updateList', id, updates),
  deleteList: (id) => ipcRenderer.invoke('deleteList', id),

  // Items
  createItem: (listId, text, clientId) => ipcRenderer.invoke('createItem', listId, text, clientId),
  updateItem: (id, updates) => ipcRenderer.invoke('updateItem', id, updates),
  deleteItem: (id) => ipcRenderer.invoke('deleteItem', id),
  setItemStatus: (id, status) => ipcRenderer.invoke('setItemStatus', id, status),
  moveItem: (id, targetListId) => ipcRenderer.invoke('moveItem', id, targetListId),
  reorderItems: (listId, orderedIds, silent) =>
    ipcRenderer.invoke('reorderItems', listId, orderedIds, silent),

  // Comments
  createComment: (itemId, text, parentId) =>
    ipcRenderer.invoke('createComment', itemId, text, parentId),
  updateComment: (id, text) => ipcRenderer.invoke('updateComment', id, text),
  deleteComment: (id) => ipcRenderer.invoke('deleteComment', id),

  // Shortcuts
  getShortcuts: () => ipcRenderer.invoke('getShortcuts'),
  createShortcut: (action, accelerator, targetId) =>
    ipcRenderer.invoke('createShortcut', action, accelerator, targetId),
  updateShortcut: (id, updates) => ipcRenderer.invoke('updateShortcut', id, updates),
  deleteShortcut: (id) => ipcRenderer.invoke('deleteShortcut', id),

  // Built-in Shortcuts
  getBuiltinShortcuts: () => ipcRenderer.invoke('getBuiltinShortcuts'),
  updateBuiltinShortcuts: (updates) => ipcRenderer.invoke('updateBuiltinShortcuts', updates),

  // J/K mapping mode
  setJkMode: (mode) => ipcRenderer.invoke('setJkMode', mode),

  // Effects (Settings → Advanced)
  setEffects: (updates) => ipcRenderer.invoke('setEffects', updates),

  // Shortcut capture
  pauseGlobalShortcuts: () => ipcRenderer.invoke('pauseGlobalShortcuts'),
  resumeGlobalShortcuts: () => ipcRenderer.invoke('resumeGlobalShortcuts'),

  // Window
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
  openListWindow: (listId, position) => ipcRenderer.invoke('openListWindow', listId, position),
  openQuickAdd: (variant, targetListId) => ipcRenderer.invoke('openQuickAdd', variant, targetListId),
  openComments: (itemId) => ipcRenderer.invoke('openComments', itemId),
  openSettings: (tab) => ipcRenderer.invoke('openSettings', tab),
  openArchive: (listId) => ipcRenderer.invoke('openArchive', listId),
  openShortcutsOverview: () => ipcRenderer.invoke('openShortcutsOverview'),
  showContextMenu: (template) => ipcRenderer.invoke('showContextMenu', template),

  // Events
  onDataChanged: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('data-changed', listener)
    return () => {
      ipcRenderer.removeListener('data-changed', listener)
    }
  },
  onItemArrived: (callback) => {
    const listener = (_e: unknown, payload: unknown): void => {
      const p = payload as
        | {
            itemId?: string
            fromListId?: string
            toListId?: string
            direction?: 'left' | 'right'
          }
        | null
      if (
        p &&
        typeof p.itemId === 'string' &&
        typeof p.fromListId === 'string' &&
        typeof p.toListId === 'string' &&
        (p.direction === 'left' || p.direction === 'right')
      ) {
        callback({
          itemId: p.itemId,
          fromListId: p.fromListId,
          toListId: p.toListId,
          direction: p.direction
        })
      }
    }
    ipcRenderer.on('item-arrived', listener)
    return () => ipcRenderer.removeListener('item-arrived', listener)
  },
  onContextMenuAction: (callback) => {
    const listener = (_event: unknown, data: Parameters<typeof callback>[0]): void =>
      callback(data)
    ipcRenderer.on('context-menu-action', listener)
    return () => {
      ipcRenderer.removeListener('context-menu-action', listener)
    }
  },

  // System
  revealDataFile: () => ipcRenderer.invoke('revealDataFile'),
  getLoginItemSettings: () => ipcRenderer.invoke('getLoginItemSettings'),
  setLoginItemSettings: (openAtLogin) => ipcRenderer.invoke('setLoginItemSettings', openAtLogin),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  getCurrentReleaseNotes: () => ipcRenderer.invoke('about:getCurrentReleaseNotes'),
  fitSettingsWidth: (overflow) => ipcRenderer.invoke('settings:fit-width', overflow),
  importData: (data) => ipcRenderer.invoke('importData', data),
  resetData: () => ipcRenderer.invoke('resetData'),

  // Onboarding (used by the callout window renderer; main app renderers
  // can also subscribe to onState to know when a tour is active).
  onboarding: {
    advance: () => ipcRenderer.invoke('onboarding:advance'),
    back: () => ipcRenderer.invoke('onboarding:back'),
    close: () => ipcRenderer.invoke('onboarding:close'),
    replay: () => ipcRenderer.invoke('onboarding:replay'),
    getState: () => ipcRenderer.invoke('onboarding:get-state'),
    requestResize: (height) => ipcRenderer.invoke('onboarding:request-resize', height),
    dismissDim: () => ipcRenderer.invoke('onboarding:dismiss-dim'),
    onShowStep: (callback) => {
      const listener = (_e: unknown, payload: unknown): void => callback(payload as never)
      ipcRenderer.on('onboarding:show-step', listener)
      return () => ipcRenderer.removeListener('onboarding:show-step', listener)
    },
    onItemsProgress: (callback) => {
      const listener = (_e: unknown, count: unknown): void => callback(count as number)
      ipcRenderer.on('onboarding:items-progress', listener)
      return () => ipcRenderer.removeListener('onboarding:items-progress', listener)
    },
    onState: (callback) => {
      const listener = (_e: unknown, state: unknown): void => callback(state as never)
      ipcRenderer.on('onboarding:state', listener)
      return () => ipcRenderer.removeListener('onboarding:state', listener)
    },
    onDimShown: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('onboarding:dim-shown', listener)
      return () => ipcRenderer.removeListener('onboarding:dim-shown', listener)
    }
  },

  // System
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),

  // Themes (production)
  themes: {
    get: () => ipcRenderer.invoke('themes:get'),
    setMasterEnabled: (enabled) => ipcRenderer.invoke('themes:setMasterEnabled', enabled),
    setSurfaceEnabled: (surfaceId, enabled) =>
      ipcRenderer.invoke('themes:setSurfaceEnabled', surfaceId, enabled),
    setSurfaceConfig: (surfaceId, config) =>
      ipcRenderer.invoke('themes:setSurfaceConfig', surfaceId, config),
    setEffects: (partial) => ipcRenderer.invoke('themes:setEffects', partial),
    setAppearance: (appearance) => ipcRenderer.invoke('themes:setAppearance', appearance),
    reset: () => ipcRenderer.invoke('themes:reset'),
    onChanged: (callback) => {
      const listener = (_e: unknown, state: unknown): void => callback(state as never)
      ipcRenderer.on('themes:changed', listener)
      return () => ipcRenderer.removeListener('themes:changed', listener)
    }
  },

  // Pre-warmed QuickAdd window
  quickAdd: {
    onShow: (callback) => {
      const listener = (_e: unknown, payload: unknown): void => {
        const p = payload as { listId?: string } | null
        callback({ listId: p?.listId ?? '' })
      }
      ipcRenderer.on('quickadd:show', listener)
      return () => ipcRenderer.removeListener('quickadd:show', listener)
    },
    onHidden: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('quickadd:hidden', listener)
      return () => ipcRenderer.removeListener('quickadd:hidden', listener)
    },
    hide: () => ipcRenderer.invoke('quickAddHide'),
    notifyItemAdded: (itemId, listId) =>
      ipcRenderer.invoke('quickadd:notify-item-added', itemId, listId),
    onItemAdded: (callback) => {
      const listener = (_e: unknown, payload: unknown): void => {
        const p = payload as { itemId?: string; listId?: string } | null
        if (p && typeof p.itemId === 'string' && typeof p.listId === 'string') {
          callback({ itemId: p.itemId, listId: p.listId })
        }
      }
      ipcRenderer.on('quickadd:item-added', listener)
      return () => ipcRenderer.removeListener('quickadd:item-added', listener)
    }
  },

  // Theme event triggers
  themeEvents: {
    onEvent: (callback) => {
      const listener = (_e: unknown, payload: unknown): void => {
        const p = payload as { name?: string; itemId?: string } | null
        if (p && typeof p.name === 'string') callback(p as never)
      }
      ipcRenderer.on('theme:event', listener)
      return () => ipcRenderer.removeListener('theme:event', listener)
    },
    fire: (name) => ipcRenderer.invoke('themeEvent:fire', name)
  },

  // Feedback messenger — PR 2 added the send flow + window plumbing.
  feedback: {
    getConfig: () => ipcRenderer.invoke('feedback:get-config'),
    setConfig: (updates) => ipcRenderer.invoke('feedback:set-config', updates),
    canSend: () => ipcRenderer.invoke('feedback:can-send'),
    recordSend: () => ipcRenderer.invoke('feedback:record-send'),
    send: (message) => ipcRenderer.invoke('feedback:send', message),
    hide: () => ipcRenderer.invoke('feedback:hide'),
    onShow: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('feedback:show', listener)
      return () => ipcRenderer.removeListener('feedback:show', listener)
    },
    onHidden: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('feedback:hidden', listener)
      return () => ipcRenderer.removeListener('feedback:hidden', listener)
    }
  },

  // Undo / redo — main holds the in-memory log; every window mirrors
  // via onChanged. Same shape as the themes onChanged subscription.
  undo: {
    get: () => ipcRenderer.invoke('undo:get'),
    performUndo: () => ipcRenderer.invoke('undo:perform-undo'),
    performRedo: () => ipcRenderer.invoke('undo:perform-redo'),
    pushReorderEntry: (listId, oldOrder, newOrder) =>
      ipcRenderer.invoke('undo:push-reorder-entry', listId, oldOrder, newOrder),
    onChanged: (callback) => {
      const listener = (_e: unknown, payload: unknown): void => {
        const p = payload as { undoDepth?: number; redoDepth?: number } | null
        if (
          p &&
          typeof p.undoDepth === 'number' &&
          typeof p.redoDepth === 'number'
        ) {
          callback({ undoDepth: p.undoDepth, redoDepth: p.redoDepth })
        }
      }
      ipcRenderer.on('undo:changed', listener)
      return () => ipcRenderer.removeListener('undo:changed', listener)
    }
  },

  // Auto-update prompt (v0.1.8). Custom in-app window replaced the
  // native dialog so we can render the GitHub release notes inline.
  update: {
    onShow: (callback) => {
      const listener = (_e: unknown, payload: unknown): void => {
        const p = payload as
          | {
              phase?: 'available' | 'downloaded' | 'up-to-date' | 'error'
              version?: string
              releaseNotes?: string
            }
          | null
        if (
          p &&
          (p.phase === 'available' ||
            p.phase === 'downloaded' ||
            p.phase === 'up-to-date' ||
            p.phase === 'error') &&
          typeof p.version === 'string' &&
          typeof p.releaseNotes === 'string'
        ) {
          callback({ phase: p.phase, version: p.version, releaseNotes: p.releaseNotes })
        }
      }
      ipcRenderer.on('update:show', listener)
      return () => ipcRenderer.removeListener('update:show', listener)
    },
    getPending: () => ipcRenderer.invoke('update:get-pending'),
    install: () => ipcRenderer.invoke('update:install'),
    restart: () => ipcRenderer.invoke('update:restart'),
    dismiss: () => ipcRenderer.invoke('update:dismiss'),
    testShow: (payload) => ipcRenderer.invoke('update:test-show', payload),
    requestResize: (height) => ipcRenderer.invoke('update:request-resize', height)
  },

  // Prewarmed list window events (today: hot list only).
  list: {
    onShow: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('list:show', listener)
      return () => ipcRenderer.removeListener('list:show', listener)
    },
    onHidden: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('list:hidden', listener)
      return () => ipcRenderer.removeListener('list:hidden', listener)
    }
  },

  // Theme dev panel (gated by is.dev — never call from production builds)
  themeDev: {
    openPanel: () => ipcRenderer.invoke('themeDev:openPanel'),
    closePanel: () => ipcRenderer.invoke('themeDev:closePanel'),
    isPanelOpen: () => ipcRenderer.invoke('themeDev:isPanelOpen'),
    listPresets: () => ipcRenderer.invoke('themeDev:listPresets'),
    savePreset: (surfaceId, label, config) =>
      ipcRenderer.invoke('themeDev:savePreset', surfaceId, label, config),
    updatePreset: (id, updates) => ipcRenderer.invoke('themeDev:updatePreset', id, updates),
    deletePreset: (id) => ipcRenderer.invoke('themeDev:deletePreset', id)
  }
}

contextBridge.exposeInMainWorld('api', api)
