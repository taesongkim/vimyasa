import { contextBridge, ipcRenderer } from 'electron'
import type { VimyasaAPI } from '../shared/types'

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
  createList: (groupId, name, icon) => ipcRenderer.invoke('createList', groupId, name, icon),
  updateList: (id, updates) => ipcRenderer.invoke('updateList', id, updates),
  deleteList: (id) => ipcRenderer.invoke('deleteList', id),

  // Items
  createItem: (listId, text) => ipcRenderer.invoke('createItem', listId, text),
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

  // Window
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
  openListWindow: (listId) => ipcRenderer.invoke('openListWindow', listId),
  openQuickAdd: (variant, targetListId) => ipcRenderer.invoke('openQuickAdd', variant, targetListId),
  openComments: (itemId) => ipcRenderer.invoke('openComments', itemId),
  openSettings: () => ipcRenderer.invoke('openSettings'),
  openArchive: (listId) => ipcRenderer.invoke('openArchive', listId),
  showContextMenu: (template) => ipcRenderer.invoke('showContextMenu', template),

  // Events
  onDataChanged: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('data-changed', listener)
    return () => {
      ipcRenderer.removeListener('data-changed', listener)
    }
  },

  // System
  revealDataFile: () => ipcRenderer.invoke('revealDataFile'),
  getLoginItemSettings: () => ipcRenderer.invoke('getLoginItemSettings'),
  setLoginItemSettings: (openAtLogin) => ipcRenderer.invoke('setLoginItemSettings', openAtLogin),
  importData: (data) => ipcRenderer.invoke('importData', data),
  resetData: () => ipcRenderer.invoke('resetData')
}

contextBridge.exposeInMainWorld('api', api)
