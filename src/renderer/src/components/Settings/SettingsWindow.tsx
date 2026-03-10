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
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-sm font-semibold">Settings</span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`no-drag px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
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
