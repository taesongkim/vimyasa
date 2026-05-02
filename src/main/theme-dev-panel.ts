// Dev controls panel for the theme system. Frameless always-on-top window
// that exposes every per-surface knob and a saved-preset library so a
// designer/developer can iterate on glow effects without restarts.
//
// Gated by is.dev — registerThemeDevPanel() is a no-op in production builds,
// the tray menu entry that toggles the window is also dev-only, and the
// stub IPC handlers in ipc.ts throw if any renderer somehow invokes them.

import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getThemesPreloadArg } from './themes-store'

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 640
const PANEL_MARGIN = 16

let panelWindow: BrowserWindow | null = null

function getPreloadPath(): string {
  return join(__dirname, '../preload/index.mjs')
}

function loadPanelRoute(win: BrowserWindow): void {
  const hash = '/themedev'
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

function getDefaultPosition(): { x: number; y: number } {
  // Top-right of the primary display so it sits next to whatever surface
  // the user is tuning. They can drag it anywhere — Electron remembers
  // nothing across sessions, but neither does the user typically.
  const wa = screen.getPrimaryDisplay().workArea
  return {
    x: wa.x + wa.width - PANEL_WIDTH - PANEL_MARGIN,
    y: wa.y + PANEL_MARGIN
  }
}

export function isThemeDevPanelOpen(): boolean {
  return !!panelWindow && !panelWindow.isDestroyed()
}

export function openThemeDevPanel(): void {
  if (isThemeDevPanelOpen()) {
    panelWindow!.focus()
    return
  }

  const { x, y } = getDefaultPosition()
  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [getThemesPreloadArg()]
    }
  })

  // Match the pattern in windows.ts — Vimyasa is a menu-bar utility and
  // every window must follow the user across Spaces.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  panelWindow = win
  loadPanelRoute(win)
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    panelWindow = null
  })
}

export function closeThemeDevPanel(): void {
  if (isThemeDevPanelOpen()) {
    panelWindow!.close()
  }
}

/** Replaces the stub handlers from ipc.ts with real implementations.
 *  Call this from main/index.ts only when is.dev is true so production
 *  builds keep the throwing stubs and the dev-panel surface area is
 *  inert there. */
export function registerThemeDevPanelHandlers(): void {
  // Remove the stub handlers so we can re-register with real ones.
  ipcMain.removeHandler('themeDev:openPanel')
  ipcMain.removeHandler('themeDev:closePanel')
  ipcMain.removeHandler('themeDev:isPanelOpen')

  ipcMain.handle('themeDev:openPanel', () => openThemeDevPanel())
  ipcMain.handle('themeDev:closePanel', () => closeThemeDevPanel())
  ipcMain.handle('themeDev:isPanelOpen', () => isThemeDevPanelOpen())
}
