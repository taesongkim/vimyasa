import Store from 'electron-store'
import { v4 as uuid } from 'uuid'
import type { DataStore } from '../shared/types'
import { DEFAULT_BUILTIN_SHORTCUTS } from '../shared/types'

const defaultGroupId = uuid()
const defaultListId = uuid()

const defaults: DataStore = {
  schemaVersion: 1,
  groups: [
    {
      id: defaultGroupId,
      name: 'Default',
      listIds: [defaultListId],
      sortOrder: 0
    }
  ],
  lists: [
    {
      id: defaultListId,
      groupId: defaultGroupId,
      name: 'Inbox (Rename-able)',
      icon: '📥',
      sortOrder: 0
    }
  ],
  items: [],
  comments: [],
  shortcuts: [],
  builtinShortcuts: DEFAULT_BUILTIN_SHORTCUTS
}

export const store = new Store<DataStore>({
  name: 'data',
  defaults,
  // Migration stub for future schema changes
  migrations: {
    '>=0.1.0': (s: Store<DataStore>) => {
      // v1 schema — no migration needed yet
      if (!s.get('schemaVersion')) {
        s.set('schemaVersion', 1)
      }
      // Ensure builtinShortcuts exists for existing installs
      if (!s.get('builtinShortcuts')) {
        s.set('builtinShortcuts', DEFAULT_BUILTIN_SHORTCUTS)
      }
    }
  }
})
