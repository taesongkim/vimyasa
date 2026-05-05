import Store from 'electron-store'
import { v4 as uuid } from 'uuid'
import type { DataStore, List } from '../shared/types'
import { DEFAULT_BUILTIN_SHORTCUTS, HOT_LIST_ID } from '../shared/types'

const defaultGroupId = uuid()
const defaultListId = uuid()

// Hot list lives outside any user group — its groupId is empty so the
// existing per-group iteration in tray.ts naturally skips it. Stable
// id (HOT_LIST_ID) means UIs can route to it without a uuid lookup.
// sortOrder is a sentinel; the hot list never participates in the
// number-key 1–9 ordering, so the value doesn't matter as long as
// consumers filter by kind.
function buildHotList(): List {
  return {
    id: HOT_LIST_ID,
    groupId: '',
    name: 'Hot',
    kind: 'hot',
    sortOrder: 0
  }
}

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
      kind: 'regular',
      sortOrder: 0
    },
    buildHotList()
  ],
  items: [],
  comments: [],
  shortcuts: [],
  builtinShortcuts: DEFAULT_BUILTIN_SHORTCUTS,
  jkMode: 'standard'
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
      // Default jkMode to vim-standard for existing installs that predate
      // the toggle. New installs already get this from `defaults` above.
      if (!s.get('jkMode')) {
        s.set('jkMode', 'standard')
      }
    },
    // v0.1.6 — hot list (proposals/hot-list.md). Two changes:
    // 1) Backfill `kind: 'regular'` on every existing list so the type
    //    is sound and filter helpers can rely on it.
    // 2) Seed the always-existing hot list (id = HOT_LIST_ID) if it's
    //    not already present. The list ships invisibly in PR 1 — no UI
    //    surfaces it yet — but downstream PRs assume it exists.
    '>=0.1.6': (s: Store<DataStore>) => {
      const lists = s.get('lists') ?? []
      const backfilled: List[] = lists.map((l) => ({
        ...l,
        kind: l.kind ?? 'regular'
      }))
      const hasHot = backfilled.some((l) => l.kind === 'hot')
      const next = hasHot ? backfilled : [...backfilled, buildHotList()]
      s.set('lists', next)
    }
  }
})
