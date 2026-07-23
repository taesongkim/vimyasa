import Store from 'electron-store'
import { v4 as uuid } from 'uuid'
import type { DataStore, Effects, Item, ItemStatus, List } from '../shared/types'
import { DEFAULT_BUILTIN_SHORTCUTS, DEFAULT_EFFECTS, HOT_LIST_ID } from '../shared/types'

const defaultGroupId = uuid()
const defaultListId = uuid()

// Hot list lives outside any user group — its groupId is empty so the
// existing per-group iteration in tray.ts naturally skips it. Stable
// id (HOT_LIST_ID) means UIs can route to it without a uuid lookup.
// sortOrder is a sentinel; the hot list never participates in the
// number-key 1–9 ordering, so the value doesn't matter as long as
// consumers filter by kind.
// User-facing display name for the hot list. Centralized so the seed,
// the runtime backfill, and any future rename guard agree on the same
// canonical value.
const HOT_LIST_DISPLAY_NAME = 'Hot List'

function buildHotList(): List {
  return {
    id: HOT_LIST_ID,
    groupId: '',
    name: HOT_LIST_DISPLAY_NAME,
    kind: 'hot',
    sortOrder: 0
  }
}

const defaults: DataStore = {
  schemaVersion: 2,
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
  jkMode: 'standard',
  effects: DEFAULT_EFFECTS
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

// Defensive runtime backfill, in addition to the version-keyed migration
// above. Reasons it's worth keeping both:
//   1. Migrations only fire when the app version crosses the key. Dev
//      builds whose package.json hasn't been bumped to v0.1.6 yet still
//      need the hot list to exist when running the v0.1.6 features.
//   2. Future migrations that change `lists` structure could leave a
//      window where this seed is missing; a startup check is cheap
//      insurance.
// Idempotent — on subsequent boots after the seed exists, it's a no-op
// against electron-store (no `set` call when nothing changed).
// Defensive runtime backfill for the `effects` namespace. Same rationale
// as ensureHotListSeed below — version-keyed migrations only fire when
// the app version crosses the key, but the renderer expects effects to
// always be a fully-typed object. Backfills missing top-level + missing
// individual flags so future additions to DEFAULT_EFFECTS land cleanly
// for existing installs without bumping schemaVersion.
function ensureEffectsSeed(): void {
  const current = store.get('effects') as Effects | undefined
  const merged: Effects = { ...DEFAULT_EFFECTS, ...(current ?? {}) }
  // set() is a no-op if the value didn't change in shape, but
  // electron-store doesn't deep-equal — write only when the merge
  // actually added a key.
  const hasNewKey = !current || Object.keys(DEFAULT_EFFECTS).some(
    (k) => !(k in (current as Record<string, unknown>))
  )
  if (hasNewKey) {
    store.set('effects', merged)
  }
}
ensureEffectsSeed()

// Status lifecycle v2. Keep this runtime migration separate from
// electron-store's app-version migrations: it must run for existing
// installs even while the app version remains 0.1.9 during development.
// It is idempotent — legacy values are remapped once, then schemaVersion
// records the completed migration. The legacy-value check also makes a
// partially-written dev store converge safely on the next launch.
type LegacyItemStatus = ItemStatus | 'hold' | 'done'

const STATUS_MIGRATION: Record<LegacyItemStatus, ItemStatus> = {
  active: 'default',
  hold: 'pending',
  done: 'complete',
  default: 'default',
  pending: 'pending',
  complete: 'complete',
  hidden: 'hidden'
}

function ensureStatusLifecycleMigration(): void {
  const items = store.get('items') ?? []
  let migrated = false
  const nextItems: Item[] = items.map((item) => {
    const status = STATUS_MIGRATION[item.status as LegacyItemStatus] ?? 'default'
    if (status === item.status) return item
    migrated = true
    return { ...item, status }
  })

  if (migrated) store.set('items', nextItems)
  if ((store.get('schemaVersion') ?? 1) < 2) store.set('schemaVersion', 2)
}
ensureStatusLifecycleMigration()

function ensureHotListSeed(): void {
  const lists = store.get('lists') ?? []
  let mutated = false
  const next: List[] = lists.map((l) => {
    if (!l.kind) {
      mutated = true
      return { ...l, kind: 'regular' as const }
    }
    // Force-update the legacy 'Hot' name to the canonical 'Hot List'.
    // Hot list isn't user-renameable, so a stale name from an earlier
    // dev build (or future renames of the canonical) should converge.
    // Skipping the bump if the name is anything else lets a future
    // user-rename feature opt out without losing customization.
    if (l.kind === 'hot' && l.name === 'Hot') {
      mutated = true
      return { ...l, name: HOT_LIST_DISPLAY_NAME }
    }
    return l
  })
  if (!next.some((l) => l.kind === 'hot')) {
    next.push(buildHotList())
    mutated = true
  }
  if (mutated) {
    store.set('lists', next)
  }
}
ensureHotListSeed()
