import { useState, useEffect } from 'react'

type AppInfo = {
  version: string
  isDev: boolean
  electronVersion: string
  gitBranch: string | null
  gitSha: string | null
}

export function GeneralTab() {
  const [launchAtLogin, setLaunchAtLogin] = useState(false)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    // Read current login item state
    window.api.getLoginItemSettings?.().then((settings) => {
      setLaunchAtLogin(settings?.openAtLogin ?? false)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Pull live app info on mount. Cheap; runs once per Settings open.
    window.api.getAppInfo?.().then(setAppInfo).catch(() => {})
  }, [])

  const toggleLaunchAtLogin = async () => {
    const next = !launchAtLogin
    setLaunchAtLogin(next)
    await window.api.setLoginItemSettings?.(next)
  }

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

      {/* Separator */}
      <div className="border-t border-[var(--color-border)]" />

      {/* App info — version pulled live from main (app.getVersion());
          in dev runs, also surfaces git branch + short SHA so multi-
          worktree iteration is self-evidently labeled. */}
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-base)] font-medium">About</div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          Vimyasa {appInfo ? `v${appInfo.version}` : '…'}
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
    </div>
  )
}
