import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuid } from 'uuid'
import { store } from './store'
import { refreshUserShortcuts, refreshBuiltinShortcuts } from './shortcuts'
import { updateTrayMenu } from './tray'
import type { DataStore, Group, List, Item, Comment, Shortcut, ItemStatus, ShortcutAction, BuiltinShortcuts } from '../shared/types'

function now(): string {
  return new Date().toISOString()
}

/** Notify all renderer windows that data has changed so they can refresh */
function broadcastDataChanged(senderWebContentsId?: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents.id !== senderWebContentsId) {
      win.webContents.send('data-changed')
    }
  }
}

export function registerIpcHandlers(): void {
  // ── Lifecycle ───────────────────────────────────────────────────
  ipcMain.handle('ping', () => 'pong')

  // ── Data — read ─────────────────────────────────────────────────
  ipcMain.handle('getAll', (): DataStore => {
    return {
      schemaVersion: store.get('schemaVersion'),
      groups: store.get('groups'),
      lists: store.get('lists'),
      items: store.get('items'),
      comments: store.get('comments'),
      shortcuts: store.get('shortcuts'),
      builtinShortcuts: store.get('builtinShortcuts')
    }
  })

  // ── Groups ──────────────────────────────────────────────────────
  ipcMain.handle('createGroup', (e, name: string): Group => {
    const groups = store.get('groups')
    const group: Group = {
      id: uuid(),
      name,
      listIds: [],
      sortOrder: groups.length
    }
    store.set('groups', [...groups, group])
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return group
  })

  ipcMain.handle('updateGroup', (e, id: string, updates: Partial<Group>): Group => {
    const groups = store.get('groups')
    const idx = groups.findIndex((g) => g.id === id)
    if (idx === -1) throw new Error(`Group not found: ${id}`)
    groups[idx] = { ...groups[idx], ...updates }
    store.set('groups', groups)
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return groups[idx]
  })

  ipcMain.handle('deleteGroup', (e, id: string): void => {
    const groups = store.get('groups').filter((g) => g.id !== id)
    const lists = store.get('lists')
    const listIdsToDelete = lists.filter((l) => l.groupId === id).map((l) => l.id)
    store.set('groups', groups)
    store.set(
      'lists',
      lists.filter((l) => l.groupId !== id)
    )
    store.set(
      'items',
      store.get('items').filter((i) => !listIdsToDelete.includes(i.listId))
    )
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
  })

  // ── Lists ───────────────────────────────────────────────────────
  ipcMain.handle('createList', (e, groupId: string, name: string, icon?: string): List => {
    const lists = store.get('lists')
    const list: List = {
      id: uuid(),
      groupId,
      name,
      icon: icon || '📋',
      sortOrder: lists.filter((l) => l.groupId === groupId).length
    }
    store.set('lists', [...lists, list])

    // Add list ID to group
    const groups = store.get('groups')
    const gIdx = groups.findIndex((g) => g.id === groupId)
    if (gIdx !== -1) {
      groups[gIdx].listIds.push(list.id)
      store.set('groups', groups)
    }

    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return list
  })

  ipcMain.handle('updateList', (e, id: string, updates: Partial<List>): List => {
    const lists = store.get('lists')
    const idx = lists.findIndex((l) => l.id === id)
    if (idx === -1) throw new Error(`List not found: ${id}`)
    lists[idx] = { ...lists[idx], ...updates }
    store.set('lists', lists)
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return lists[idx]
  })

  ipcMain.handle('deleteList', (e, id: string): void => {
    const lists = store.get('lists').filter((l) => l.id !== id)
    store.set('lists', lists)
    // Remove from group
    const groups = store.get('groups').map((g) => ({
      ...g,
      listIds: g.listIds.filter((lid) => lid !== id)
    }))
    store.set('groups', groups)
    // Delete items
    const itemIds = store
      .get('items')
      .filter((i) => i.listId === id)
      .map((i) => i.id)
    store.set(
      'items',
      store.get('items').filter((i) => i.listId !== id)
    )
    // Delete comments on those items
    store.set(
      'comments',
      store.get('comments').filter((c) => !itemIds.includes(c.itemId))
    )
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
  })

  // ── Items ───────────────────────────────────────────────────────
  ipcMain.handle('createItem', (e, listId: string, text: string): Item => {
    const items = store.get('items')
    const listItems = items.filter((i) => i.listId === listId && !i.archivedAt)
    const item: Item = {
      id: uuid(),
      listId,
      text,
      status: 'active',
      sortOrder: listItems.length,
      createdAt: now(),
      updatedAt: now(),
      archivedAt: null
    }
    store.set('items', [...items, item])
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return item
  })

  ipcMain.handle('updateItem', (e, id: string, updates: Partial<Item>): Item => {
    const items = store.get('items')
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item not found: ${id}`)
    items[idx] = { ...items[idx], ...updates, updatedAt: now() }
    store.set('items', items)
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return items[idx]
  })

  ipcMain.handle('deleteItem', (e, id: string): void => {
    store.set(
      'items',
      store.get('items').filter((i) => i.id !== id)
    )
    store.set(
      'comments',
      store.get('comments').filter((c) => c.itemId !== id)
    )
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
  })

  ipcMain.handle('setItemStatus', (e, id: string, status: ItemStatus): Item => {
    const items = store.get('items')
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item not found: ${id}`)
    items[idx] = { ...items[idx], status, updatedAt: now() }
    store.set('items', items)
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    return items[idx]
  })

  ipcMain.handle('moveItem', (e, id: string, targetListId: string): Item => {
    const items = store.get('items')
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item not found: ${id}`)
    const targetItems = items.filter((i) => i.listId === targetListId && !i.archivedAt)
    items[idx] = {
      ...items[idx],
      listId: targetListId,
      sortOrder: targetItems.length,
      updatedAt: now()
    }
    store.set('items', items)
    broadcastDataChanged(e.sender.id)
    return items[idx]
  })

  ipcMain.handle('reorderItems', (e, listId: string, orderedIds: string[]): void => {
    const items = store.get('items')
    orderedIds.forEach((id, index) => {
      const idx = items.findIndex((i) => i.id === id)
      if (idx !== -1) {
        items[idx] = { ...items[idx], sortOrder: index }
      }
    })
    store.set('items', items)
    broadcastDataChanged(e.sender.id)
  })

  // ── Comments ────────────────────────────────────────────────────
  ipcMain.handle(
    'createComment',
    (e, itemId: string, text: string, parentId?: string | null): Comment => {
      const comments = store.get('comments')
      const comment: Comment = {
        id: uuid(),
        itemId,
        parentId: parentId || null,
        text,
        createdAt: now(),
        updatedAt: now()
      }
      store.set('comments', [...comments, comment])
      broadcastDataChanged(e.sender.id)
      return comment
    }
  )

  ipcMain.handle('updateComment', (e, id: string, text: string): Comment => {
    const comments = store.get('comments')
    const idx = comments.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error(`Comment not found: ${id}`)
    comments[idx] = { ...comments[idx], text, updatedAt: now() }
    store.set('comments', comments)
    broadcastDataChanged(e.sender.id)
    return comments[idx]
  })

  ipcMain.handle('deleteComment', (e, id: string): void => {
    const comments = store.get('comments')
    store.set(
      'comments',
      comments.filter((c) => c.id !== id && c.parentId !== id)
    )
    broadcastDataChanged(e.sender.id)
  })

  // ── Shortcuts ───────────────────────────────────────────────────
  ipcMain.handle('getShortcuts', (): Shortcut[] => {
    return store.get('shortcuts')
  })

  ipcMain.handle(
    'createShortcut',
    (e, action: ShortcutAction, accelerator: string, targetId?: string | null): Shortcut => {
      const shortcuts = store.get('shortcuts')
      const shortcut: Shortcut = {
        id: uuid(),
        action,
        targetId: targetId || null,
        accelerator
      }
      store.set('shortcuts', [...shortcuts, shortcut])
      refreshUserShortcuts()
      broadcastDataChanged(e.sender.id)
      return shortcut
    }
  )

  ipcMain.handle(
    'updateShortcut',
    (e, id: string, updates: Partial<Shortcut>): Shortcut => {
      const shortcuts = store.get('shortcuts')
      const idx = shortcuts.findIndex((s) => s.id === id)
      if (idx === -1) throw new Error(`Shortcut not found: ${id}`)
      shortcuts[idx] = { ...shortcuts[idx], ...updates }
      store.set('shortcuts', shortcuts)
      refreshUserShortcuts()
      broadcastDataChanged(e.sender.id)
      return shortcuts[idx]
    }
  )

  ipcMain.handle('deleteShortcut', (e, id: string): void => {
    store.set(
      'shortcuts',
      store.get('shortcuts').filter((s) => s.id !== id)
    )
    refreshUserShortcuts()
    broadcastDataChanged(e.sender.id)
  })

  // ── Built-in Shortcuts ─────────────────────────────────────────
  ipcMain.handle('getBuiltinShortcuts', (): BuiltinShortcuts => {
    return store.get('builtinShortcuts') as BuiltinShortcuts
  })

  ipcMain.handle('updateBuiltinShortcuts', (e, updates: Partial<BuiltinShortcuts>): BuiltinShortcuts => {
    const current = store.get('builtinShortcuts') as BuiltinShortcuts
    const updated = { ...current, ...updates }
    store.set('builtinShortcuts' as any, updated)
    refreshBuiltinShortcuts()
    broadcastDataChanged(e.sender.id)
    return updated
  })

  // ── Data import/export/reset ──────────────────────────────────
  ipcMain.handle('importData', (e, data: any): void => {
    if (data.groups) store.set('groups', data.groups)
    if (data.lists) store.set('lists', data.lists)
    if (data.items) store.set('items', data.items)
    if (data.comments) store.set('comments', data.comments)
    if (data.shortcuts) store.set('shortcuts', data.shortcuts)
    if (data.schemaVersion) store.set('schemaVersion', data.schemaVersion)
    broadcastDataChanged(e.sender.id)
  })

  ipcMain.handle('resetData', (e): void => {
    store.clear()
    broadcastDataChanged(e.sender.id)
  })
}
