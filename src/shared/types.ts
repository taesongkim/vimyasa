// ── Data Model Types ──────────────────────────────────────────────

export type ItemStatus = 'active' | 'done' | 'hold'

export type ShortcutAction = 'openList' | 'quickAddFixed' | 'quickAddSelect' | 'cycleAllLists'

export interface Group {
  id: string
  name: string
  listIds: string[]
  sortOrder: number
}

export interface List {
  id: string
  groupId: string
  name: string
  icon: string
  sortOrder: number
}

export interface Item {
  id: string
  listId: string
  text: string
  status: ItemStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface Comment {
  id: string
  itemId: string
  parentId: string | null
  text: string
  createdAt: string
  updatedAt: string
}

export interface Shortcut {
  id: string
  action: ShortcutAction
  targetId?: string | null
  accelerator: string
}

export interface BuiltinShortcuts {
  openFirstList: string
  quickAddFirst: string
  quickAddSelect: string
  cycleAllLists: string
}

export const DEFAULT_BUILTIN_SHORTCUTS: BuiltinShortcuts = {
  openFirstList: 'CommandOrControl+Shift+L',
  quickAddFirst: 'CommandOrControl+Shift+N',
  quickAddSelect: 'CommandOrControl+Shift+A',
  cycleAllLists: 'CommandOrControl+Shift+J'
}

export interface DataStore {
  schemaVersion: number
  groups: Group[]
  lists: List[]
  items: Item[]
  comments: Comment[]
  shortcuts: Shortcut[]
  builtinShortcuts: BuiltinShortcuts
}

// ── IPC API Types ─────────────────────────────────────────────────

export interface VimyasaAPI {
  // Lifecycle
  ping: () => Promise<string>

  // Data — read
  getAll: () => Promise<DataStore>

  // Groups
  createGroup: (name: string) => Promise<Group>
  updateGroup: (id: string, updates: Partial<Pick<Group, 'name' | 'listIds' | 'sortOrder'>>) => Promise<Group>
  deleteGroup: (id: string) => Promise<void>

  // Lists
  createList: (groupId: string, name: string, icon?: string) => Promise<List>
  updateList: (id: string, updates: Partial<Pick<List, 'name' | 'icon' | 'sortOrder'>>) => Promise<List>
  deleteList: (id: string) => Promise<void>

  // Items
  createItem: (listId: string, text: string) => Promise<Item>
  updateItem: (id: string, updates: Partial<Pick<Item, 'text' | 'status' | 'listId' | 'sortOrder' | 'archivedAt'>>) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
  setItemStatus: (id: string, status: ItemStatus) => Promise<Item>
  moveItem: (id: string, targetListId: string) => Promise<Item>
  reorderItems: (listId: string, orderedIds: string[]) => Promise<void>

  // Comments
  createComment: (itemId: string, text: string, parentId?: string | null) => Promise<Comment>
  updateComment: (id: string, text: string) => Promise<Comment>
  deleteComment: (id: string) => Promise<void>

  // Shortcuts
  getShortcuts: () => Promise<Shortcut[]>
  createShortcut: (action: ShortcutAction, accelerator: string, targetId?: string | null) => Promise<Shortcut>
  updateShortcut: (id: string, updates: Partial<Pick<Shortcut, 'action' | 'accelerator' | 'targetId'>>) => Promise<Shortcut>
  deleteShortcut: (id: string) => Promise<void>

  // Built-in Shortcuts
  getBuiltinShortcuts: () => Promise<BuiltinShortcuts>
  updateBuiltinShortcuts: (updates: Partial<BuiltinShortcuts>) => Promise<BuiltinShortcuts>

  // Window
  closeWindow: () => Promise<void>
  openListWindow: (listId: string) => Promise<void>
  openQuickAdd: (variant: 'fixed' | 'select', targetListId?: string) => Promise<void>
  openComments: (itemId: string) => Promise<void>
  openSettings: () => Promise<void>
  openArchive: (listId?: string) => Promise<void>
  showContextMenu: (template: any[]) => Promise<void>

  // Events
  onDataChanged: (callback: () => void) => () => void

  // System
  revealDataFile: () => Promise<void>
  getLoginItemSettings: () => Promise<{ openAtLogin: boolean }>
  setLoginItemSettings: (openAtLogin: boolean) => Promise<void>
  importData: (data: DataStore) => Promise<void>
  resetData: () => Promise<void>
}

declare global {
  interface Window {
    api: VimyasaAPI
  }
}
