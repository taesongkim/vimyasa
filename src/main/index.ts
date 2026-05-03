import { app, nativeTheme } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { registerWindowIpcHandlers, wireOnboardingHosts, ensureQuickAddPrewarmed } from './windows'
import { createTray } from './tray'
import { registerThemeDevPanelHandlers } from './theme-dev-panel'
import {
  registerGlobalShortcuts,
  unregisterAllShortcuts,
  getCurrentBuiltinShortcuts
} from './shortcuts'
import { setupAutoUpdater } from './updater'
import { orchestrator } from './onboarding'

// Lock the app to dark mode regardless of the system's appearance
// setting. macOS vibrancy ('under-window') tracks the system theme by
// default, which renders the entire window with a *light* frosted blur
// when the user is in light mode — and our CSS palette is dark-on-dark,
// so the result is washed-out and barely legible. Forcing themeSource =
// 'dark' makes vibrancy, native dialogs, and the OS chrome all render
// dark, matching what the CSS expects. TODO: revisit once we ship a
// designed light-mode palette behind a Settings → Appearance toggle.
nativeTheme.themeSource = 'dark'

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

  // Pre-warm the QuickAdd window. Stays alive (hidden) for the app's
  // lifetime; every user summon is a win.show() + state-reset IPC, no
  // cold renderer spawn. ~30-80MB additional memory; ParticleLayer
  // pauses its RAF loop on document.hidden so idle CPU stays at zero.
  // See windows.ts:ensureQuickAddPrewarmed.
  ensureQuickAddPrewarmed()

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
