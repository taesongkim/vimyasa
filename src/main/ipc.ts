import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuid } from 'uuid'
import { store } from './store'
import { createListInStore } from './lists'
import { refreshUserShortcuts, refreshBuiltinShortcuts, pauseGlobalShortcuts, resumeGlobalShortcuts } from './shortcuts'
import { updateTrayMenu } from './tray'
import { orchestrator } from './onboarding'
import type { DataStore, Group, List, Item, Comment, Shortcut, ItemStatus, ShortcutAction, BuiltinShortcuts, JkMode } from '../shared/types'
import {
  getThemesState,
  setThemesState,
  resetThemesState,
  listDevPresets,
  setDevPresets
} from './themes-store'
import type {
  SurfaceConfig,
  SurfaceId,
  ThemesState,
  ThemeDevPreset
} from '../shared/themes'

function now(): string {
  return new Date().toISOString()
}

/** Notify every renderer window that the themes state changed.
 *  Includes the sender — every window converges on the new state via the
 *  same broadcast path, which keeps the dev panel and main app in sync. */
function broadcastThemesChanged(state: ThemesState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('themes:changed', state)
    }
  }
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
      builtinShortcuts: store.get('builtinShortcuts'),
      jkMode: store.get('jkMode') ?? 'standard'
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
  ipcMain.handle('createList', (e, groupId: string, name: string): List => {
    const list = createListInStore(groupId, name)
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
    // Auto-unbind any custom global shortcut that targeted this list.
    // Without this the shortcut's accelerator stays registered with a
    // dangling targetId — pressing it would either no-op (openList) or
    // open whichever list happens to be "first" (quickAddFixed fallback).
    // Drop those shortcuts from the store and re-register so the
    // accelerator is freed up immediately.
    const shortcuts = store.get('shortcuts')
    const remainingShortcuts = shortcuts.filter((s) => s.targetId !== id)
    if (remainingShortcuts.length !== shortcuts.length) {
      store.set('shortcuts', remainingShortcuts)
      refreshUserShortcuts()
    }
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
  })

  // ── Items ───────────────────────────────────────────────────────
  ipcMain.handle('createItem', (e, listId: string, text: string, clientId?: string): Item => {
    const items = store.get('items')
    // Use max(sortOrder) + 1 over *all* items in the list (including
    // archived) rather than the visible count. Archived items keep their
    // sortOrder, so visible-count can be smaller than the max sortOrder
    // and a new item assigned visible-count would land mid-list. Including
    // archived items also keeps later restores collision-free.
    const allInList = items.filter((i) => i.listId === listId)
    const nextSortOrder =
      allInList.length > 0 ? Math.max(...allInList.map((i) => i.sortOrder)) + 1 : 0
    const item: Item = {
      // Accept the renderer's client-side id when present. The optimistic
      // addItem in useStore generates a uuid so the new ItemRow can mount
      // immediately; reusing it here means the persisted item ends up
      // with the same id, so React's reconciliation doesn't see a
      // temp-id-→-real-id swap (which would otherwise cause an
      // AnimatePresence exit/enter flash on the optimistic row).
      id: clientId ?? uuid(),
      listId,
      text,
      status: 'active',
      sortOrder: nextSortOrder,
      createdAt: now(),
      updatedAt: now(),
      archivedAt: null
    }
    store.set('items', [...items, item])
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    // Notify the onboarding orchestrator — its 'capture-add' step counts
    // up to 3 successful adds before auto-advancing. Cheap when no tour is
    // active.
    orchestrator.report({ kind: 'item-added' })
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
    // Same gap-aware sortOrder logic as createItem — count of visible items
    // in the target list isn't a reliable "next bottom" when archived items
    // have left holes.
    const allInTarget = items.filter((i) => i.listId === targetListId)
    const nextSortOrder =
      allInTarget.length > 0
        ? Math.max(...allInTarget.map((i) => i.sortOrder)) + 1
        : 0
    items[idx] = {
      ...items[idx],
      listId: targetListId,
      sortOrder: nextSortOrder,
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
    // Use dot-notation to ensure electron-store persists each field
    for (const [key, value] of Object.entries(updated)) {
      store.set(`builtinShortcuts.${key}` as any, value)
    }
    refreshBuiltinShortcuts()
    broadcastDataChanged(e.sender.id)
    return updated
  })

  // ── J/K mapping mode ────────────────────────────────────────
  ipcMain.handle('setJkMode', (e, mode: JkMode): JkMode => {
    store.set('jkMode', mode)
    broadcastDataChanged(e.sender.id)
    return mode
  })

  // ── Shortcut capture (pause/resume) ─────────────────────────
  ipcMain.handle('pauseGlobalShortcuts', (): void => {
    pauseGlobalShortcuts()
  })

  ipcMain.handle('resumeGlobalShortcuts', (): void => {
    resumeGlobalShortcuts()
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

  // ── Onboarding ──────────────────────────────────────────────────
  // Callout renderer drives the tour through these.
  ipcMain.handle('onboarding:advance', () => orchestrator.advance())
  ipcMain.handle('onboarding:back', () => orchestrator.back())
  ipcMain.handle('onboarding:close', () => orchestrator.close())
  ipcMain.handle('onboarding:replay', () => orchestrator.replay())
  // Pull-style fetch so a freshly-mounted callout renderer can populate
  // immediately, in case it missed the push that fired when its window
  // was created.
  ipcMain.handle('onboarding:get-state', () =>
    orchestrator.getCurrentCalloutPayload()
  )
  // Renderer reports its measured content height; we resize the
  // BrowserWindow to match so longer steps don't clip vertically.
  ipcMain.handle('onboarding:request-resize', (_e, height: number) =>
    orchestrator.setCalloutHeight(height)
  )
  // Dim overlay's dismiss button — tears down the dim only, not the tour.
  ipcMain.handle('onboarding:dismiss-dim', () => orchestrator.dismissDim())

  // ── Themes (production) ─────────────────────────────────────────
  ipcMain.handle('themes:get', (): ThemesState => getThemesState())

  ipcMain.handle('themes:setMasterEnabled', (_e, enabled: boolean): ThemesState => {
    const next = { ...getThemesState(), masterEnabled: enabled }
    const saved = setThemesState(next)
    broadcastThemesChanged(saved)
    return saved
  })

  ipcMain.handle(
    'themes:setSurfaceEnabled',
    (_e, surfaceId: SurfaceId, enabled: boolean): ThemesState => {
      const cur = getThemesState()
      const next: ThemesState = {
        ...cur,
        surfaces: {
          ...cur.surfaces,
          [surfaceId]: { ...cur.surfaces[surfaceId], enabled }
        }
      }
      const saved = setThemesState(next)
      broadcastThemesChanged(saved)
      return saved
    }
  )

  ipcMain.handle(
    'themes:setSurfaceConfig',
    (_e, surfaceId: SurfaceId, config: SurfaceConfig): ThemesState => {
      const cur = getThemesState()
      const next: ThemesState = {
        ...cur,
        surfaces: { ...cur.surfaces, [surfaceId]: config }
      }
      const saved = setThemesState(next)
      broadcastThemesChanged(saved)
      return saved
    }
  )

  ipcMain.handle('themes:reset', (): ThemesState => {
    const saved = resetThemesState()
    broadcastThemesChanged(saved)
    return saved
  })

  // ── Theme dev panel — preset library ────────────────────────────
  // Window plumbing (open/close/isOpen) is registered separately by
  // theme-dev-panel.ts. Preset CRUD lives here because it's pure storage.
  ipcMain.handle('themeDev:listPresets', (): ThemeDevPreset[] => listDevPresets())

  ipcMain.handle(
    'themeDev:savePreset',
    (_e, surfaceId: SurfaceId, label: string, config: SurfaceConfig): ThemeDevPreset => {
      const ts = now()
      const preset: ThemeDevPreset = {
        id: uuid(),
        surfaceId,
        label,
        config,
        createdAt: ts,
        updatedAt: ts
      }
      setDevPresets([...listDevPresets(), preset])
      return preset
    }
  )

  ipcMain.handle(
    'themeDev:updatePreset',
    (
      _e,
      id: string,
      updates: Partial<Pick<ThemeDevPreset, 'label' | 'config'>>
    ): ThemeDevPreset => {
      const presets = listDevPresets()
      const idx = presets.findIndex((p) => p.id === id)
      if (idx === -1) throw new Error(`Preset not found: ${id}`)
      const updated: ThemeDevPreset = {
        ...presets[idx],
        ...updates,
        updatedAt: now()
      }
      const next = [...presets]
      next[idx] = updated
      setDevPresets(next)
      return updated
    }
  )

  ipcMain.handle('themeDev:deletePreset', (_e, id: string): void => {
    setDevPresets(listDevPresets().filter((p) => p.id !== id))
  })

  // Window control handlers — overridden by theme-dev-panel.ts when it
  // initializes. Until then they throw, which is the correct failure
  // mode in production builds (the panel is dev-only).
  ipcMain.handle('themeDev:openPanel', () => {
    throw new Error('Theme dev panel is not available in this build.')
  })
  ipcMain.handle('themeDev:closePanel', () => {
    throw new Error('Theme dev panel is not available in this build.')
  })
  ipcMain.handle('themeDev:isPanelOpen', (): boolean => false)
}
