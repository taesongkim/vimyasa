import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { DataStore, Effects, Group, List, Item, Comment, ItemStatus, JkMode } from '@shared/types'
import { DEFAULT_BUILTIN_SHORTCUTS, DEFAULT_EFFECTS } from '@shared/types'

interface StoreState extends DataStore {
  hydrated: boolean

  // Actions
  hydrate: () => Promise<void>
  refresh: () => Promise<void>

  // Groups
  addGroup: (name: string) => Promise<Group>
  editGroup: (id: string, updates: Partial<Pick<Group, 'name' | 'listIds' | 'sortOrder'>>) => Promise<void>
  removeGroup: (id: string) => Promise<void>

  // Lists
  addList: (groupId: string, name: string) => Promise<List>
  editList: (id: string, updates: Partial<Pick<List, 'name' | 'sortOrder'>>) => Promise<void>
  removeList: (id: string) => Promise<void>

  // Items
  addItem: (listId: string, text: string) => Promise<Item>
  editItem: (id: string, updates: Partial<Pick<Item, 'text' | 'status' | 'listId' | 'sortOrder' | 'archivedAt'>>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  changeItemStatus: (id: string, status: ItemStatus) => Promise<void>
  sendItemToList: (id: string, targetListId: string) => Promise<void>
  reorder: (listId: string, orderedIds: string[], silent?: boolean) => Promise<void>
  archiveItem: (id: string) => Promise<void>
  restoreItem: (id: string) => Promise<void>

  // Comments
  addComment: (itemId: string, text: string, parentId?: string | null) => Promise<Comment>
  editComment: (id: string, text: string) => Promise<void>
  removeComment: (id: string) => Promise<void>

  // J/K mapping
  setJkMode: (mode: JkMode) => Promise<void>

  // Effects (Settings → Advanced)
  setEffects: (updates: Partial<Effects>) => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  hydrated: false,
  schemaVersion: 1,
  groups: [],
  lists: [],
  items: [],
  comments: [],
  shortcuts: [],
  builtinShortcuts: DEFAULT_BUILTIN_SHORTCUTS,
  jkMode: 'standard',
  effects: DEFAULT_EFFECTS,

  hydrate: async () => {
    const data = await window.api.getAll()
    set({ ...data, hydrated: true })
  },

  refresh: async () => {
    const data = await window.api.getAll()
    set(data)
  },

  // ── Groups ────────────────────────────────────────────────────
  addGroup: async (name) => {
    const group = await window.api.createGroup(name)
    set((s) => ({ groups: [...s.groups, group] }))
    return group
  },

  editGroup: async (id, updates) => {
    const group = await window.api.updateGroup(id, updates)
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? group : g))
    }))
  },

  removeGroup: async (id) => {
    await window.api.deleteGroup(id)
    await get().refresh()
  },

  // ── Lists ─────────────────────────────────────────────────────
  addList: async (groupId, name) => {
    const list = await window.api.createList(groupId, name)
    set((s) => ({ lists: [...s.lists, list] }))
    return list
  },

  editList: async (id, updates) => {
    const list = await window.api.updateList(id, updates)
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? list : l))
    }))
  },

  removeList: async (id) => {
    await window.api.deleteList(id)
    await get().refresh()
  },

  // ── Items ─────────────────────────────────────────────────────
  addItem: async (listId, text) => {
    // Optimistic insert: the new item lands in local state synchronously
    // so the UI's "draft → saved item" transition happens in a single
    // render. Without this, there's an async gap between unmounting the
    // draft and receiving the persisted item back over IPC, during
    // which the scroll container shrinks (browser clamps scrollTop) and
    // Framer Motion's layout system runs catch-up animations on
    // existing rows. The IPC response replaces the temp with the real
    // (which may have a different sortOrder, createdAt, etc.); on
    // failure we roll the temp back out.
    const tempId = uuid()
    const inList = get().items.filter((i) => i.listId === listId)
    const nextSortOrder =
      inList.length > 0 ? Math.max(...inList.map((i) => i.sortOrder)) + 1 : 0
    const nowIso = new Date().toISOString()
    const optimistic: Item = {
      id: tempId,
      listId,
      text,
      status: 'default',
      sortOrder: nextSortOrder,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null
    }
    set((s) => ({ items: [...s.items, optimistic] }))

    try {
      // Pass tempId through so the persisted item ends up with the same
      // id we used optimistically. React's reconciliation keys on
      // item.id, so a stable id means no unmount/remount on the
      // temp-→-real swap — no AnimatePresence exit/enter flash on the
      // optimistic ItemRow when the IPC returns.
      const real = await window.api.createItem(listId, text, tempId)
      set((s) => ({
        items: s.items.map((i) => (i.id === tempId ? real : i))
      }))
      return real
    } catch (err) {
      set((s) => ({
        items: s.items.filter((i) => i.id !== tempId)
      }))
      throw err
    }
  },

  editItem: async (id, updates) => {
    // Optimistic: apply updates locally before the IPC. Same pattern as
    // addItem — the user-visible change happens in the same render as
    // the keystroke that triggered it, then the IPC reconciles. Without
    // this every destructive/mutative action shows a 100-300ms pause
    // (the IPC roundtrip) before the row visibly responds. Roll back
    // to the pre-edit item on failure.
    const previous = get().items.find((i) => i.id === id)
    if (previous) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i))
      }))
    }
    try {
      const item = await window.api.updateItem(id, updates)
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? item : i))
      }))
    } catch (err) {
      if (previous) {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? previous : i))
        }))
      }
      throw err
    }
  },

  removeItem: async (id) => {
    // Optimistic delete. Roll back items + comments on failure.
    const previousItems = get().items
    const previousComments = get().comments
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      comments: s.comments.filter((c) => c.itemId !== id)
    }))
    try {
      await window.api.deleteItem(id)
    } catch (err) {
      set({ items: previousItems, comments: previousComments })
      throw err
    }
  },

  changeItemStatus: async (id, status) => {
    const previous = get().items.find((i) => i.id === id)
    if (previous) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, status } : i))
      }))
    }
    try {
      const item = await window.api.setItemStatus(id, status)
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? item : i))
      }))
    } catch (err) {
      if (previous) {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? previous : i))
        }))
      }
      throw err
    }
  },

  sendItemToList: async (id, targetListId) => {
    const previous = get().items.find((i) => i.id === id)
    if (previous) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, listId: targetListId } : i))
      }))
    }
    try {
      const item = await window.api.moveItem(id, targetListId)
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? item : i))
      }))
    } catch (err) {
      if (previous) {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? previous : i))
        }))
      }
      throw err
    }
  },

  reorder: async (listId, orderedIds, silent) => {
    // Optimistic update
    set((s) => ({
      items: s.items.map((item) => {
        const newIndex = orderedIds.indexOf(item.id)
        if (newIndex !== -1) {
          return { ...item, sortOrder: newIndex }
        }
        return item
      })
    }))
    await window.api.reorderItems(listId, orderedIds, silent)
  },

  archiveItem: async (id) => {
    const archivedAt = new Date().toISOString()
    const previous = get().items.find((i) => i.id === id)
    if (previous) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, archivedAt } : i))
      }))
    }
    try {
      const item = await window.api.updateItem(id, { archivedAt })
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? item : i))
      }))
    } catch (err) {
      if (previous) {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? previous : i))
        }))
      }
      throw err
    }
  },

  restoreItem: async (id) => {
    const previous = get().items.find((i) => i.id === id)
    if (previous) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, archivedAt: null } : i))
      }))
    }
    try {
      const item = await window.api.updateItem(id, { archivedAt: null })
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? item : i))
      }))
    } catch (err) {
      if (previous) {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? previous : i))
        }))
      }
      throw err
    }
  },

  // ── Comments ──────────────────────────────────────────────────
  addComment: async (itemId, text, parentId) => {
    const comment = await window.api.createComment(itemId, text, parentId)
    set((s) => ({ comments: [...s.comments, comment] }))
    return comment
  },

  editComment: async (id, text) => {
    const comment = await window.api.updateComment(id, text)
    set((s) => ({
      comments: s.comments.map((c) => (c.id === id ? comment : c))
    }))
  },

  removeComment: async (id) => {
    await window.api.deleteComment(id)
    set((s) => ({
      comments: s.comments.filter((c) => c.id !== id && c.parentId !== id)
    }))
  },

  // ── J/K mapping ───────────────────────────────────────────────
  setJkMode: async (mode) => {
    // Optimistic update so the toggle's highlight flips immediately;
    // the broadcast that follows would do the same anyway.
    set({ jkMode: mode })
    await window.api.setJkMode(mode)
  },

  // ── Effects ────────────────────────────────────────────────────
  setEffects: async (updates) => {
    // Same optimistic posture as setJkMode — flip the toggle UI in
    // this window before the IPC roundtrip; the cross-window
    // broadcast (data-changed → refresh) reconciles other windows.
    set((s) => ({ effects: { ...s.effects, ...updates } }))
    await window.api.setEffects(updates)
  }
}))
