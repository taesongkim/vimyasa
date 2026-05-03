import { BrowserWindow, screen, type Rectangle } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { Anchor } from '../../shared/onboarding-steps'
import { getThemesPreloadArg } from '../themes-store'
import { instrumentWindow } from '../window-logging'

const CALLOUT_DEFAULT_WIDTH = 380
const CALLOUT_HEIGHT = 240
const GAP = 16
// Distance the callout must keep from the screen edges. Used by anchors
// that risk overflowing (e.g. below-tray when the tray icon is near the
// right edge of the menu bar).
const SAFE_MARGIN = 16

// QuickAdd's actual size lives in src/main/windows.ts; we duplicate it here
// for the fallback positioning (when the user hasn't summoned QuickAdd yet
// and we still need to show the callout where the form *will* appear).
const QUICKADD_FALLBACK_WIDTH = 400
const QUICKADD_FALLBACK_HEIGHT = 116

// The first list window's screen position. Mirrors calculateStackedPosition
// in windows.ts for an empty list-window registry (openCount = 0):
// x = workArea.x + LIST_INITIAL_X, y = workArea.y + LIST_INITIAL_Y. We
// duplicate the constants so the 'navigate' callout (host not yet open)
// can sit exactly where the 'navigate-actions' callout (host now open)
// will appear.
const LIST_FALLBACK_WIDTH = 360
const LIST_FALLBACK_INITIAL_X = 8
const LIST_FALLBACK_INITIAL_Y = 8

// Per-anchor width. Lets each anchor adopt a width that visually pairs
// with its host — e.g. callouts above the entry form match the form's
// width so they read as one stacked unit. Anchors not listed default to
// CALLOUT_DEFAULT_WIDTH.
const ANCHOR_WIDTHS: Partial<Record<Anchor, number>> = {
  'above-quickadd': QUICKADD_FALLBACK_WIDTH
}

function widthForAnchor(anchor: Anchor): number {
  return ANCHOR_WIDTHS[anchor] ?? CALLOUT_DEFAULT_WIDTH
}

export class CalloutWindow {
  private win: BrowserWindow | null = null
  // Cached anchor state so we can re-run positioning when only the height
  // changes (renderer requested a resize). Without this, setHeight would
  // need to know the current host/anchor again.
  private currentAnchor: Anchor | null = null
  private currentHost: BrowserWindow | null = null
  private currentTrayBounds: Rectangle | null = null
  // Renderer-requested content height. Null = use the default 240. Set via
  // setContentHeight() when the renderer's ResizeObserver reports a change.
  private contentHeight: number | null = null

  /** Create the BrowserWindow and start loading its renderer, but don't
   *  show it yet. Resolves when the renderer's first frame is ready. The
   *  caller decides when to call showNow(). Lets the orchestrator stage
   *  the show order between the dim and the callout deliberately. */
  createAndPreload(): Promise<void> {
    if (this.win && !this.win.isDestroyed()) return Promise.resolve()
    this.createInternal()
    return new Promise<void>((resolve) => {
      this.win!.once('ready-to-show', () => resolve())
    })
  }

  /** Display the window. Idempotent. Should only be called after the
   *  promise from createAndPreload() has resolved. */
  showNow(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.show()
    }
  }

  private createInternal(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win

    this.win = new BrowserWindow({
      width: CALLOUT_DEFAULT_WIDTH,
      height: CALLOUT_HEIGHT,
      frame: false,
      transparent: true,
      // Drop the OS shadow — we draw a softer one in CSS so it sits on the
      // glass rather than a hard rect outline.
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      // Critical: this is what keeps keystrokes flowing to the host window
      // while a callout is on-screen. Don't override.
      focusable: false,
      alwaysOnTop: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      roundedCorners: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        // Sync theme hydration: the renderer's themes store reads this on
        // first render, so the welcome callout's GlowSurface wrappers know
        // their config without an async IPC roundtrip.
        additionalArguments: [getThemesPreloadArg()]
      }
    })

    // Float above other windows on the same workspace, and follow the user
    // to other workspaces / fullscreen apps so the tour isn't lost when
    // they Mission Control.
    this.win.setAlwaysOnTop(true, 'floating')
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    if (is.dev) instrumentWindow(this.win, 'onboarding-callout')

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/onboarding`)
    } else {
      this.win.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/onboarding'
      })
    }

    // No auto-show on ready-to-show — createAndPreload listens for that
    // event itself and resolves a Promise; the orchestrator decides when
    // to call showNow().
    this.win.on('closed', () => {
      this.win = null
    })

    return this.win
  }

  destroy(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.close()
    }
    this.win = null
    this.currentAnchor = null
    this.currentHost = null
    this.currentTrayBounds = null
    this.contentHeight = null
  }

  /** Update the desired content height and re-run positioning. Triggered
   *  by the onboarding:request-resize IPC when the renderer's content
   *  changes size. */
  setContentHeight(height: number): void {
    if (height <= 0) return
    if (this.contentHeight === height) return
    this.contentHeight = height
    this.applyPosition()
  }

  isAlive(): boolean {
    return !!(this.win && !this.win.isDestroyed())
  }

  send(channel: string, payload?: unknown): void {
    if (!this.isAlive()) return
    this.win!.webContents.send(channel, payload)
  }

  /** Move the callout to the position dictated by the current step's anchor.
   *  - host: the BrowserWindow the callout is attached to (or null if not
   *    yet open — falls back to a reserved screen position).
   *  - trayBounds: needed only for the 'below-tray' anchor; null otherwise.
   */
  reposition(
    anchor: Anchor,
    host: BrowserWindow | null,
    trayBounds: Rectangle | null
  ): void {
    this.currentAnchor = anchor
    this.currentHost = host
    this.currentTrayBounds = trayBounds
    this.applyPosition()
  }

  /** Run the current cached anchor against the current cached height.
   *  Both reposition() and setContentHeight() funnel through here. */
  private applyPosition(): void {
    if (!this.isAlive() || !this.currentAnchor) return
    const anchor = this.currentAnchor
    const host = this.currentHost
    const trayBounds = this.currentTrayBounds
    const targetWidth = widthForAnchor(anchor)
    const targetHeight = this.contentHeight ?? CALLOUT_HEIGHT

    switch (anchor) {
      case 'above-quickadd': {
        // QuickAdd is created via getCenteredPosition (windows.ts), which
        // centers it in the work area. Mirror that math in the fallback so
        // the 'capture' callout (host not yet open) and the 'capture-add'
        // callout (host now open) sit at the exact same screen position.
        const display = screen.getPrimaryDisplay().workArea
        const h = host?.getBounds() ?? {
          x: display.x + Math.round((display.width - QUICKADD_FALLBACK_WIDTH) / 2),
          y: display.y + Math.round((display.height - QUICKADD_FALLBACK_HEIGHT) / 2),
          width: QUICKADD_FALLBACK_WIDTH,
          height: QUICKADD_FALLBACK_HEIGHT
        }
        this.win!.setBounds({
          x: Math.round(h.x + h.width / 2 - targetWidth / 2),
          y: Math.round(h.y - targetHeight - GAP),
          width: targetWidth,
          height: targetHeight
        })
        break
      }
      case 'right-of-list': {
        // Mirror the actual first list window's screen position when no
        // host exists yet, so the 'navigate' callout (pre-summon) and
        // 'navigate-actions' callout (post-summon) sit at the same spot.
        const display = screen.getPrimaryDisplay().workArea
        const h = host?.getBounds() ?? {
          x: display.x + LIST_FALLBACK_INITIAL_X,
          y: display.y + LIST_FALLBACK_INITIAL_Y,
          width: LIST_FALLBACK_WIDTH,
          height: 0 // unused for this anchor
        }
        this.win!.setBounds({
          x: Math.round(h.x + h.width + GAP),
          y: Math.round(h.y),
          width: targetWidth,
          height: targetHeight
        })
        break
      }
      case 'below-tray': {
        const display = screen.getPrimaryDisplay().workArea
        if (trayBounds && trayBounds.width > 0) {
          // Center the callout under the tray icon, then clamp horizontally
          // to the display's safe area so it never runs off-screen. This
          // adapts to wherever the user's tray icon currently sits — middle
          // of the menu bar, near the system tray, or anywhere in between
          // — without assuming any particular layout. Falls back to a
          // right-aligned position only when centering would overflow.
          const trayCenter = trayBounds.x + trayBounds.width / 2
          const idealX = trayCenter - targetWidth / 2
          const minX = display.x + SAFE_MARGIN
          const maxX = display.x + display.width - targetWidth - SAFE_MARGIN
          const clampedX = Math.max(minX, Math.min(idealX, maxX))

          if (is.dev) {
            console.log('[onboarding] below-tray placement:', {
              trayBounds,
              trayCenter,
              idealX: Math.round(idealX),
              clampedX: Math.round(clampedX),
              didClamp: clampedX !== idealX
            })
          }

          this.win!.setBounds({
            x: Math.round(clampedX),
            y: Math.round(trayBounds.y + trayBounds.height + GAP),
            width: targetWidth,
            height: targetHeight
          })
        } else {
          // Linux/Win fallback (or whenever tray bounds aren't available):
          // top-right of primary display.
          this.win!.setBounds({
            x: display.x + display.width - targetWidth - SAFE_MARGIN,
            y: display.y + SAFE_MARGIN,
            width: targetWidth,
            height: targetHeight
          })
        }
        break
      }
      case 'centered': {
        const display = host
          ? screen.getDisplayMatching(host.getBounds())
          : screen.getPrimaryDisplay()
        this.win!.setBounds({
          x: Math.round(
            display.workArea.x + display.workArea.width / 2 - targetWidth / 2
          ),
          y: Math.round(
            display.workArea.y + display.workArea.height / 2 - targetHeight / 2
          ),
          width: targetWidth,
          height: targetHeight
        })
        break
      }
    }
  }
}
