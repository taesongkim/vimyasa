import { BrowserWindow, screen, ipcMain, Menu, shell, app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { orchestrator } from './onboarding'
import { getThemesPreloadArg } from './themes-store'
import { instrumentWindow } from './window-logging'

// Re-run onboarding callout positioning whenever a host window moves /
// resizes / shows / hides / closes — keeps the callout glued to the host.
function trackForOnboarding(win: BrowserWindow): void {
  const refresh = (): void => orchestrator.refreshPosition()
  win.on('move', refresh)
  win.on('resize', refresh)
  win.on('show', refresh)
  win.on('hide', refresh)
  win.on('close', () => {
    // If the host the callout was anchored to is going away, re-position
    // (the host provider will return null on the next call) so the callout
    // falls back to its reserved screen position rather than stranding.
    setTimeout(refresh, 0)
  })
}

const LIST_WINDOW_WIDTH = 360
const QUICKADD_WIDTH = 400
const QUICKADD_HEIGHT = 116
const COMMENTS_WIDTH = 360
const COMMENTS_HEIGHT = 480
const SETTINGS_WIDTH = 420
const SETTINGS_HEIGHT = 500
const SHORTCUTS_OVERVIEW_WIDTH = LIST_WINDOW_WIDTH
const WINDOW_GAP = 8
const INITIAL_X = 8
const INITIAL_Y = 8

// Track open windows
const listWindows = new Map<string, BrowserWindow>()
let quickAddWindow: BrowserWindow | null = null
let commentsWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let archiveWindow: BrowserWindow | null = null
let shortcutsOverviewWindow: BrowserWindow | null = null

function getPreloadPath(): string {
  return join(__dirname, '../preload/index.mjs')
}

function loadRoute(win: BrowserWindow, hash: string): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

function getCenteredPosition(width: number, height: number): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const wa = display.workArea
  return {
    x: Math.round(wa.x + (wa.width - width) / 2),
    y: Math.round(wa.y + (wa.height - height) / 2)
  }
}

function getRightEdgePosition(width: number, height: number): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const wa = display.workArea
  return {
    x: wa.x + wa.width - width - INITIAL_X,
    y: wa.y + INITIAL_Y
  }
}

function calculateStackedPosition(): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const workArea = display.workArea

  const openCount = listWindows.size
  let x = INITIAL_X + openCount * (LIST_WINDOW_WIDTH + WINDOW_GAP)
  let y = workArea.y + INITIAL_Y

  if (x + LIST_WINDOW_WIDTH > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - LIST_WINDOW_WIDTH - 20
  }
  const listHeight = Math.round(workArea.height * 0.97)
  if (y + listHeight > workArea.y + workArea.height) {
    y = workArea.y + workArea.height - listHeight - 20
  }
  x = Math.max(workArea.x, x)
  y = Math.max(workArea.y, y)

  return { x, y }
}

function makeWindow(tag: string, opts: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  // Snapshot the themes state into an argv flag so the preload script can
  // expose it synchronously to the renderer. This lets the themes store
  // initialize on first render with the user's actual config — no async
  // hydration roundtrip, no GlowSurface flip-and-remount that would
  // restart the fade-up animation. See themes-store.ts:getThemesPreloadArg.
  const themesArg = getThemesPreloadArg()
  const win = new BrowserWindow({
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [themesArg]
    },
    ...opts
  })
  // Vimyasa is a menu-bar utility — every user-facing window is summoned
  // by a global shortcut or a tray click and must appear on whichever
  // macOS Space the user is currently working in. Without this, a
  // BrowserWindow gets bound to the Space it was created on; calling
  // .focus() from a different Space causes macOS to swipe the user back
  // to the original Space, yanking them out of their current context.
  // The flag must be applied post-construction (the property isn't on
  // BrowserWindowConstructorOptions). Do not remove without changing
  // the product model. The onboarding callout and dim-overlay windows
  // build their own BrowserWindows directly (not via makeWindow) and
  // call setVisibleOnAllWorkspaces themselves — keep that in sync if
  // the invariant ever changes here.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  if (is.dev) instrumentWindow(win, tag)
  return win
}

// ── List Window ─────────────────────────────────────────────────

export function createListWindow(listId: string, position?: { x: number; y: number }): BrowserWindow {
  const existing = listWindows.get(listId)
  if (existing && !existing.isDestroyed()) {
    if (existing.isFocused()) {
      existing.close()
      return existing
    }
    existing.focus()
    return existing
  }

  const workArea = screen.getPrimaryDisplay().workArea
  const listWindowHeight = Math.round(workArea.height * 0.97)
  const { x, y } = position || calculateStackedPosition()
  const win = makeWindow(`list:${listId}`, {
    width: LIST_WINDOW_WIDTH,
    height: listWindowHeight,
    minWidth: 320,
    minHeight: 150,
    x,
    y,
    resizable: true,
    alwaysOnTop: true
  })

  listWindows.set(listId, win)
  loadRoute(win, `/list/${listId}`)
  win.once('ready-to-show', () => {
    win.setOpacity(0)
    win.show()
    // Let the Framer Motion slide handle the visual entrance
    setTimeout(() => win.setOpacity(1), 10)
    orchestrator.refreshPosition()
  })
  win.on('closed', () => listWindows.delete(listId))
  trackForOnboarding(win)
  return win
}

// ── Quick-Add Window ────────────────────────────────────────────

/** Pre-warm the QuickAdd window at app startup. Creates the BrowserWindow
 *  once with show:false, loads the renderer route, and parks it hidden so
 *  every user summon is just a `win.show()` + IPC state-reset — no cold
 *  renderer process spawn, no JS bundle parse, no React mount, no theme
 *  hydration. The window stays alive for the app's lifetime; on user
 *  close it `hide()`s instead of `close()`-ing.
 *
 *  Idempotent: if already pre-warmed, no-op. Called from main/index.ts on
 *  app ready and re-callable defensively if the window gets destroyed
 *  unexpectedly. */
export function ensureQuickAddPrewarmed(): void {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) return

  const { x, y } = getCenteredPosition(QUICKADD_WIDTH, QUICKADD_HEIGHT)
  const win = makeWindow('quickadd', {
    width: QUICKADD_WIDTH,
    height: QUICKADD_HEIGHT,
    x,
    y,
    resizable: false,
    alwaysOnTop: true
  })
  quickAddWindow = win

  // Load with empty listId — actual target is supplied via the
  // 'quickadd:show' IPC on each summon, so we don't need to recreate the
  // window when the target list changes.
  loadRoute(win, '/quickadd/fixed/')

  win.once('ready-to-show', () => {
    // DO NOT call win.show() here — that's the whole point. We're warming
    // the renderer, not displaying it.
    orchestrator.refreshPosition()
  })

  win.on('closed', () => {
    quickAddWindow = null
  })

  trackForOnboarding(win)
}

/** Show the (pre-warmed or freshly-created) QuickAdd window with the
 *  given target listId. Sends a 'quickadd:show' IPC ahead of the show
 *  call so the renderer can reset its state and trigger the fade-up
 *  remount before the window paints. */
export function createQuickAddWindow(variant: 'fixed' | 'select', targetListId?: string): BrowserWindow {
  // If the QuickAdd window is currently visible AND focused, treat the
  // shortcut as a toggle and hide it. Send 'quickadd:hidden' first so
  // the renderer unmounts the form before the next show, otherwise stale
  // content can flash visible during the brief gap between win.show()
  // and the 'quickadd:show' IPC arriving.
  if (quickAddWindow && !quickAddWindow.isDestroyed() && quickAddWindow.isVisible() && quickAddWindow.isFocused()) {
    quickAddWindow.webContents.send('quickadd:hidden')
    quickAddWindow.hide()
    return quickAddWindow
  }

  // Defensive: if the prewarmed window got destroyed (e.g., GC under
  // memory pressure or a never-prewarmed startup race), recreate.
  if (!quickAddWindow || quickAddWindow.isDestroyed()) {
    ensureQuickAddPrewarmed()
  }

  const win = quickAddWindow!
  // Send the show event with target listId BEFORE win.show() so the
  // renderer's state is reset (text cleared, listId set, motion.div
  // re-keyed for fade-up) before the user sees a frame paint.
  win.webContents.send('quickadd:show', { listId: targetListId ?? '' })
  win.show()
  orchestrator.refreshPosition()
  return win
}

// ── Comments Window ─────────────────────────────────────────────

export function createCommentsWindow(itemId: string): BrowserWindow {
  if (commentsWindow && !commentsWindow.isDestroyed()) {
    commentsWindow.close()
  }

  const { x, y } = getCenteredPosition(COMMENTS_WIDTH, COMMENTS_HEIGHT)
  const win = makeWindow(`comments:${itemId}`, {
    width: COMMENTS_WIDTH,
    height: COMMENTS_HEIGHT,
    x,
    y,
    resizable: true
  })

  commentsWindow = win
  loadRoute(win, `/comments/${itemId}`)
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { commentsWindow = null })
  return win
}

// ── Settings Window ─────────────────────────────────────────────

type SettingsTab = 'general' | 'lists' | 'shortcuts' | 'data'

export function createSettingsWindow(initialTab?: SettingsTab): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    if (initialTab) {
      // App.tsx listens for hashchange, re-parses the route, and propagates
      // the new tab to <SettingsWindow initialTab=...>.
      settingsWindow.webContents.executeJavaScript(
        `window.location.hash = ${JSON.stringify('/settings/' + initialTab)}`
      )
    }
    return settingsWindow
  }

  const { x, y } = getCenteredPosition(SETTINGS_WIDTH, SETTINGS_HEIGHT)
  const win = makeWindow('settings', {
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    x,
    y,
    resizable: true
  })

  settingsWindow = win
  loadRoute(win, initialTab ? `/settings/${initialTab}` : '/settings')
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { settingsWindow = null })
  return win
}

// ── Shortcuts Overview Window ──────────────────────────────────

export function createShortcutsOverviewWindow(): BrowserWindow {
  if (shortcutsOverviewWindow && !shortcutsOverviewWindow.isDestroyed()) {
    if (shortcutsOverviewWindow.isFocused()) {
      shortcutsOverviewWindow.close()
      return shortcutsOverviewWindow
    }
    shortcutsOverviewWindow.focus()
    return shortcutsOverviewWindow
  }

  const shortcutsHeight = Math.round(screen.getPrimaryDisplay().workArea.height * 0.97)
  const { x, y } = getRightEdgePosition(SHORTCUTS_OVERVIEW_WIDTH, shortcutsHeight)
  const win = makeWindow('shortcuts-overview', {
    width: SHORTCUTS_OVERVIEW_WIDTH,
    height: shortcutsHeight,
    x,
    y,
    resizable: true,
    alwaysOnTop: true
  })

  shortcutsOverviewWindow = win
  loadRoute(win, '/shortcuts-overview')
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { shortcutsOverviewWindow = null })
  return win
}

// ── Archive Window ──────────────────────────────────────────────

export function createArchiveWindow(listId?: string): BrowserWindow {
  if (archiveWindow && !archiveWindow.isDestroyed()) {
    archiveWindow.focus()
    return archiveWindow
  }

  const archiveHeight = Math.round(screen.getPrimaryDisplay().workArea.height * 0.97)
  const { x, y } = getCenteredPosition(LIST_WINDOW_WIDTH, archiveHeight)
  const win = makeWindow(`archive:${listId ?? 'all'}`, {
    width: LIST_WINDOW_WIDTH,
    height: archiveHeight,
    x,
    y,
    resizable: true
  })

  archiveWindow = win
  loadRoute(win, listId ? `/archive/${listId}` : '/archive')
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { archiveWindow = null })
  return win
}

// ── Helpers ─────────────────────────────────────────────────────

export function getOpenListWindowCount(): number {
  return listWindows.size
}

// First non-destroyed list window — used as the 'list' host for onboarding's
// 'navigate-actions' step. We pick whichever list window the user opened
// first; if multiple are open, the others ride along visually.
function getFirstListWindow(): BrowserWindow | null {
  for (const win of listWindows.values()) {
    if (!win.isDestroyed()) return win
  }
  return null
}

/** Hook the onboarding orchestrator's host providers into the live window
 *  registry. Call once at app.whenReady() time, after orchestrator is
 *  imported. */
export function wireOnboardingHosts(): void {
  orchestrator.registerHostProvider('quickadd', () =>
    quickAddWindow && !quickAddWindow.isDestroyed() ? quickAddWindow : null
  )
  orchestrator.registerHostProvider('list', () => getFirstListWindow())
  orchestrator.registerHostProvider('tray', () => null) // anchored via trayBoundsProvider
  orchestrator.registerHostProvider('none', () => null)
}

// ── IPC Handlers ────────────────────────────────────────────────

export function registerWindowIpcHandlers(): void {
  ipcMain.handle('closeWindow', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.close()
  })

  // QuickAdd is pre-warmed and stays alive — its "close" is really a hide
  // so the renderer process doesn't have to cold-start on the next summon.
  // We send 'quickadd:hidden' to the renderer BEFORE hiding the window so
  // the form's motion.div unmounts synchronously — that prevents a flash
  // of stale content on the next summon (window paints faster than the
  // 'quickadd:show' IPC arrives, so any content still in the DOM at
  // hide time would be visible briefly until the show event remounts it).
  // document.visibilitychange in the renderer is also wired but can fire
  // late; this IPC is authoritative.
  ipcMain.handle('quickAddHide', () => {
    if (quickAddWindow && !quickAddWindow.isDestroyed()) {
      quickAddWindow.webContents.send('quickadd:hidden')
      quickAddWindow.hide()
    }
  })

  ipcMain.handle('openListWindow', (_e, listId: string, position?: { x: number; y: number }) => {
    createListWindow(listId, position)
  })

  ipcMain.handle('openQuickAdd', (_e, variant: 'fixed' | 'select', targetListId?: string) => {
    createQuickAddWindow(variant, targetListId)
  })

  ipcMain.handle('openComments', (_e, itemId: string) => {
    createCommentsWindow(itemId)
  })

  ipcMain.handle('openSettings', () => {
    createSettingsWindow()
  })

  ipcMain.handle('openArchive', (_e, listId?: string) => {
    createArchiveWindow(listId)
  })

  ipcMain.handle('openShortcutsOverview', () => {
    createShortcutsOverviewWindow()
  })

  ipcMain.handle('revealDataFile', () => {
    const dataPath = join(app.getPath('userData'), 'data.json')
    shell.showItemInFolder(dataPath)
  })

  ipcMain.handle('getLoginItemSettings', () => {
    return app.getLoginItemSettings()
  })

  ipcMain.handle('setLoginItemSettings', (_e, openAtLogin: boolean) => {
    app.setLoginItemSettings({ openAtLogin })
  })

  ipcMain.handle('showContextMenu', (event, template: any[]) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    // Recursive — Menu.buildFromTemplate does walk `submenu` trees, but
    // it expects each entry's `click` callback to already be attached.
    // Earlier this only mapped the top level, so nested items in
    // Status / Send-to-List submenus had ipcEvent + ipcData set but no
    // click handler — submenus appeared to do nothing on click.
    const attachClicks = (entries: any[]): any[] =>
      entries.map((item) => ({
        ...item,
        click: item.ipcEvent
          ? () => event.sender.send(item.ipcEvent, item.ipcData)
          : undefined,
        submenu: Array.isArray(item.submenu) ? attachClicks(item.submenu) : item.submenu
      }))

    const menu = Menu.buildFromTemplate(attachClicks(template))
    menu.popup({ window: win })
  })
}
