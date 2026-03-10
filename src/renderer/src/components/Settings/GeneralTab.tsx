import { useState, useEffect } from 'react'

export function GeneralTab() {
  const [launchAtLogin, setLaunchAtLogin] = useState(false)

  useEffect(() => {
    // Read current login item state
    window.api.getLoginItemSettings?.().then((settings) => {
      setLaunchAtLogin(settings?.openAtLogin ?? false)
    }).catch(() => {})
  }, [])

  const toggleLaunchAtLogin = async () => {
    const next = !launchAtLogin
    setLaunchAtLogin(next)
    await window.api.setLoginItemSettings?.(next)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Launch at login */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Launch at login</div>
          <div className="text-xs text-[var(--color-text-muted)]">Start Vimyasa when you log in</div>
        </div>
        <button
          className={`w-9 h-5 rounded-full transition-colors relative ${
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

      {/* App info */}
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">About</div>
        <div className="text-xs text-[var(--color-text-muted)]">Vimyasa v0.1.0</div>
        <div className="text-xs text-[var(--color-text-dim)]">Keyboard-first list manager for macOS</div>
      </div>
    </div>
  )
}
