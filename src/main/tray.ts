import { Tray, Menu, nativeImage, app, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { v4 as uuid } from 'uuid'
import { store } from './store'
import {
  createListWindow,
  createQuickAddWindow,
  createSettingsWindow,
  createArchiveWindow
} from './windows'
import { orchestrator } from './onboarding'

let tray: Tray | null = null

export function createTray(): Tray {
  // Load the V symbol PNG as tray icon.
  // In dev: __dirname is out/main/, so two levels up reaches the project root's resources/.
  // In prod: extraResources copies the resources/ folder into Contents/Resources/, so the
  // file lives at process.resourcesPath/resources/tray-icon.png (note the nested folder
  // — the directory name is preserved, not flattened).
  const iconPath = is.dev
    ? join(__dirname, '../../resources/tray-icon.png')
    : join(process.resourcesPath, 'resources', 'tray-icon.png')
  // Source assets are 22×22 / 44×44 (retina). Scale down ~15% so the V sits
  // a bit smaller in the menu bar — feels less "shouty" next to system icons.
  // Tweak this height to taste; both 1x and 2x representations scale proportionally.
  const icon = nativeImage.createFromPath(iconPath).resize({ height: 19 })
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Vimyasa')

  // Report tray clicks to the onboarding orchestrator so its 'tray' step
  // can match. macOS still opens the context menu via setContextMenu below;
  // the click event fires alongside that. Cheap when no tour is active.
  tray.on('click', () => {
    orchestrator.report({ kind: 'tray-click' })
  })

  // Provide tray bounds + a re-position hook to the orchestrator so the
  // 'below-tray' anchor lands correctly.
  orchestrator.setTrayBoundsProvider(() => tray?.getBounds() ?? null)

  updateTrayMenu()
  return tray
}

export function updateTrayMenu(): void {
  if (!tray) return

  const lists = store.get('lists')
  const groups = store.get('groups')
  const items = store.get('items')

  // Count active items per list for badge display
  const activeCountByList = new Map<string, number>()
  items
    .filter((i) => i.status === 'active' && !i.archivedAt)
    .forEach((i) => {
      activeCountByList.set(i.listId, (activeCountByList.get(i.listId) || 0) + 1)
    })

  // Build list menu items grouped by group
  const groupMenuItems: Electron.MenuItemConstructorOptions[] = []
  let listNumber = 1

  for (const group of groups) {
    if (groups.length > 1) {
      groupMenuItems.push({
        label: group.name,
        type: 'normal',
        enabled: false
      })
    }
    for (const listId of group.listIds) {
      const list = lists.find((l) => l.id === listId)
      if (!list) continue
      const count = activeCountByList.get(list.id) || 0
      groupMenuItems.push({
        label: `${listNumber}. ${list.name}${count > 0 ? ` (${count})` : ''}`,
        click: () => createListWindow(list.id)
      })
      listNumber++
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Vimyasa', type: 'normal', enabled: false },
    { type: 'separator' },
    ...groupMenuItems,
    { type: 'separator' },
    {
      label: 'New List...',
      click: () => {
        // Use a simple prompt to get the list name
        const defaultGroup = groups[0]
        if (!defaultGroup) return
        // Create list with a default name, then open it for renaming.
        // Match the gap-aware sortOrder logic in createList — count can
        // diverge from the actual max if any list in this group was
        // previously deleted.
        const inGroup = lists.filter((l) => l.groupId === defaultGroup.id)
        const newList = {
          id: uuid(),
          groupId: defaultGroup.id,
          name: 'New List',
          icon: '📋',
          sortOrder:
            inGroup.length > 0 ? Math.max(...inGroup.map((l) => l.sortOrder)) + 1 : 0
        }
        store.set('lists', [...lists, newList])
        const updatedGroups = store.get('groups')
        const gIdx = updatedGroups.findIndex((g) => g.id === defaultGroup.id)
        if (gIdx !== -1) {
          updatedGroups[gIdx].listIds.push(newList.id)
          store.set('groups', updatedGroups)
        }
        // Broadcast change and open the new list
        const { BrowserWindow } = require('electron')
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('data-changed')
          }
        }
        createListWindow(newList.id)
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Add...',
      accelerator: 'CommandOrControl+Shift+;',
      click: () => {
        if (lists.length > 0) {
          createQuickAddWindow('fixed', lists[0].id)
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Archive',
      click: () => createArchiveWindow()
    },
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Replay Onboarding Tour',
      click: () => orchestrator.replay()
    },
    { type: 'separator' },
    {
      label: 'Quit Vimyasa',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
}
