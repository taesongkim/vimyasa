import { Tray, Menu, BrowserWindow, nativeImage, app, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { store } from './store'
import { createListInStore } from './lists'
import { getHotList, getRegularLists, HOT_LIST_ID } from '../shared/types'
import {
  createListWindow,
  createQuickAddWindow,
  createSettingsWindow,
  createArchiveWindow
} from './windows'
import { orchestrator } from './onboarding'
import {
  isThemeDevPanelOpen,
  openThemeDevPanel,
  closeThemeDevPanel
} from './theme-dev-panel'

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
    // Iterate by list.sortOrder, not group.listIds — listIds is a stale
    // create-order denormalization that doesn't reflect drag-reorders done
    // in Settings → Lists. sortOrder is the canonical user-facing order.
    const groupLists = lists
      .filter((l) => l.groupId === group.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    for (const list of groupLists) {
      const count = activeCountByList.get(list.id) || 0
      groupMenuItems.push({
        label: `${listNumber}. ${list.name}${count > 0 ? ` (${count})` : ''}`,
        click: () => createListWindow(list.id)
      })
      listNumber++
    }
  }

  // Hot list lives outside group structure — surface it as its own
  // tray entry below the regular lists with the "0." prefix that
  // matches the title-bar listNumber and the keyboard shortcut.
  const hotList = getHotList(lists)
  const hotListMenuItem: Electron.MenuItemConstructorOptions[] = hotList
    ? [
        {
          label: `0. ${hotList.name}${
            (activeCountByList.get(HOT_LIST_ID) ?? 0) > 0
              ? ` (${activeCountByList.get(HOT_LIST_ID)})`
              : ''
          }`,
          accelerator: 'CommandOrControl+Shift+H',
          click: () => createListWindow(HOT_LIST_ID)
        }
      ]
    : []

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Vimyasa', type: 'normal', enabled: false },
    { type: 'separator' },
    ...groupMenuItems,
    ...(hotListMenuItem.length > 0
      ? [{ type: 'separator' as const }, ...hotListMenuItem]
      : []),
    { type: 'separator' },
    {
      label: 'New List...',
      click: () => {
        const defaultGroup = groups[0]
        if (!defaultGroup) return
        // Route through the same helper the renderer's createList IPC
        // handler uses, so persistence + group.listIds bookkeeping stays
        // in one place.
        const newList = createListInStore(defaultGroup.id, 'New List')
        // Tray clicks have no IPC sender to exclude — broadcast to all
        // windows so anything currently rendering lists picks up the new
        // entry on next render.
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('data-changed')
          }
        }
        createListWindow(newList.id)
        updateTrayMenu()
      }
    },
    {
      label: 'Reorder Lists',
      click: () => createSettingsWindow('lists')
    },
    { type: 'separator' },
    {
      label: 'Entry Form',
      accelerator: 'CommandOrControl+Shift+;',
      click: () => {
        // Quick-add target is the user's first regular list — the hot
        // list isn't a quick-add destination (it has its own future
        // flow via carry mode + number-0).
        const regulars = getRegularLists(lists).sort(
          (a, b) => a.sortOrder - b.sortOrder
        )
        if (regulars.length > 0) {
          createQuickAddWindow('fixed', regulars[0].id)
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
    // Dev-only: toggle the theme dev panel for tuning glow effects.
    // The panel is gated by is.dev in main/index.ts and ipc.ts; the
    // menu entry only appears in dev builds so production users never
    // see it.
    ...(is.dev
      ? ([
          { type: 'separator' as const },
          {
            label: isThemeDevPanelOpen() ? 'Close Theme Dev Panel' : 'Open Theme Dev Panel',
            click: () => {
              if (isThemeDevPanelOpen()) {
                closeThemeDevPanel()
              } else {
                openThemeDevPanel()
              }
              // Rebuild the menu so the label flips on next open.
              updateTrayMenu()
            }
          }
        ] as Electron.MenuItemConstructorOptions[])
      : []),
    { type: 'separator' },
    {
      label: 'Quit Vimyasa',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
}
