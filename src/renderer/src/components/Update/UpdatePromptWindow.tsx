import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import { GlowSurface } from '../shared/GlowSurface'
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
//
// Adaptive height: the renderer measures its rendered content via
// ResizeObserver and asks main to match the window height. Mirrors
// the onboarding callout's request-resize pattern (see
// `onboarding:request-resize` in src/main/ipc.ts). Main clamps to a
// sane range — the notes pane scrolls inside its own bounds for
// very-long release-notes bodies.
//
// Layout split: the OUTER container is h-full glass-surface so the
// window's vibrancy stays covered through the brief moment between
// content mount and the resize IPC landing. The INNER container is
// content-sized — its scrollHeight is what we measure. Without this
// split the outer's h-full would make scrollHeight equal the current
// window height (no resize would ever trigger).

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
  // Outer ref the ResizeObserver watches. This is the inner content
  // wrapper (not the h-full outer), so its scrollHeight reflects the
  // intrinsic content height.
  const contentRef = useRef<HTMLDivElement>(null)

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

  // Renderer-driven resize. ResizeObserver fires on every layout
  // change (including phase-transition animations); a short debounce
  // coalesces the animation frames so we only request a final
  // settled height per phase change. Main clamps to a sane range.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    let pending: number | null = null
    const request = (): void => {
      const measured = el.scrollHeight
      void window.api.update.requestResize(measured)
    }
    // Initial measure on mount + payload arrival.
    request()
    const obs = new ResizeObserver(() => {
      if (pending !== null) window.clearTimeout(pending)
      pending = window.setTimeout(() => {
        pending = null
        request()
      }, 80)
    })
    obs.observe(el)
    return () => {
      if (pending !== null) window.clearTimeout(pending)
      obs.disconnect()
    }
  }, [payload])

  if (!payload) {
    return (
      <div className="h-full glass-surface flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isDownloaded = payload.phase === 'downloaded'

  return (
    // Outer: full-window glass cover. Stays at window height even
    // when content is shorter so vibrancy doesn't show through the
    // gap before the resize IPC lands.
    <div className="h-full glass-surface drag-region">
      {/* Inner: content-sized, measured. scrollHeight here is the
          intrinsic content height, which is what we send to main. */}
      <div
        ref={contentRef}
        className="flex flex-col px-6 py-5 gap-4"
      >
        {/* Header — title is the moment the user is reading for ("X is
            ready"). Inter Tight + semibold gives it the same weight as
            a list-window title; tight tracking lets the version number
            read as one unit with the verb.
            AnimatePresence on the title text cross-fades between
            phases (available → downloaded) when the same window's
            payload updates in place. */}
        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={payload.phase}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-tight text-[length:var(--font-size-lg)] font-semibold tracking-tight text-[color:var(--color-text-primary)] leading-tight"
            >
              {isDownloaded
                ? `Vimyasa ${payload.version} is ready to install`
                : `Vimyasa ${payload.version} is available`}
            </motion.div>
          </AnimatePresence>
          <div className="text-[length:var(--font-size-sm)] leading-[1.5] text-[color:var(--color-text-muted)]">
            {isDownloaded
              ? 'Restart to apply the update. You can keep using the app and restart later if you prefer.'
              : 'Download in the background. You can keep using the app while it downloads.'}
          </div>
        </div>

        {/* Release notes (only on 'downloaded'). The notes scroll
            inside the window so very long bodies don't push the action
            row off-screen. The pane uses a subtle surface tint instead
            of a hard border — the contrast against glass-surface
            vibrancy is enough to read as a container, and dropping the
            border lets the typography do the talking. max-h caps the
            pane so adaptive-resize doesn't grow the window past the
            screen on long notes — the pane scrolls instead. */}
        <AnimatePresence mode="wait" initial={false}>
          {isDownloaded && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="no-drag min-h-0 max-h-[340px] overflow-y-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action row — secondary uses .onb-btn-secondary (translucent
            surface + subtle border, matches Skip on the welcome
            callout). Primary wraps in GlowSurface with the
            `welcome-callout-start-button` surface so the themed
            rotating beam / particle treatment carries here. Structure
            mirrors CalloutWindow exactly (no motion.div wrap on the
            primary) so the buttons share baseline alignment in the
            flex action row. focus:outline-none kills the macOS
            default orange focus ring — the GlowSurface's themed
            beam is the visible attention indicator. */}
        <div className="no-drag flex items-center justify-end gap-2">
          <button
            type="button"
            className="onb-btn onb-btn-secondary focus:outline-none"
            onClick={() => void window.api.update.dismiss()}
          >
            Later
          </button>
          {isDownloaded ? (
            <GlowSurface
              surface="welcome-callout-start-button"
              style={{ display: 'inline-block' }}
            >
              <button
                ref={restartBtnRef}
                type="button"
                className="onb-btn onb-btn-glow focus:outline-none"
                onClick={() => void window.api.update.restart()}
              >
                Restart Now
              </button>
            </GlowSurface>
          ) : (
            <GlowSurface
              surface="welcome-callout-start-button"
              style={{ display: 'inline-block' }}
            >
              <button
                ref={installBtnRef}
                type="button"
                className="onb-btn onb-btn-glow focus:outline-none"
                onClick={() => void window.api.update.install()}
              >
                Install Now
              </button>
            </GlowSurface>
          )}
        </div>
      </div>
    </div>
  )
}
