import { app, ipcMain } from 'electron'
import pkg from 'electron-updater'
import {
  getPendingUpdatePayload,
  hideUpdatePromptWindow,
  setUpdatePromptHeight,
  showUpdatePrompt
} from './windows'

const { autoUpdater } = pkg

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

/** Normalize electron-updater's `releaseNotes` into a single markdown
 *  string. The GitHub provider typically returns a string already, but
 *  when multiple versions are skipped it can be an array of
 *  `ReleaseNoteInfo` objects (`{ version, note }`). We concatenate in
 *  reverse chronological order (latest at top) so users who've been
 *  away see what's new first.
 *
 *  Per the dispatch brief: "show all, chronological, latest at top —
 *  the user's been away and might appreciate the full context." */
function normalizeReleaseNotes(
  raw: string | Array<{ version: string; note: string | null }> | undefined
): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    // Sort by version descending (latest first). Falls back to original
    // order if versions aren't comparable.
    const sorted = [...raw].sort((a, b) => {
      try {
        return compareVersions(b.version, a.version)
      } catch {
        return 0
      }
    })
    return sorted
      .filter((r) => r.note)
      .map((r) => `## v${r.version}\n\n${r.note}`)
      .join('\n\n---\n\n')
  }
  return ''
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}

export function setupAutoUpdater(): void {
  // Register the renderer-facing IPC handlers EVERY time the app
  // starts, including dev. The handlers no-op gracefully if no update
  // is in flight, so test paths from the renderer don't crash.
  registerUpdaterIpcHandlers()

  // The actual updater itself only runs in packaged builds — the
  // electron-updater singleton's setFeedURL + checkForUpdates assume
  // an installed app context. Dev exits here.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'taesongkim',
    repo: 'vimyasa'
  })

  autoUpdater.on('update-available', (info) => {
    showUpdatePrompt({
      phase: 'available',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    showUpdatePrompt({
      phase: 'downloaded',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes)
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
  })

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] initial check failed:', err)
  })
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] interval check failed:', err)
    })
  }, FOUR_HOURS_MS)
}

function registerUpdaterIpcHandlers(): void {
  // User clicked "Install Now" on the update-available prompt.
  // electron-updater downloads in the background; update-downloaded
  // fires when it's ready. We close the prompt window — the next
  // event opens a fresh one with the release notes.
  ipcMain.handle('update:install', () => {
    if (!app.isPackaged) return
    autoUpdater.downloadUpdate().catch((err) => {
      console.error('[updater] downloadUpdate failed:', err)
    })
    hideUpdatePromptWindow()
  })

  // User clicked "Restart Now" on the update-downloaded prompt.
  // quitAndInstall closes the app + relaunches into the new version.
  ipcMain.handle('update:restart', () => {
    if (!app.isPackaged) return
    autoUpdater.quitAndInstall()
  })

  // Both phases share the Later / backdrop / Esc dismiss path —
  // closes the window. Re-opens on the next update event.
  ipcMain.handle('update:dismiss', () => {
    hideUpdatePromptWindow()
  })

  // Dev-only test path. Lets the renderer summon a mock update
  // prompt with hand-crafted data when the app isn't packaged
  // (electron-updater is dead in dev). No-op in production.
  ipcMain.handle(
    'update:test-show',
    (
      _e,
      payload: { phase: 'available' | 'downloaded'; version: string; releaseNotes: string }
    ) => {
      if (app.isPackaged) return
      showUpdatePrompt(payload)
    }
  )

  // Pull-style initial state for the renderer: when the update prompt
  // window mounts, it asks main "what payload should I show?" Main
  // replies with whatever was sent last. Covers the race where main
  // sends `update:show` before the renderer subscribes.
  ipcMain.handle('update:get-pending', () => getPendingUpdatePayload())

  // Renderer-driven adaptive resize. Mirrors the onboarding callout's
  // `onboarding:request-resize` pattern: renderer measures its own
  // content via ResizeObserver and asks main to match the window
  // height. Width / top-left position stay locked; main clamps height
  // to [UPDATE_PROMPT_MIN_HEIGHT, UPDATE_PROMPT_MAX_HEIGHT] so very-
  // long release-notes scroll inside the pane instead of growing the
  // window past screen.
  ipcMain.handle('update:request-resize', (_e, height: number) => {
    setUpdatePromptHeight(height)
  })
}
