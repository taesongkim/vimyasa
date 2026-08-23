import { spawn } from 'child_process'
import { homedir } from 'os'
import path from 'path'
import { app, ipcMain } from 'electron'
import pkg from 'electron-updater'
import {
  getWindowPayload,
  hideUpdatePromptWindow,
  setUpdatePromptHeight,
  showUpdatePrompt
} from './windows'
// Runtime-only cyclic import: tray.ts imports checkForUpdatesManual
// from here, and we call updateTrayMenu() from here. Both references
// resolve at call time (never during module init), so the cycle is
// safe. The tray needs a rebuild whenever `pendingUpdate` changes so
// the conditional "View Update Details" entry appears / disappears.
import { updateTrayMenu } from './tray'

const { autoUpdater } = pkg

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

// Set when the user explicitly asks to check (tray "Check for
// Updates…"). Gates the user-visible result affordances so the silent
// 4-hourly background check never pops a window on 'update-not-
// available' or a transient network 'error'. Consumed (reset to
// false) by whichever event resolves the check.
let userInitiatedCheck = false

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
    // A real update outranks any in-flight manual check — the update
    // prompt IS the answer, so no separate up-to-date affordance.
    userInitiatedCheck = false
    showUpdatePrompt({
      phase: 'available',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes)
    })
    // Rebuild the tray so "View Update Details" appears.
    updateTrayMenu()
  })

  // v0.1.13: keep the update window visible during download with a
  // live progress bar, so the user isn't stuck wondering whether
  // anything's happening after they clicked Download Now. Each event
  // pushes a fresh payload with the current percent; the same window
  // updates in place (showUpdatePrompt handles the idempotent path).
  // Only fires between update:install → 'update-downloaded'; if the
  // user dismissed the download-prompt window, the payload updates
  // still land but the window stays hidden.
  //
  // Latest electron-updater versions may pass an `info` object with
  // {bytesPerSecond, percent, transferred, total}; use `percent`
  // rounded to the nearest int. Fallback to 0 if the field is missing
  // (some providers omit it early in the download).
  autoUpdater.on('download-progress', (info) => {
    const percent =
      typeof info?.percent === 'number' && isFinite(info.percent)
        ? Math.max(0, Math.min(100, Math.round(info.percent)))
        : 0
    // Read the version from whatever the last actionable payload was;
    // the download-progress event doesn't carry the version itself.
    const prior = getWindowPayload()
    const version = prior?.version ?? app.getVersion()
    showUpdatePrompt({
      phase: 'downloading',
      version,
      releaseNotes: '',
      downloadProgress: percent
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    userInitiatedCheck = false
    showUpdatePrompt({
      phase: 'downloaded',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes)
    })
    updateTrayMenu()
  })

  autoUpdater.on('update-not-available', () => {
    // Silent for the 4-hourly background check — only a user-initiated
    // "Check for Updates…" earns the up-to-date affordance.
    if (!userInitiatedCheck) return
    userInitiatedCheck = false
    showUpdatePrompt({ phase: 'up-to-date', version: app.getVersion(), releaseNotes: '' })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
    // Only surface failures the user is actively waiting on; background
    // check failures stay silent (they retry in 4h anyway).
    if (!userInitiatedCheck) return
    userInitiatedCheck = false
    showUpdatePrompt({ phase: 'error', version: app.getVersion(), releaseNotes: '' })
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

/** User-initiated update check from the tray. Sets the flag that
 *  unlocks the up-to-date / error affordances (the background check
 *  leaves it false and stays silent), then kicks electron-updater.
 *
 *  In dev the updater singleton is inert (setupAutoUpdater bailed
 *  before setFeedURL), so calling checkForUpdates would just reject.
 *  Short-circuit to the up-to-date window — the most common real
 *  result — so the tray entry stays verifiable in dev. */
export function checkForUpdatesManual(): void {
  if (!app.isPackaged) {
    showUpdatePrompt({ phase: 'up-to-date', version: app.getVersion(), releaseNotes: '' })
    return
  }
  userInitiatedCheck = true
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] manual check failed:', err)
    // Belt-and-suspenders: the 'error' event normally fires too, but
    // if the promise rejects without emitting one, surface it here.
    if (!userInitiatedCheck) return
    userInitiatedCheck = false
    showUpdatePrompt({ phase: 'error', version: app.getVersion(), releaseNotes: '' })
  })
}

function registerUpdaterIpcHandlers(): void {
  // User clicked "Download Now" on the update-available prompt.
  // v0.1.13: keep the window visible and immediately transition it
  // into the 'downloading' phase with progress = 0. The
  // download-progress event listener above updates the payload as
  // bytes arrive; update-downloaded then transitions to 'downloaded'
  // with the Install & Restart button. One continuous window
  // experience instead of the previous open → hide → reopen dance.
  ipcMain.handle('update:install', () => {
    if (!app.isPackaged) return
    // Read version from whichever payload was last shown (should be
    // 'available' since the user just clicked Download Now from it).
    const prior = getWindowPayload()
    const version = prior?.version ?? app.getVersion()
    showUpdatePrompt({
      phase: 'downloading',
      version,
      releaseNotes: '',
      downloadProgress: 0
    })
    autoUpdater.downloadUpdate().catch((err) => {
      console.error('[updater] downloadUpdate failed:', err)
    })
  })

  // User clicked "Restart Now" on the update-downloaded prompt.
  //
  // History of this handler:
  //
  // v0.1.7 → v0.1.10: called `autoUpdater.quitAndInstall()`, which
  //   relies on Squirrel.framework (inside our process) to spawn the
  //   ShipIt helper as a detached child right before quit. On macOS 26
  //   (Tahoe) that spawn silently fails, so nothing installs.
  //
  // v0.1.11 → v0.1.12 (broken attempt): bypassed quitAndInstall()
  //   entirely and spawned ShipIt directly via child_process. This
  //   ALSO didn't work — but for a different reason. ShipIt requires
  //   a state plist at ~/Library/Caches/<app-bundle-id>.ShipIt/
  //   ShipItState.plist that tells it what to install where. That
  //   plist is normally written by Squirrel INSIDE quitAndInstall.
  //   By bypassing quitAndInstall entirely, we skipped the state-
  //   plist write. ShipIt was being spawned with a path to a
  //   non-existent state file, silently exiting. The direct-spawn
  //   pattern only "worked" in manual Terminal tests because leftover
  //   state from previous failed quitAndInstall attempts happened to
  //   still be sitting in the cache dir.
  //
  // v0.1.13 (current): let Squirrel do its state-plist setup by
  //   calling quitAndInstall() normally. Its own spawn attempt will
  //   still fail silently on macOS 26 — but by that point, the state
  //   plist has been written to disk with the correct staged-update
  //   path. Meanwhile, we register a `will-quit` listener that spawns
  //   ShipIt ourselves via child_process, right before the app dies.
  //   Since Squirrel's setup already ran by then, ShipIt now has a
  //   valid state file to read from. Combines Squirrel's staging
  //   correctness with our direct-spawn workaround.
  ipcMain.handle('update:restart', () => {
    if (!app.isPackaged) return

    // Register the direct-spawn ShipIt launch to fire right before
    // the app quits. quitAndInstall() (below) triggers app.quit()
    // internally after Squirrel's setup + failed spawn, so will-quit
    // fires with the state plist already on disk.
    app.once('will-quit', () => {
      try {
        const shipItPath = path.join(
          process.resourcesPath,
          '../Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt'
        )
        const stateFile = path.join(
          homedir(),
          'Library/Caches/com.taesongkim.vimyasa.ShipIt/ShipItState.plist'
        )
        spawn(shipItPath, ['com.taesongkim.vimyasa.ShipIt', stateFile], {
          detached: true,
          stdio: 'ignore'
        }).unref()
      } catch (err) {
        // If our spawn throws (rare — path or state plist missing),
        // there's nothing else to fall back on at this point since
        // the app is already quitting.
        console.error('[updater] will-quit ShipIt spawn failed:', err)
      }
    })

    // This does: (a) write ShipItState.plist with the correct
    // staged-update path, (b) attempt Squirrel's own ShipIt spawn
    // (silently fails on macOS 26 — harmless), (c) triggers
    // app.quit() which fires our will-quit listener above.
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
      payload: {
        phase: 'available' | 'downloaded' | 'up-to-date' | 'error'
        version: string
        releaseNotes: string
      }
    ) => {
      if (app.isPackaged) return
      showUpdatePrompt(payload)
    }
  )

  // Pull-style initial state for the renderer: when the update prompt
  // window mounts, it asks main "what payload should I show?" Main
  // replies with whatever was sent last. Covers the race where main
  // sends `update:show` before the renderer subscribes.
  ipcMain.handle('update:get-pending', () => getWindowPayload())

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
