import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { useThemesStore } from './store/themesStore'
import { useGlobalUndo } from './hooks/useGlobalUndo'
import { ListWindow } from './components/ListWindow/ListWindow'
import { QuickAddFixed } from './components/QuickAdd/QuickAddFixed'
import { FeedbackWindow } from './components/Feedback/FeedbackWindow'
import { UpdatePromptWindow } from './components/Update/UpdatePromptWindow'
import { CommentsWindow } from './components/Comments/CommentsWindow'
import { SettingsWindow, type SettingsTab } from './components/Settings/SettingsWindow'
import { ArchiveWindow } from './components/Archive/ArchiveWindow'
import { ShortcutsOverview } from './components/ShortcutsOverview'
import { CalloutWindow } from './components/Onboarding/CalloutWindow'
import { DimOverlay } from './components/Onboarding/DimOverlay'
import { GlowSurface } from './components/shared/GlowSurface'
import { ThemeDevPanel } from './components/ThemeDevPanel/ThemeDevPanel'

interface RouteInfo {
  route: string
  params: Record<string, string>
}

function parseHash(): RouteInfo {
  const hash = window.location.hash.replace('#', '')
  const parts = hash.split('/')

  if (parts[1] === 'list' && parts[2]) {
    return { route: 'list', params: { listId: parts[2] } }
  }
  if (parts[1] === 'quickadd' && parts[2] === 'fixed') {
    return { route: 'quickadd-fixed', params: { listId: parts[3] || '' } }
  }
  if (parts[1] === 'quickadd' && parts[2] === 'select') {
    return { route: 'quickadd-fixed', params: { listId: '' } }
  }
  if (parts[1] === 'feedback') {
    return { route: 'feedback', params: {} }
  }
  if (parts[1] === 'update') {
    return { route: 'update', params: {} }
  }
  if (parts[1] === 'comments' && parts[2]) {
    return { route: 'comments', params: { itemId: parts[2] } }
  }
  if (parts[1] === 'settings') {
    return { route: 'settings', params: { tab: parts[2] || '' } }
  }
  if (parts[1] === 'archive') {
    return { route: 'archive', params: { listId: parts[2] || '' } }
  }
  if (parts[1] === 'shortcuts-overview') {
    return { route: 'shortcuts-overview', params: {} }
  }
  if (parts[1] === 'onboarding') {
    return { route: 'onboarding', params: {} }
  }
  if (parts[1] === 'themedev') {
    return { route: 'themedev', params: {} }
  }
  if (parts[1] === 'onboarding-dim') {
    return { route: 'onboarding-dim', params: {} }
  }
  return { route: 'unknown', params: {} }
}

export default function App() {
  const hydrate = useStore((s) => s.hydrate)
  const hydrated = useStore((s) => s.hydrated)
  // Raw lists (includes hot). User-facing iteration filters via
  // getRegularLists; raw is fine for id-based fallback lookups.
  const lists = useStore((s) => s.lists)
  const carryMotionBlur = useStore((s) => s.effects.carryMotionBlur)
  const [route, setRoute] = useState<RouteInfo>(parseHash)
  const [error, setError] = useState<string | null>(null)

  // Cmd+Z / Cmd+Shift+Z global handler. Installed for every renderer
  // (every BrowserWindow) so the shortcut is responsive regardless
  // of which window has focus. The order-sensitive logic (edit-mode
  // cancel → carry-mode restore → log pop) lives inside the hook;
  // components opt in via `data-undo-cancel` attributes + window-
  // level `undo-check-carry` listeners.
  useGlobalUndo()

  // Universal fallback close: Cmd+W closes any window; Escape closes
  // any window when no per-window handler already claimed the keypress
  // via preventDefault. Every existing keyboard-handling surface
  // (useKeyboard, UpdatePromptWindow, FeedbackWindow, CommentsWindow,
  // Settings, etc.) already calls preventDefault on Escape, so this
  // listener is inert on windows whose renderer mounted successfully.
  //
  // The failure mode this catches: a window renders blank because its
  // route component's IPC listener attaches after main sends the show
  // payload (payload-null race) or the component throws before mount.
  // In either case the per-window keyboard hooks never install, so
  // without this fallback there is *no way* to close the window —
  // menubar-only apps have no OS-level Cmd+W handler and no titlebar
  // close button.
  //
  // React runs child effects before parent effects, so per-window
  // handlers are registered on window BEFORE this one. Listener
  // firing order matches registration order, so the child's
  // preventDefault lands before App-level Escape runs its close.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isCmdW = (e.metaKey || e.ctrlKey) && (e.key === 'w' || e.key === 'W')
      if (isCmdW) {
        e.preventDefault()
        void window.api.closeWindow()
        return
      }
      if (e.key === 'Escape' && !e.defaultPrevented) {
        void window.api.closeWindow()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Body-class gate for the carry-mode motion blur. The CSS rules in
  // globals.css for `.item-row-sending-{left,right}` reference the
  // SVG trail filter only inside `.motion-blur-enabled` — flipping
  // this class on/off enables/disables the effect without touching
  // each row. Renderer-wide so every list window in this process
  // picks it up; cross-window sync is handled by data-changed →
  // refresh hydrating each window's store from main.
  useEffect(() => {
    document.body.classList.toggle('motion-blur-enabled', carryMotionBlur)
  }, [carryMotionBlur])

  useEffect(() => {
    hydrate().catch((err) => {
      console.error('Failed to hydrate store:', err)
      setError(String(err))
    })
    // Themes hydration runs in parallel — failures are non-fatal (UI just
    // renders without glow effects rather than blocking the whole window).
    useThemesStore
      .getState()
      .hydrate()
      .catch((err) => console.error('Failed to hydrate themes store:', err))
  }, [hydrate])

  // Listen for cross-window data changes
  useEffect(() => {
    const unsubscribe = window.api.onDataChanged(() => {
      useStore.getState().refresh()
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
        <span className="text-[color:var(--color-red)] text-[length:var(--font-size-md)] font-medium">Failed to load data</span>
        <span className="text-[color:var(--color-text-ghost)] text-[length:var(--font-size-sm)] font-mono">{error}</span>
      </div>
    )
  }

  // Onboarding callout + dim overlay have no dependency on user data —
  // they're driven entirely by the main-process orchestrator over IPC.
  // Skip the hydration gate so they can render before the store loads.
  if (route.route === 'onboarding') {
    return (
      <GlowSurface surface="welcome-callout-window" style={{ height: '100%', width: '100%' }}>
        <CalloutWindow />
      </GlowSurface>
    )
  }
  if (route.route === 'onboarding-dim') {
    return <DimOverlay />
  }
  // Theme dev panel needs no data hydration — it reads from the themes
  // store only (which hydrates from main on its own).
  if (route.route === 'themedev') {
    return <ThemeDevPanel />
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  switch (route.route) {
    case 'list':
      return (
        <GlowSurface surface="list-window" style={{ height: '100%', width: '100%' }}>
          <ListWindow listId={route.params.listId} />
        </GlowSurface>
      )
    case 'quickadd-fixed': {
      // Fallback target is the user's first REGULAR list — quick-add
      // never targets the hot list as a default. Hot list stays
      // dedicated to its own number-0 / Cmd+Shift+H summon.
      const firstRegular = lists.find((l) => l.kind === 'regular')
      const listId = route.params.listId || firstRegular?.id || ''
      return (
        <GlowSurface surface="quickadd-window" style={{ height: '100%', width: '100%' }}>
          <QuickAddFixed listId={listId} />
        </GlowSurface>
      )
    }
    case 'feedback':
      return <FeedbackWindow />
    case 'update':
      return <UpdatePromptWindow />
    case 'comments':
      return <CommentsWindow itemId={route.params.itemId} />
    case 'settings': {
      const tab = route.params.tab as SettingsTab
      const initialTab: SettingsTab | undefined =
        tab === 'general' ||
        tab === 'lists' ||
        tab === 'shortcuts' ||
        tab === 'themes' ||
        tab === 'appearance' ||
        tab === 'feedback' ||
        tab === 'advanced' ||
        tab === 'data'
          ? tab
          : undefined
      return <SettingsWindow initialTab={initialTab} />
    }
    case 'archive':
      return <ArchiveWindow listId={route.params.listId || undefined} />
    case 'shortcuts-overview':
      return <ShortcutsOverview />
    default:
      return (
        <div className="flex items-center justify-center h-full text-[color:var(--color-text-muted)] text-[length:var(--font-size-md)]">
          Unknown route
        </div>
      )
  }
}
