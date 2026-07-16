import { ipcMain, BrowserWindow, shell, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { execSync } from 'node:child_process'
import { v4 as uuid } from 'uuid'
import { store } from './store'
import { createListInStore } from './lists'
import { refreshUserShortcuts, refreshBuiltinShortcuts, pauseGlobalShortcuts, resumeGlobalShortcuts } from './shortcuts'
import { updateTrayMenu } from './tray'
import { getCurrentReleaseNotes } from './release-notes'
import { orchestrator } from './onboarding'
import type { DataStore, Effects, FeedbackConfig, Group, List, Item, Comment, Shortcut, ItemStatus, ShortcutAction, BuiltinShortcuts, JkMode } from '../shared/types'
import { DEFAULT_EFFECTS } from '../shared/types'
import {
  canSendFeedback,
  getFeedbackConfig,
  recordFeedbackSend,
  setFeedbackConfig
} from './feedback-store'
import { submitFeedback } from './feedback-send'
import {
  captureUndoEntry,
  clearRedoStack,
  getUndoSnapshot,
  performRedo,
  performUndo,
  pruneEntriesForItem
} from './undo-store'
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
  ThemeDevPreset,
  ThemeEventName,
  ThemeEventPayload,
  EffectsConfig,
  Appearance
} from '../shared/themes'
import { APPEARANCE_VALUES } from '../shared/themes'
import { applyNativeThemeSource } from './appearance'

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

/** Generic "an item just landed in this list" broadcast. Cross-window
 *  IPC: any open ListWindow whose active listId === toListId can react
 *  with the receipt pulse + scroll-into-view. Fires from wherever an
 *  item changes lists — moveItem today; future drag-between-lists
 *  and bulk-move flows should fire it too so the visual treatment
 *  comes along for free.
 *
 *  Direction logic mirrors `getSendDirection` in
 *  `src/renderer/src/hooks/useCarryAnimation.ts`: hot list ranks
 *  highest, otherwise sortOrder. To-hot = right; from-hot = left;
 *  target.sortOrder > source.sortOrder = right, else left. Reproduced
 *  in main rather than imported because the renderer-side helper
 *  takes a List type and runs in a window's React tree. */
function computeArrivalDirection(
  fromListId: string,
  toListId: string,
  lists: List[]
): 'left' | 'right' {
  const from = lists.find((l) => l.id === fromListId)
  const to = lists.find((l) => l.id === toListId)
  if (!from || !to) return 'right' // Defensive default; should not happen
  if (to.kind === 'hot') return 'right'
  if (from.kind === 'hot') return 'left'
  return to.sortOrder > from.sortOrder ? 'right' : 'left'
}

interface ItemArrivedPayload {
  itemId: string
  fromListId: string
  toListId: string
  direction: 'left' | 'right'
}

function broadcastItemArrived(payload: ItemArrivedPayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('item-arrived', payload)
    }
  }
}

/** Fan a theme trigger event out to every renderer (including the sender) so
 *  GlowSurface instances on any window can pulse in response — e.g.,
 *  QuickAdd submitting fires on the list window too. Sender included so a
 *  surface in the SAME window as the action can also respond. Metadata
 *  (e.g. itemId) lets per-row GlowSurface filter to its own item rather
 *  than firing on every change in the list. */
function broadcastThemeEvent(
  name: ThemeEventName,
  metadata?: Omit<ThemeEventPayload, 'name'>
): void {
  const payload: ThemeEventPayload = { name, ...metadata }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('theme:event', payload)
    }
  }
}

export function registerIpcHandlers(): void {
  // ── Lifecycle ───────────────────────────────────────────────────
  ipcMain.handle('ping', () => 'pong')

  // ── App info (version / dev-build info) ─────────────────────────
  // Surface app metadata for the Settings → About section so the user
  // can verify which build they're running. In dev, also surfaces the
  // current git branch + short SHA so multi-worktree iteration is
  // self-evidently labeled in the UI. Production builds skip the git
  // shell-out (git isn't reliably present in shipped binaries; the
  // version alone is enough).
  ipcMain.handle('app:getInfo', () => {
    const baseInfo = {
      version: app.getVersion(),
      isDev: is.dev,
      electronVersion: process.versions.electron,
      gitBranch: null as string | null,
      gitSha: null as string | null
    }
    if (!is.dev) return baseInfo
    try {
      const opts = { cwd: app.getAppPath(), encoding: 'utf8' as const, timeout: 1000 }
      const branch = execSync('git rev-parse --abbrev-ref HEAD', opts).trim()
      const sha = execSync('git rev-parse --short HEAD', opts).trim()
      return { ...baseInfo, gitBranch: branch, gitSha: sha }
    } catch {
      // Git not available or not in a repo — fall back to base info.
      // No log spam; this is dev-only convenience metadata.
      return baseInfo
    }
  })

  // Fetch the current version's GitHub release notes for the
  // Settings → About tab. Cached per version on disk (see
  // release-notes.ts) so it's a once-ever network hit per version and
  // works offline afterward.
  ipcMain.handle('about:getCurrentReleaseNotes', () => getCurrentReleaseNotes())

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
      jkMode: store.get('jkMode') ?? 'standard',
      effects: { ...DEFAULT_EFFECTS, ...(store.get('effects') ?? {}) }
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
    // The hot list is an always-existing surface; deleting it would
    // leave the app in an unrecoverable state until the next migration
    // runs. The Settings → Lists UI already filters it out so this
    // path shouldn't be reachable from chrome, but the IPC is the
    // ultimate guard.
    const target = store.get('lists').find((l) => l.id === id)
    if (target?.kind === 'hot') {
      throw new Error('Cannot delete the hot list')
    }
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
    // Cascade: prune any undo / redo entries that referenced the
    // now-dead items so a later undo doesn't try to revive them
    // into a list that no longer exists.
    for (const itemId of itemIds) pruneEntriesForItem(itemId)
    clearRedoStack()
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
    captureUndoEntry({ kind: 'add-item', item })
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    broadcastThemeEvent('item-added', { itemId: item.id })
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
    const prev = items[idx]
    items[idx] = { ...prev, ...updates, updatedAt: now() }
    store.set('items', items)
    // Capture undo entries for text + archive/unarchive edits. Other
    // partial updates (e.g. listId / sortOrder when the renderer's
    // optimistic update calls editItem under the hood) flow through
    // moveItem / reorderItems IPCs which capture their own entries
    // there — undoing them here would double-record.
    if (typeof updates.text === 'string' && updates.text !== prev.text) {
      captureUndoEntry({
        kind: 'edit-text',
        itemId: id,
        oldText: prev.text,
        newText: updates.text
      })
    }
    if ('archivedAt' in updates && updates.archivedAt !== prev.archivedAt) {
      captureUndoEntry({
        kind: 'set-archived-at',
        itemId: id,
        oldVal: prev.archivedAt ?? null,
        newVal: updates.archivedAt ?? null
      })
    }
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    // Distinguish edits-of-text from other updates so the trigger config
    // can target text edits specifically. Status changes flow through
    // setItemStatus and emit their own event there.
    if (typeof updates.text === 'string' && updates.text !== prev.text) {
      broadcastThemeEvent('item-edit-committed', { itemId: id })
    }
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
    // Permanent delete is intentionally NOT undoable (renderer paired
    // a confirmation dialog with this path). The action still
    // invalidates forward history per spec — and we prune any
    // dangling undo / redo entries that reference this id so a later
    // undo doesn't try to revive a tombstoned row.
    pruneEntriesForItem(id)
    clearRedoStack()
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
  })

  ipcMain.handle('setItemStatus', (e, id: string, status: ItemStatus): Item => {
    const items = store.get('items')
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item not found: ${id}`)
    const oldStatus = items[idx].status
    items[idx] = { ...items[idx], status, updatedAt: now() }
    store.set('items', items)
    if (oldStatus !== status) {
      captureUndoEntry({
        kind: 'set-status',
        itemId: id,
        oldStatus,
        newStatus: status
      })
    }
    updateTrayMenu()
    broadcastDataChanged(e.sender.id)
    broadcastThemeEvent('item-status-changed', { itemId: id })
    return items[idx]
  })

  ipcMain.handle('moveItem', (e, id: string, targetListId: string): Item => {
    const items = store.get('items')
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item not found: ${id}`)
    const fromListId = items[idx].listId
    const oldSortOrder = items[idx].sortOrder
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
    if (fromListId !== targetListId) {
      captureUndoEntry({
        kind: 'move-list',
        itemId: id,
        oldListId: fromListId,
        oldSortOrder,
        newListId: targetListId,
        newSortOrder: nextSortOrder
      })
    }
    broadcastDataChanged(e.sender.id)
    // Tell any list window whose active listId === targetListId that
    // the item landed there. Skipped when fromListId === targetListId
    // (degenerate same-list move; no visual signal warranted). Fires
    // even when the target list isn't currently open — receivers
    // filter by active listId on their end.
    if (fromListId !== targetListId) {
      broadcastItemArrived({
        itemId: id,
        fromListId,
        toListId: targetListId,
        direction: computeArrivalDirection(fromListId, targetListId, store.get('lists'))
      })
    }
    return items[idx]
  })

  ipcMain.handle(
    'reorderItems',
    (e, listId: string, orderedIds: string[], silent?: boolean): void => {
      const items = store.get('items')
      // Capture the old order of the SAME ids (in the same scope) so
      // undo restores their previous relative positions. Other items
      // in the list (not in orderedIds) are untouched by reorder so
      // we don't need to record them.
      const oldOrder = [...orderedIds]
        .map((id) => ({ id, sortOrder: items.find((i) => i.id === id)?.sortOrder ?? 0 }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((x) => x.id)
      orderedIds.forEach((id, index) => {
        const idx = items.findIndex((i) => i.id === id)
        if (idx !== -1) {
          items[idx] = { ...items[idx], sortOrder: index }
        }
      })
      store.set('items', items)
      // Only push an entry if the order actually changed AND the
      // caller didn't opt out via `silent`. The carry-mode flow uses
      // silent=true on every j/k step (the whole session captures one
      // aggregate entry on commit instead of N per-keystroke entries),
      // and the Cmd+Z-during-carry restore also uses silent=true so
      // it doesn't push a "restore" entry into the log.
      const changed = oldOrder.some((id, i) => id !== orderedIds[i])
      if (changed && !silent) {
        captureUndoEntry({
          kind: 'reorder',
          listId,
          oldOrder,
          newOrder: [...orderedIds]
        })
      }
      broadcastDataChanged(e.sender.id)
    }
  )

  // Manually push a 'reorder' undo entry without applying the move —
  // the data is already at `newOrder`. Used by carry-mode commit
  // (Enter / Esc land) to record the aggregate move that the silent
  // j/k chain performed, as a single user-perceived action.
  ipcMain.handle(
    'undo:push-reorder-entry',
    (_e, listId: string, oldOrder: string[], newOrder: string[]): void => {
      const changed = oldOrder.some((id, i) => id !== newOrder[i])
      if (!changed) return
      captureUndoEntry({
        kind: 'reorder',
        listId,
        oldOrder: [...oldOrder],
        newOrder: [...newOrder]
      })
    }
  )

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

  // ── Effects (Settings → Advanced) ──────────────────────────────
  // Partial update so a toggle UI can flip a single flag without
  // resending the whole object. Broadcast EXcludes sender so the
  // toggle's optimistic update doesn't double-render its own UI;
  // every other window picks up the new state via data-changed →
  // refresh().
  ipcMain.handle('setEffects', (e, updates: Partial<Effects>): Effects => {
    const current = (store.get('effects') ?? DEFAULT_EFFECTS) as Effects
    const next: Effects = { ...DEFAULT_EFFECTS, ...current, ...updates }
    store.set('effects', next)
    broadcastDataChanged(e.sender.id)
    return next
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

  ipcMain.handle(
    'themes:setEffects',
    (_e, partial: Partial<EffectsConfig>): ThemesState => {
      const cur = getThemesState()
      const next: ThemesState = {
        ...cur,
        effects: { ...cur.effects, ...partial }
      }
      const saved = setThemesState(next)
      broadcastThemesChanged(saved)
      return saved
    }
  )

  ipcMain.handle(
    'themes:setAppearance',
    (_e, appearance: Appearance): ThemesState => {
      // Validate input; ignore unrecognized values silently and return
      // current state. The Settings → Appearance UI only sends one of
      // the three valid values, so this is just defense-in-depth against
      // a malformed renderer call.
      if (!(APPEARANCE_VALUES as readonly string[]).includes(appearance)) {
        return getThemesState()
      }
      const cur = getThemesState()
      const next: ThemesState = { ...cur, appearance }
      const saved = setThemesState(next)
      // Sync Electron's native theme source so vibrancy + the
      // renderer's `prefers-color-scheme` media query flip in lockstep.
      // Auto mode routes to 'system' so mid-session OS Light↔Dark
      // toggles propagate live. See BACKLOG hotfix (2026-07-15).
      applyNativeThemeSource(saved.appearance)
      broadcastThemesChanged(saved)
      return saved
    }
  )

  ipcMain.handle('themes:reset', (): ThemesState => {
    const saved = resetThemesState()
    // Reset can change appearance back to the default; keep nativeTheme
    // in sync with the same call path the setter uses.
    applyNativeThemeSource(saved.appearance)
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

  // ── Theme events: manual fire from dev panel ────────────────────
  // Renderer can ask main to broadcast a named theme event to all
  // windows. Used by the dev panel's "Test fire" button so the user
  // can verify trigger config without performing the underlying app
  // action (e.g., adding an item).
  ipcMain.handle('themeEvent:fire', (_e, name: ThemeEventName): void => {
    broadcastThemeEvent(name)
  })

  // ── QuickAdd → list window: scroll-into-view hint ───────────────
  // Fires after the entry form successfully adds an item. We re-broadcast
  // so any open list window can find the new item by id and scroll it
  // into view. Pure UX hint — persistence already happened in createItem;
  // this is just "hey, the user just added that one from the entry form,
  // make sure they can see it."
  ipcMain.handle(
    'quickadd:notify-item-added',
    (_e, itemId: string, listId: string): void => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('quickadd:item-added', { itemId, listId })
        }
      }
    }
  )

  // ── Feedback messenger ──────────────────────────────────────────
  // PR 1: config + clientId infrastructure. No send flow yet — PR 2
  // wires the renderer window and the POST to the Worker. canSend /
  // recordSend are exposed now so PR 2 can plug straight in.
  ipcMain.handle('feedback:get-config', (): FeedbackConfig => getFeedbackConfig())

  ipcMain.handle(
    'feedback:set-config',
    (_e, updates: Partial<Pick<FeedbackConfig, 'senderName' | 'dailyLimit'>>): FeedbackConfig =>
      setFeedbackConfig(updates ?? {})
  )

  ipcMain.handle('feedback:can-send', () => canSendFeedback())

  ipcMain.handle('feedback:record-send', (): void => {
    recordFeedbackSend()
  })

  // POST → Worker → Resend. Composes payload in main; renderer never
  // sees the Worker URL or the payload metadata. canSend + recordSend
  // are enforced inside submitFeedback so the renderer can't bypass
  // the daily limit by skipping the can-send IPC.
  ipcMain.handle('feedback:send', (_e, message: string) => submitFeedback(message))

  // ── Undo / redo ─────────────────────────────────────────────────
  // In-memory cross-window log. Pull-style fetch for windows mounted
  // after the broadcast they would've heard; the onChanged event in
  // preload pushes future updates. perform-undo / -redo apply the
  // inverse against the data store directly + broadcast both
  // data-changed and undo:changed.
  ipcMain.handle('undo:get', () => getUndoSnapshot())
  ipcMain.handle('undo:perform-undo', () => {
    const result = performUndo()
    // Broadcast to EVERY window including the sender — the inverse
    // ran in main, not in the caller's renderer, so the caller also
    // needs to refresh. broadcastDataChanged() with no sender id
    // hits every window.
    if (result) broadcastDataChanged()
    return result
  })
  ipcMain.handle('undo:perform-redo', () => {
    const result = performRedo()
    if (result) broadcastDataChanged()
    return result
  })

  // ── System: external links ──────────────────────────────────────
  // Used by attribution links in the Themes tab. Validates the URL
  // protocol so a renderer can never coerce us into opening file:// or
  // an unknown scheme, even if the URL is dynamic.
  ipcMain.handle('openExternal', (_e, url: string): void => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return
      shell.openExternal(url)
    } catch {
      // Malformed URL — ignore.
    }
  })
}
