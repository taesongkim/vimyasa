import { useState, useEffect, useMemo } from 'react'
import { marked } from 'marked'

type AppInfo = {
  version: string
  isDev: boolean
  electronVersion: string
  gitBranch: string | null
  gitSha: string | null
}

// null = still loading; { notes: null } = failed to load; { notes: '' }
// = release exists but has no body; { notes: '…' } = render it.
type ReleaseNotes = { version: string; notes: string | null } | null

// Same markdown config as the update prompt window — plain GFM, no
// syntax highlighting. Module scope so it's set once.
marked.setOptions({ gfm: true, breaks: false })

export function GeneralTab() {
  const [launchAtLogin, setLaunchAtLogin] = useState(false)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNotes>(null)
  const [notesLoaded, setNotesLoaded] = useState(false)

  useEffect(() => {
    // Read current login item state
    window.api.getLoginItemSettings?.().then((settings) => {
      setLaunchAtLogin(settings?.openAtLogin ?? false)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    window.api.getAppInfo?.().then(setAppInfo).catch(() => {})
  }, [])

  useEffect(() => {
    const done = (r: NonNullable<ReleaseNotes>): void => {
      setReleaseNotes(r)
      setNotesLoaded(true)
    }
    window.api
      .getCurrentReleaseNotes?.()
      .then((r) => done(r))
      .catch(() => done({ version: '', notes: null }))
  }, [])

  // Render the markdown once per notes change; marked.parse is off the
  // re-render path (mirrors the update prompt window).
  const renderedNotes = useMemo(() => {
    if (!releaseNotes?.notes) return ''
    return marked.parse(releaseNotes.notes) as string
  }, [releaseNotes])

  const toggleLaunchAtLogin = async () => {
    const next = !launchAtLogin
    setLaunchAtLogin(next)
    await window.api.setLoginItemSettings?.(next)
  }

  const version = appInfo ? `v${appInfo.version}` : '…'

  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      {/* Launch at login */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[length:var(--font-size-base)] font-medium">Launch at login</div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">Start Vimyasa when you log in</div>
        </div>
        <button
          className={`w-9 h-5 rounded-full transition-default relative ${
            launchAtLogin ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
          }`}
          onClick={toggleLaunchAtLogin}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              launchAtLogin ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* About — app identity + (in dev) git build metadata. Version is
          pulled live from main (app.getVersion()). */}
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-base)] font-medium">About</div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          Vimyasa {version}
        </div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)]">
          Keyboard-first list manager for macOS
        </div>

        {appInfo?.isDev && (
          <div className="mt-2 flex flex-col gap-0.5 px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--hover-highlight)] border border-[var(--color-border)] font-mono text-[length:var(--font-size-xs)]">
            <div className="flex items-center gap-1.5 text-[color:var(--color-amber)]">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)] shrink-0"
              />
              <span className="font-sans font-medium not-italic">Development build · HMR active</span>
            </div>
            {appInfo.gitBranch && (
              <div className="flex justify-between gap-2 text-[color:var(--color-text-muted)]">
                <span>branch</span>
                <span className="text-[color:var(--color-text-primary)] truncate">{appInfo.gitBranch}</span>
              </div>
            )}
            {appInfo.gitSha && (
              <div className="flex justify-between gap-2 text-[color:var(--color-text-muted)]">
                <span>commit</span>
                <span className="text-[color:var(--color-text-primary)]">{appInfo.gitSha}</span>
              </div>
            )}
            <div className="flex justify-between gap-2 text-[color:var(--color-text-muted)]">
              <span>electron</span>
              <span className="text-[color:var(--color-text-primary)]">{appInfo.electronVersion}</span>
            </div>
          </div>
        )}
      </div>

      {/* Current version's release notes — same marked + .release-notes
          treatment as the auto-update prompt. Scrolls inside its own
          pane so the Settings window doesn't have to grow for long
          notes. */}
      <div className="flex flex-col gap-2">
        <div className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text-secondary)]">
          What&apos;s new in {version}
        </div>

        {!notesLoaded ? (
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Loading release notes…
          </div>
        ) : releaseNotes?.notes ? (
          <div className="max-h-[240px] overflow-y-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-2">
            <div
              className="release-notes text-[length:var(--font-size-sm)] text-[color:var(--color-text-secondary)]"
              dangerouslySetInnerHTML={{ __html: renderedNotes }}
            />
          </div>
        ) : releaseNotes?.notes === '' ? (
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] italic">
            No release notes provided for this version.
          </div>
        ) : (
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Release notes couldn&apos;t be loaded — check your connection and reopen this tab.
          </div>
        )}
      </div>
    </div>
  )
}
