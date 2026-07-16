import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { GeneralTab } from './GeneralTab'
import { ListsTab } from './ListsTab'
import { ShortcutsTab } from './ShortcutsTab'
import { DataTab } from './DataTab'
import { ThemesTab } from './ThemesTab'
import { FeedbackTab } from './FeedbackTab'
import { AdvancedTab } from './AdvancedTab'
import { AppearanceTab } from './AppearanceTab'

export type SettingsTab =
  | 'general'
  | 'lists'
  | 'shortcuts'
  | 'themes'
  | 'appearance'
  | 'feedback'
  | 'advanced'
  | 'data'

const tabs: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'lists', label: 'Lists' },
  { key: 'shortcuts', label: 'Shortcuts' },
  { key: 'themes', label: 'Themes' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'data', label: 'Data' }
]

export function SettingsWindow({ initialTab }: { initialTab?: SettingsTab }) {
  // App routes #/settings/<tab> → initialTab. Tray's "Reorder Lists" entry
  // can deep-link here. Prop changes propagate when the same window is
  // already open and the user re-clicks the entry.
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'general')
  const tabBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab)
    }
    // intentional: only react to incoming prop changes; user clicks on the
    // tab strip update activeTab directly without going through the prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  // Auto-fit the window width to the tab strip so no tab is ever clipped,
  // regardless of how many tabs exist. Measured once on mount (deferred
  // a frame so fonts/layout settle); main grows + re-centers the window
  // by the overflow amount. One-shot on purpose — running continuously
  // would fight the user if they dragged the window narrower.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      const bar = tabBarRef.current
      if (!bar) return
      const overflow = bar.scrollWidth - bar.clientWidth
      if (overflow > 0) void window.api.fitSettingsWidth?.(overflow)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex flex-col h-full glass-surface" style={{ padding: `var(--space-component-padding) var(--space-container-padding)` }}>
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-1 py-2 border-b border-[var(--color-border)]">
        <span className="text-[length:var(--font-size-base)] font-tight heading-tracking font-semibold">Settings</span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tab bar — width auto-fit on mount (see useLayoutEffect above).
          shrink-0 keeps buttons at content width so the strip's
          scrollWidth reflects the true space the tabs need. */}
      <div ref={tabBarRef} className="flex items-center gap-1 px-1 py-1.5 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`no-drag shrink-0 px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium transition-default ${
              activeTab === tab.key
                ? 'bg-[var(--active-bg)] text-[color:var(--color-text-primary)]'
                : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'lists' && <ListsTab />}
        {activeTab === 'shortcuts' && <ShortcutsTab />}
        {activeTab === 'themes' && <ThemesTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'advanced' && <AdvancedTab />}
        {activeTab === 'data' && <DataTab />}
      </div>
    </div>
  )
}
