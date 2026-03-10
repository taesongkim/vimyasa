import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { ListWindow } from './components/ListWindow/ListWindow'
import { QuickAddFixed } from './components/QuickAdd/QuickAddFixed'
import { QuickAddWithSelect } from './components/QuickAdd/QuickAddWithSelect'
import { CommentsWindow } from './components/Comments/CommentsWindow'
import { SettingsWindow } from './components/Settings/SettingsWindow'
import { ArchiveWindow } from './components/Archive/ArchiveWindow'

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
    return { route: 'quickadd-select', params: {} }
  }
  if (parts[1] === 'comments' && parts[2]) {
    return { route: 'comments', params: { itemId: parts[2] } }
  }
  if (parts[1] === 'settings') {
    return { route: 'settings', params: {} }
  }
  if (parts[1] === 'archive') {
    return { route: 'archive', params: { listId: parts[2] || '' } }
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
        <span className="text-[var(--color-red)] text-sm font-medium">Failed to load data</span>
        <span className="text-[var(--color-text-ghost)] text-xs font-mono">{error}</span>
      </div>
    )
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
      return <ListWindow listId={route.params.listId} />
    case 'quickadd-fixed': {
      const listId = route.params.listId || lists[0]?.id || ''
      return <QuickAddFixed listId={listId} />
    }
    case 'quickadd-select':
      return <QuickAddWithSelect />
    case 'comments':
      return <CommentsWindow itemId={route.params.itemId} />
    case 'settings':
      return <SettingsWindow />
    case 'archive':
      return <ArchiveWindow listId={route.params.listId || undefined} />
    default:
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
          Unknown route
        </div>
      )
  }
}
