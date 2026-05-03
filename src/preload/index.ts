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
  reorderItems: (listId, orderedIds) => ipcRenderer.invoke('reorderItems', listId, orderedIds),

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

  // Shortcut capture
  pauseGlobalShortcuts: () => ipcRenderer.invoke('pauseGlobalShortcuts'),
  resumeGlobalShortcuts: () => ipcRenderer.invoke('resumeGlobalShortcuts'),

  // Window
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
  openListWindow: (listId, position) => ipcRenderer.invoke('openListWindow', listId, position),
  openQuickAdd: (variant, targetListId) => ipcRenderer.invoke('openQuickAdd', variant, targetListId),
  openComments: (itemId) => ipcRenderer.invoke('openComments', itemId),
  openSettings: () => ipcRenderer.invoke('openSettings'),
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
    hide: () => ipcRenderer.invoke('quickAddHide')
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
