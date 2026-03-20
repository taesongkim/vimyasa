import { Tray, Menu, nativeImage, app, dialog } from 'electron'
import { v4 as uuid } from 'uuid'
import { store } from './store'
import {
  createListWindow,
  createQuickAddWindow,
  createSettingsWindow,
  createArchiveWindow
} from './windows'

let tray: Tray | null = null

// 32x32 "V" icon — black on transparent, used as macOS template image
const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAArUlEQVR4nO2WwQ7CMAxD3/j/f96OICCL7fSCqI9VktlPVTrY2vp3HcX5KdQ4Kuc9ioYVH5XmVgZedfYlef+dgdUUvs5TCEBOoe3rDKyiUM5RCYBPQapXDEwp3PY7BECnINNSDaQU2j6XAPTprLviGHApSPUJAahT2vvCNaBSkGmlBOAzbbQtEwNdOuuuTAjAM3X8YqYGqpT2vpgSgOH/wsTAe9poW64gsLX127oAuncTLWv+yY8AAAAASUVORK5CYII='

export function createTray(): Tray {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`)
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Vimyasa')

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
        label: `${list.icon} ${list.name}${count > 0 ? ` (${count})` : ''}`,
        click: () => createListWindow(list.id)
      })
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
        // Create list with a default name, then open it for renaming
        const newList = {
          id: uuid(),
          groupId: defaultGroup.id,
          name: 'New List',
          icon: '📋',
          sortOrder: lists.filter((l) => l.groupId === defaultGroup.id).length
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
      label: 'Quit Vimyasa',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
}
