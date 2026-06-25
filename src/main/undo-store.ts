// In-memory undo / redo log for v0.1.8 Undo (per BACKLOG entry,
// dispatched 2026-06-25). Single source of truth lives in main —
// every BrowserWindow's renderer mirrors via the broadcast +
// onChanged subscription pattern that themesStore established.
//
// Scope (locked by BACKLOG):
//   - 5-step ring buffer per stack
//   - Cross-list (one log for hot list + all regular lists)
//   - Session-only (no persistence, no electron-store)
//   - Covered actions: add item, edit text, change status, archive /
//     unarchive, reorder within list, move between lists
//   - Delete permanently is NOT undoable (separate confirm dialog
//     paired with this work)
//
// Each `UndoEntry` carries BOTH the old and new values so the same
// record can be applied in either direction. `performUndo` pops the
// log, applies "old" values, pushes the same entry to the redo
// stack. `performRedo` pops redo, applies "new" values, pushes back
// to undo. Non-undo/redo mutations clear the redo stack (per spec).

import { BrowserWindow } from 'electron'
import type { Item, ItemStatus } from '../shared/types'
import { store } from './store'

const MAX_DEPTH = 5

export type UndoEntry =
  /** Item was just created. Undo → delete it. Redo → re-insert the
   *  full snapshot (so the recreated row has the same id, sortOrder,
   *  createdAt, etc. — keeps React reconciliation stable). */
  | { kind: 'add-item'; item: Item }
  /** Item text was edited (rename committed on Enter). */
  | { kind: 'edit-text'; itemId: string; oldText: string; newText: string }
  /** Status cycled. `oldStatus` / `newStatus` typed as `string` (per
   *  BACKLOG spec) so a future status rename (Hold → In Progress) or
   *  new status doesn't break replay of older entries. */
  | { kind: 'set-status'; itemId: string; oldStatus: string; newStatus: string }
  /** Archive / unarchive both flow through this. `null` ↔ ISO ts. */
  | { kind: 'set-archived-at'; itemId: string; oldVal: string | null; newVal: string | null }
  /** Within-list drag reorder. Records the full ordered id array
   *  before + after so applying either direction is deterministic. */
  | { kind: 'reorder'; listId: string; oldOrder: string[]; newOrder: string[] }
  /** Move item between lists (carry-mode 0-9 send, right-click
   *  "Send to List", future drag-between-lists). */
  | {
      kind: 'move-list'
      itemId: string
      oldListId: string
      oldSortOrder: number
      newListId: string
      newSortOrder: number
    }

export interface UndoStateSnapshot {
  undoDepth: number
  redoDepth: number
}

const state: {
  undoLog: UndoEntry[]
  redoStack: UndoEntry[]
} = {
  undoLog: [],
  redoStack: []
}

function nowIso(): string {
  return new Date().toISOString()
}

function snapshot(): UndoStateSnapshot {
  return {
    undoDepth: state.undoLog.length,
    redoDepth: state.redoStack.length
  }
}

function broadcastUndo(): void {
  const payload = snapshot()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('undo:changed', payload)
    }
  }
}

export function getUndoSnapshot(): UndoStateSnapshot {
  return snapshot()
}

/** Push a fresh undo entry from a user action. Clears the redo
 *  stack — per spec, any non-undo/redo mutation invalidates the
 *  forward history. */
export function captureUndoEntry(entry: UndoEntry): void {
  state.undoLog.push(entry)
  if (state.undoLog.length > MAX_DEPTH) state.undoLog.shift()
  if (state.redoStack.length > 0) state.redoStack = []
  broadcastUndo()
}

/** Clear only the redo stack. Used by non-undoable mutations
 *  (deleteItem) that still need to invalidate forward history. */
export function clearRedoStack(): void {
  if (state.redoStack.length > 0) {
    state.redoStack = []
    broadcastUndo()
  }
}

/** Drop any undo / redo entries that reference an item id — useful
 *  when the item is permanently deleted, so a later undo of an
 *  unrelated edit doesn't try to no-op against a tombstone forever.
 *  Reorder entries are pruned if the deleted id appears in either
 *  order array. */
export function pruneEntriesForItem(itemId: string): void {
  const drop = (e: UndoEntry): boolean => {
    if (e.kind === 'add-item') return e.item.id === itemId
    if (e.kind === 'reorder') {
      return e.oldOrder.includes(itemId) || e.newOrder.includes(itemId)
    }
    if ('itemId' in e) return e.itemId === itemId
    return false
  }
  const beforeU = state.undoLog.length
  const beforeR = state.redoStack.length
  state.undoLog = state.undoLog.filter((e) => !drop(e))
  state.redoStack = state.redoStack.filter((e) => !drop(e))
  if (state.undoLog.length !== beforeU || state.redoStack.length !== beforeR) {
    broadcastUndo()
  }
}

/** Apply an entry in one direction. The same record drives both
 *  undo (use OLD) and redo (use NEW). */
function applyEntry(entry: UndoEntry, direction: 'undo' | 'redo'): void {
  const items = store.get('items')
  switch (entry.kind) {
    case 'add-item': {
      if (direction === 'undo') {
        store.set(
          'items',
          items.filter((i) => i.id !== entry.item.id)
        )
      } else {
        // Re-insert with the original snapshot. If for some reason
        // the id collides (shouldn't — undo just removed it), filter
        // first to keep the array unique.
        const withoutDup = items.filter((i) => i.id !== entry.item.id)
        store.set('items', [...withoutDup, entry.item])
      }
      return
    }
    case 'edit-text': {
      const idx = items.findIndex((i) => i.id === entry.itemId)
      if (idx === -1) return
      const text = direction === 'undo' ? entry.oldText : entry.newText
      items[idx] = { ...items[idx], text, updatedAt: nowIso() }
      store.set('items', items)
      return
    }
    case 'set-status': {
      const idx = items.findIndex((i) => i.id === entry.itemId)
      if (idx === -1) return
      const status = direction === 'undo' ? entry.oldStatus : entry.newStatus
      items[idx] = {
        ...items[idx],
        status: status as ItemStatus,
        updatedAt: nowIso()
      }
      store.set('items', items)
      return
    }
    case 'set-archived-at': {
      const idx = items.findIndex((i) => i.id === entry.itemId)
      if (idx === -1) return
      const archivedAt = direction === 'undo' ? entry.oldVal : entry.newVal
      items[idx] = { ...items[idx], archivedAt, updatedAt: nowIso() }
      store.set('items', items)
      return
    }
    case 'reorder': {
      const order = direction === 'undo' ? entry.oldOrder : entry.newOrder
      order.forEach((id, i) => {
        const idx = items.findIndex((it) => it.id === id)
        if (idx !== -1) items[idx] = { ...items[idx], sortOrder: i }
      })
      store.set('items', items)
      return
    }
    case 'move-list': {
      const idx = items.findIndex((i) => i.id === entry.itemId)
      if (idx === -1) return
      const listId = direction === 'undo' ? entry.oldListId : entry.newListId
      const sortOrder =
        direction === 'undo' ? entry.oldSortOrder : entry.newSortOrder
      items[idx] = {
        ...items[idx],
        listId,
        sortOrder,
        updatedAt: nowIso()
      }
      store.set('items', items)
      return
    }
  }
}

/** Pop the most recent undo entry, apply its "old" side, and push
 *  the same entry to the redo stack. Returns the affected item id
 *  (when knowable) so the caller can move focus / scroll the row
 *  into view, or `null` if there was nothing to undo. */
export function performUndo(): { affectedItemId: string | null } | null {
  if (state.undoLog.length === 0) return null
  const entry = state.undoLog.pop()!
  applyEntry(entry, 'undo')
  state.redoStack.push(entry)
  if (state.redoStack.length > MAX_DEPTH) state.redoStack.shift()
  broadcastUndo()
  return { affectedItemId: affectedId(entry) }
}

export function performRedo(): { affectedItemId: string | null } | null {
  if (state.redoStack.length === 0) return null
  const entry = state.redoStack.pop()!
  applyEntry(entry, 'redo')
  state.undoLog.push(entry)
  if (state.undoLog.length > MAX_DEPTH) state.undoLog.shift()
  broadcastUndo()
  return { affectedItemId: affectedId(entry) }
}

function affectedId(entry: UndoEntry): string | null {
  if (entry.kind === 'add-item') return entry.item.id
  if (entry.kind === 'reorder') return null
  return entry.itemId
}
