import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import type { UpdatePromptPayload } from '../../../../shared/types'

// Custom in-app window for the auto-update flow. Replaces the native
// `dialog.showMessageBox` that v0.1.7 and earlier used — native
// dialogs can't render markdown, so the GitHub release notes that
// would have been buried in the GitHub UI now live inline on the
// "ready to install" prompt.
//
// Two phases (driven by `payload.phase`):
//   - 'available'  → Install Now / Later. Just the version.
//   - 'downloaded' → Restart Now / Later. Version + release notes.
//
// The window is created lazily by main on each update event; this
// component subscribes to `update:show` for pushes AND pulls
// `update:get-pending` on mount (covers the race where main sent
// the IPC before useEffect hooked up). Esc / backdrop / Later all
// route through `update:dismiss`.

// marked configured for plain markdown + GFM. Code blocks render in
// monospace; no syntax-highlight (not worth the bundle weight for
// release notes that rarely include code).
marked.setOptions({
  gfm: true,
  breaks: false
})

export function UpdatePromptWindow() {
  const [payload, setPayload] = useState<UpdatePromptPayload | null>(null)
  const installBtnRef = useRef<HTMLButtonElement>(null)
  const restartBtnRef = useRef<HTMLButtonElement>(null)

  // Subscribe to push from main AND pull the pending payload on
  // mount in case main pushed before this effect installed the
  // listener (window-create race).
  useEffect(() => {
    const off = window.api.update.onShow((p) => setPayload(p))
    void window.api.update.getPending().then((p) => {
      if (p) setPayload(p)
    })
    return off
  }, [])

  // Focus the primary action when the payload arrives, so Enter
  // commits the obvious choice. (Install Now for 'available',
  // Restart Now for 'downloaded'.)
  useEffect(() => {
    if (!payload) return
    if (payload.phase === 'available') installBtnRef.current?.focus()
    else restartBtnRef.current?.focus()
  }, [payload])

  // Esc dismisses (matches the previous native-dialog Cancel key).
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        void window.api.update.dismiss()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Render the release notes once per payload change. marked.parse
  // can be expensive on huge notes (concatenated multi-version
  // bodies); useMemo keeps it off the focus-change re-render path.
  const renderedNotes = useMemo(() => {
    if (!payload || !payload.releaseNotes) return ''
    return marked.parse(payload.releaseNotes) as string
  }, [payload])

  if (!payload) {
    return (
      <div className="flex flex-col h-full glass-surface items-center justify-center">
        <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isDownloaded = payload.phase === 'downloaded'

  return (
    <div className="flex flex-col h-full glass-surface px-5 py-4 gap-3 drag-region">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-md)] font-medium text-[color:var(--color-text-primary)]">
          {isDownloaded
            ? `Vimyasa ${payload.version} is ready to install`
            : `Vimyasa ${payload.version} is available`}
        </div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          {isDownloaded
            ? 'Restart to apply the update. You can keep using the app and restart later if you prefer.'
            : 'Download in the background. You can keep using the app while it downloads.'}
        </div>
      </div>

      {/* Release notes (only on 'downloaded'). The notes scroll
          inside the window so very long bodies don't push the action
          row off-screen. */}
      {isDownloaded && (
        <div className="no-drag flex-1 min-h-0 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
          {payload.releaseNotes ? (
            <div
              className="release-notes text-[length:var(--font-size-sm)] text-[color:var(--color-text-secondary)]"
              dangerouslySetInnerHTML={{ __html: renderedNotes }}
            />
          ) : (
            <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] italic">
              No release notes provided for this version.
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="no-drag flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void window.api.update.dismiss()}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default focus:outline-none focus:border-[var(--color-accent)]"
        >
          Later
        </button>
        {isDownloaded ? (
          <button
            ref={restartBtnRef}
            type="button"
            onClick={() => void window.api.update.restart()}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] font-medium bg-[var(--color-accent)] border border-[var(--color-accent)] text-white hover:opacity-90 transition-default focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg)]"
          >
            Restart Now
          </button>
        ) : (
          <button
            ref={installBtnRef}
            type="button"
            onClick={() => void window.api.update.install()}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] font-medium bg-[var(--color-accent)] border border-[var(--color-accent)] text-white hover:opacity-90 transition-default focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg)]"
          >
            Install Now
          </button>
        )}
      </div>
    </div>
  )
}
