// Shared list-mutation helpers, used by both the renderer-facing IPC
// handler in ipc.ts and the tray's "New List..." entry in tray.ts.
// Anything that creates, renames, reorders, or deletes a list should
// flow through this module (or call into the IPC handler) so we have
// a single chokepoint for future cross-cutting concerns — validation,
// analytics, undo. Broadcasting and tray refresh stay at the call
// site, since they depend on the trigger source (renderer sender vs.
// no sender for tray).

import { v4 as uuid } from 'uuid'
import { store } from './store'
import type { List } from '../shared/types'

export function createListInStore(groupId: string, name: string): List {
  const lists = store.get('lists')
  // Lists don't archive but they can be deleted, which leaves gaps in
  // sortOrder values. Use max + 1 over the group's lists to land at
  // the bottom regardless of any holes.
  const inGroup = lists.filter((l) => l.groupId === groupId)
  const nextSortOrder =
    inGroup.length > 0 ? Math.max(...inGroup.map((l) => l.sortOrder)) + 1 : 0
  const list: List = {
    id: uuid(),
    groupId,
    name,
    kind: 'regular',
    sortOrder: nextSortOrder
  }
  store.set('lists', [...lists, list])

  // Mirror the new list onto its group's listIds. The order field there
  // is no longer authoritative for display (sortOrder is) but the array
  // membership is still used to confirm a list belongs to a group.
  const groups = store.get('groups')
  const gIdx = groups.findIndex((g) => g.id === groupId)
  if (gIdx !== -1) {
    groups[gIdx].listIds.push(list.id)
    store.set('groups', groups)
  }

  return list
}
