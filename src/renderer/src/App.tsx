import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { useThemesStore } from './store/themesStore'
import { ListWindow } from './components/ListWindow/ListWindow'
import { QuickAddFixed } from './components/QuickAdd/QuickAddFixed'
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
  const lists = useStore((s) => s.lists)
  const [route, setRoute] = useState<RouteInfo>(parseHash)
  const [error, setError] = useState<string | null>(null)

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
      const listId = route.params.listId || lists[0]?.id || ''
      return (
        <GlowSurface surface="quickadd-window" style={{ height: '100%', width: '100%' }}>
          <QuickAddFixed listId={listId} />
        </GlowSurface>
      )
    }
    case 'comments':
      return <CommentsWindow itemId={route.params.itemId} />
    case 'settings': {
      const tab = route.params.tab as SettingsTab
      const initialTab: SettingsTab | undefined =
        tab === 'general' ||
        tab === 'lists' ||
        tab === 'shortcuts' ||
        tab === 'themes' ||
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
