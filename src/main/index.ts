import { app, nativeTheme } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import {
  registerWindowIpcHandlers,
  wireOnboardingHosts
} from './windows'
import { createTray } from './tray'
import { registerThemeDevPanelHandlers } from './theme-dev-panel'
import {
  registerGlobalShortcuts,
  unregisterAllShortcuts,
  getCurrentBuiltinShortcuts
} from './shortcuts'
import { setupAutoUpdater } from './updater'
import { orchestrator } from './onboarding'
import { getThemesState } from './themes-store'
import { applyNativeThemeSource } from './appearance'

// Wire Electron's nativeTheme.themeSource to the user's persisted
// Settings → Appearance value. Read at startup + updated on every
// `themes:setAppearance` IPC (see ipc.ts). Without this, macOS
// vibrancy tracks the OS setting regardless of app choice, and the
// renderer's `prefers-color-scheme: light` media query never fires
// when the user is in Auto mode and the OS toggles Light↔Dark.
// See BACKLOG hotfix entry (2026-07-15).
applyNativeThemeSource(getThemesState().appearance)

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

  // Replace the theme-dev-panel stub handlers with real implementations
  // in dev builds only. Production builds keep the throwing stubs from
  // ipc.ts so the panel surface area stays inert.
  if (is.dev) {
    registerThemeDevPanelHandlers()
  }

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

  // Pre-warm the dim window in the background so it can be shown
  // near-instantly when the tour starts. Without this, the full-screen
  // transparent dim takes ~470ms to ready-to-show on first launch and
  // the welcome callout appears before it.
  void orchestrator.preloadDim()

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
