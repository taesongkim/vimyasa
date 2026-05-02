import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getThemesPreloadArg } from '../themes-store'

// Full-screen dimming overlay shown during the onboarding tour. Sits in
// the window stack ABOVE other apps' normal-level windows but BELOW
// Vimyasa's own list / quickadd / callout windows (which use level
// 'floating' or higher). On macOS the system menu bar and dock are above
// all app windows regardless, so the tray icon stays visible — important
// for the 'tray' step of the tour. User-dismissible via a corner button.
export class DimOverlay {
  private win: BrowserWindow | null = null
  // Cached promise so multiple callers (preloadDim at app start AND
  // start/replay at tour time) share the same wait. Without this, a
  // second call before ready-to-show fires would think the window is
  // ready and resolve immediately, racing the actual ready event.
  private preloadPromise: Promise<void> | null = null
  // Active fade-in timer, so hide() can interrupt it cleanly mid-fade.
  private fadeTimer: ReturnType<typeof setInterval> | null = null

  /** Create the BrowserWindow and start loading its renderer, but don't
   *  show it yet. Resolves when the renderer's first frame is ready.
   *  Idempotent: subsequent calls return the same promise (or an
   *  already-resolved one if ready-to-show has fired). Lets us pre-warm
   *  the dim once at app start and have tour-start become a near-instant
   *  show() call. */
  createAndPreload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise
    if (this.win && !this.win.isDestroyed()) return Promise.resolve()

    // Cover the primary display's work area (excludes menu bar + dock,
    // which are system chrome and stay visible above any window anyway).
    // Multi-display polish (one dim per screen) is intentionally deferred
    // — most users see the tour on a single display.
    const wa = screen.getPrimaryDisplay().workArea

    this.win = new BrowserWindow({
      x: wa.x,
      y: wa.y,
      width: wa.width,
      height: wa.height,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      // Don't steal focus — keystrokes flow to the host windows the
      // tour is teaching about.
      focusable: false,
      alwaysOnTop: true,
      // No vibrancy — we tried OS-level blur but it read as too heavy
      // for the tour's purposes. Plain darken via CSS only.
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        additionalArguments: [getThemesPreloadArg()]
      }
    })

    // Level 'normal' + alwaysOnTop:true puts the dim above other apps'
    // normal-level windows. Vimyasa's own windows are at 'floating' or
    // higher, so they'll always render above the dim. Don't set this to
    // 'floating' — that would put the dim ON TOP of Vimyasa.
    this.win.setAlwaysOnTop(true, 'normal')
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/onboarding-dim`)
    } else {
      this.win.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/onboarding-dim'
      })
    }

    this.win.on('closed', () => {
      this.win = null
      this.preloadPromise = null
    })

    // Tell the renderer every time we actually show the window. Used by
    // the dim's React tree to gate "expensive" mount work (the dot grid)
    // until the window is on-screen — so CSS animations on the dots
    // start fresh in a visible context instead of being throttled while
    // the window is still hidden during pre-warm.
    this.win.on('show', () => {
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send('onboarding:dim-shown')
      }
    })

    this.preloadPromise = new Promise<void>((resolve) => {
      this.win!.once('ready-to-show', () => resolve())
    })
    return this.preloadPromise
  }

  /** Display the window with a window-level alpha fade-in. Setting alpha
   *  to 0 before show() hides macOS's default appearance animation
   *  (a subtle scale-in for transparent frameless windows) — by the time
   *  the user sees anything, macOS's animation is already done and
   *  alpha is ramping smoothly from 0 to 1. */
  showNow(): void {
    if (!this.win || this.win.isDestroyed()) return
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
    this.win.setOpacity(0)
    this.win.show()
    const start = Date.now()
    const duration = 250
    this.fadeTimer = setInterval(() => {
      if (!this.win || this.win.isDestroyed()) {
        if (this.fadeTimer) clearInterval(this.fadeTimer)
        this.fadeTimer = null
        return
      }
      const elapsed = Date.now() - start
      const t = Math.min(elapsed / duration, 1)
      // Ease-out (quadratic) so most of the visual fade happens early
      // and lands smoothly at 1.
      const eased = 1 - Math.pow(1 - t, 2)
      this.win.setOpacity(eased)
      if (t >= 1 && this.fadeTimer) {
        clearInterval(this.fadeTimer)
        this.fadeTimer = null
      }
    }, 16)
  }

  /** Hide the window without destroying it. Used between tours when the
   *  window is pre-warmed and we want a near-instant re-show on the next
   *  start(). Renderer process stays alive; React tree stays mounted. */
  hide(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
    if (this.win && !this.win.isDestroyed()) {
      this.win.hide()
    }
  }

  /** Fully close the window. Used at app shutdown or when we want to
   *  force a fresh load on the next preload. */
  destroy(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
    if (this.win && !this.win.isDestroyed()) {
      this.win.close()
    }
    this.win = null
    this.preloadPromise = null
  }

  isAlive(): boolean {
    return !!(this.win && !this.win.isDestroyed())
  }
}
