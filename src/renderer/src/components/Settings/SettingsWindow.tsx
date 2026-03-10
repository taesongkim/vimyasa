import { useState } from 'react'
import { GeneralTab } from './GeneralTab'
import { ShortcutsTab } from './ShortcutsTab'
import { DataTab } from './DataTab'

type Tab = 'general' | 'shortcuts' | 'data'

const tabs: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'shortcuts', label: 'Shortcuts' },
  { key: 'data', label: 'Data' }
]

export function SettingsWindow() {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  return (
    <div className="flex flex-col h-full glass-surface p-2">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-1 py-2 border-b border-[var(--color-border)]">
        <span className="text-[var(--font-size-base)] font-tight heading-tracking font-semibold">Settings</span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-1 py-1.5 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`no-drag px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--font-size-xs)] font-medium transition-default ${
              activeTab === tab.key
                ? 'bg-[var(--active-bg)] text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
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
        {activeTab === 'shortcuts' && <ShortcutsTab />}
        {activeTab === 'data' && <DataTab />}
      </div>
    </div>
  )
}
