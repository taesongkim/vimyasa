import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { registerWindowIpcHandlers, createListWindow } from './windows'
import { createTray } from './tray'
import { registerGlobalShortcuts, unregisterAllShortcuts } from './shortcuts'
import { store } from './store'

// Hide dock icon (menubar-only app)
if (process.platform === 'darwin') {
  app.dock.hide()
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.vimyasa')

  // Register all IPC handlers before any windows are created
  registerIpcHandlers()
  registerWindowIpcHandlers()

  // Create tray icon
  createTray()

  // Register global shortcuts
  registerGlobalShortcuts()

  // Default open/close optimization
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Auto-open the first list on launch
  const lists = store.get('lists')
  if (lists.length > 0) {
    createListWindow(lists[0].id)
  }
})

app.on('will-quit', () => {
  unregisterAllShortcuts()
})

// Keep app running when all windows are closed (menubar app)
app.on('window-all-closed', () => {
  // Do nothing — app stays in tray
})
