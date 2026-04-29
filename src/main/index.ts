import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { registerWindowIpcHandlers, wireOnboardingHosts } from './windows'
import { createTray } from './tray'
import {
  registerGlobalShortcuts,
  unregisterAllShortcuts,
  getCurrentBuiltinShortcuts
} from './shortcuts'
import { setupAutoUpdater } from './updater'
import { orchestrator } from './onboarding'

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

  // Wire the onboarding orchestrator's data sources before maybeRun() —
  // it needs to know which BrowserWindows are its hosts and which
  // shortcuts to display in the callout copy.
  wireOnboardingHosts()
  orchestrator.setShortcutsProvider(getCurrentBuiltinShortcuts)

  // Create tray icon
  createTray()

  // Register global shortcuts
  registerGlobalShortcuts()

  // Default open/close optimization
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Run the onboarding tour for first-time users (or anyone whose tour
  // version is behind). Small delay so the app's launch settles before
  // the welcome callout appears.
  setTimeout(() => orchestrator.maybeRun(), 400)

  // Check for updates (skipped automatically in dev / unpackaged builds)
  setupAutoUpdater()
})

app.on('will-quit', () => {
  unregisterAllShortcuts()
})

// Keep app running when all windows are closed (menubar app)
app.on('window-all-closed', () => {
  // Do nothing — app stays in tray
})
