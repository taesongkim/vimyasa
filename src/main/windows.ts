import { BrowserWindow, screen, ipcMain, Menu, shell, app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const LIST_WINDOW_WIDTH = 360
const LIST_WINDOW_HEIGHT = 520
const QUICKADD_WIDTH = 400
const QUICKADD_HEIGHT = 160
const QUICKADD_SELECT_HEIGHT = 320
const COMMENTS_WIDTH = 360
const COMMENTS_HEIGHT = 480
const SETTINGS_WIDTH = 420
const SETTINGS_HEIGHT = 500
const WINDOW_GAP = 12
const INITIAL_X = 40
const INITIAL_Y = 80

// Track open windows
const listWindows = new Map<string, BrowserWindow>()
let quickAddWindow: BrowserWindow | null = null
let commentsWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let archiveWindow: BrowserWindow | null = null

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
    y: Math.round(wa.y + (wa.height - height) / 3)
  }
}

function calculateStackedPosition(): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const workArea = display.workArea

  const openCount = listWindows.size
  let x = INITIAL_X + openCount * (LIST_WINDOW_WIDTH + WINDOW_GAP)
  let y = INITIAL_Y

  if (x + LIST_WINDOW_WIDTH > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - LIST_WINDOW_WIDTH - 20
  }
  if (y + LIST_WINDOW_HEIGHT > workArea.y + workArea.height) {
    y = workArea.y + workArea.height - LIST_WINDOW_HEIGHT - 20
  }
  x = Math.max(workArea.x, x)
  y = Math.max(workArea.y, y)

  return { x, y }
}

function makeWindow(opts: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  return new BrowserWindow({
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    ...opts
  })
}

// ── List Window ─────────────────────────────────────────────────

export function createListWindow(listId: string): BrowserWindow {
  const existing = listWindows.get(listId)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return existing
  }

  const { x, y } = calculateStackedPosition()
  const win = makeWindow({
    width: LIST_WINDOW_WIDTH,
    height: LIST_WINDOW_HEIGHT,
    minWidth: 320,
    minHeight: 400,
    x,
    y,
    resizable: true
  })

  listWindows.set(listId, win)
  loadRoute(win, `/list/${listId}`)
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => listWindows.delete(listId))
  return win
}

// ── Quick-Add Window ────────────────────────────────────────────

export function createQuickAddWindow(variant: 'fixed' | 'select', targetListId?: string): BrowserWindow {
  if (quickAddWindow && !quickAddWindow.isDestroyed()) {
    quickAddWindow.focus()
    return quickAddWindow
  }

  const height = variant === 'select' ? QUICKADD_SELECT_HEIGHT : QUICKADD_HEIGHT
  const { x, y } = getCenteredPosition(QUICKADD_WIDTH, height)
  const win = makeWindow({
    width: QUICKADD_WIDTH,
    height,
    x,
    y,
    resizable: false,
    alwaysOnTop: true
  })

  quickAddWindow = win
  const hash = variant === 'fixed'
    ? `/quickadd/fixed/${targetListId || ''}`
    : '/quickadd/select'
  loadRoute(win, hash)
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { quickAddWindow = null })
  return win
}

// ── Comments Window ─────────────────────────────────────────────

export function createCommentsWindow(itemId: string): BrowserWindow {
  if (commentsWindow && !commentsWindow.isDestroyed()) {
    commentsWindow.close()
  }

  const { x, y } = getCenteredPosition(COMMENTS_WIDTH, COMMENTS_HEIGHT)
  const win = makeWindow({
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

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  const { x, y } = getCenteredPosition(SETTINGS_WIDTH, SETTINGS_HEIGHT)
  const win = makeWindow({
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
    x,
    y,
    resizable: true
  })

  settingsWindow = win
  loadRoute(win, '/settings')
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { settingsWindow = null })
  return win
}

// ── Archive Window ──────────────────────────────────────────────

export function createArchiveWindow(listId?: string): BrowserWindow {
  if (archiveWindow && !archiveWindow.isDestroyed()) {
    archiveWindow.focus()
    return archiveWindow
  }

  const { x, y } = getCenteredPosition(LIST_WINDOW_WIDTH, LIST_WINDOW_HEIGHT)
  const win = makeWindow({
    width: LIST_WINDOW_WIDTH,
    height: LIST_WINDOW_HEIGHT,
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

// ── IPC Handlers ────────────────────────────────────────────────

export function registerWindowIpcHandlers(): void {
  ipcMain.handle('closeWindow', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.close()
  })

  ipcMain.handle('openListWindow', (_e, listId: string) => {
    createListWindow(listId)
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

    const menu = Menu.buildFromTemplate(
      template.map((item) => ({
        ...item,
        click: item.ipcEvent
          ? () => { event.sender.send(item.ipcEvent, item.ipcData) }
          : undefined
      }))
    )
    menu.popup({ window: win })
  })
}
