import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { JkModeToggle } from './JkModeToggle'

// Global shortcuts (configurable)
const globalShortcuts = [
  { key: '⌘⇧\'', label: 'Show Shortcuts', description: 'Display this shortcuts overview' },
]

// List navigation shortcuts (non-configurable). j/k is special-cased
// in the render: it has a toggle that flips the mapping and a dynamic
// description that reflects the current mode.
const listNavigationShortcuts = [
  { key: 'j/k', label: 'Navigate Items', description: '' },
  { key: 'Space', label: 'Cycle Status', description: 'active → done → hold → active' },
  { key: 'Enter or a', label: 'Archive Item', description: 'Archive selected item' },
  { key: 'c or ⌘C', label: 'Copy Text', description: 'Copy item text to clipboard' },
  { key: 'o or ⌘O', label: 'Open Comments', description: 'Open comments for selected item' },
  { key: 'Backspace', label: 'Delete Item', description: 'Delete selected item (with confirmation)' },
  { key: 'Escape', label: 'Deselect/Close', description: 'Deselect item or close window' },
  { key: 'n', label: 'New Item', description: 'Focus the add item input' }
]

// Entry form shortcuts
const entryFormShortcuts = [
  { key: 'ESC', label: 'Exit', description: 'Close entry form' },
  { key: 'TAB', label: 'Cycle Target', description: 'Switch between lists or focus areas' }
]

function formatAccelerator(accel: string): string {
  return accel
    .replace('CommandOrControl', '⌘')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replace(/\+/g, '')
}

export function ShortcutsOverview() {
  const { shortcuts, lists, builtinShortcuts, jkMode } = useStore()

  // Global Escape handler to close window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        window.api.closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-full glass-surface p-4">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-border)]">
          <h1 className="text-[length:var(--font-size-lg)] font-semibold text-[color:var(--color-text)]">
            Keyboard Shortcuts
          </h1>
          <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)]">
            Press ESC or ⌘⇧' to close
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ gap: `var(--space-section-margin)`, display: 'flex', flexDirection: 'column' }}>

          {/* Global shortcuts */}
          <div>
            <h2 className="section-header">
              Global
            </h2>
            <div className="flex flex-col" style={{ gap: `var(--space-item-gap)` }}>
              {/* Built-in shortcuts */}
              {Object.entries(builtinShortcuts)
                .filter(([key, accel]) => !['CommandOrControl+Shift+A', 'CommandOrControl+Shift+J'].includes(accel))
                .map(([key, accel]) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 rounded bg-[var(--color-surface)]">
                  <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text)]">
                    {key === 'openFirstList' ? 'Open First List' : 'Quick Add (First List)'}
                  </span>
                  <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)]">
                    {formatAccelerator(accel)}
                  </span>
                </div>
              ))}

              {/* Custom shortcuts */}
              {shortcuts
                .filter((s) => !(s.action === 'quickAddFixed' && ['a', 'j'].includes(s.accelerator)))
                .map((s) => {
                const targetList = s.targetId ? lists.find((l) => l.id === s.targetId) : null
                return (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded bg-[var(--color-surface)]">
                    <div>
                      <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text)]">
                        {s.action === 'openList' ? 'Open List' :
                         s.action === 'quickAddFixed' ? 'Quick Add' :
                         'Cycle All Lists'}
                      </span>
                      {targetList && (
                        <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] ml-2">
                          → {targetList.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)]">
                      {formatAccelerator(s.accelerator)}
                    </span>
                  </div>
                )
              })}

              {/* Static global shortcuts */}
              {globalShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between px-3 py-2 rounded bg-[var(--color-surface)]">
                  <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text)]">
                    {shortcut.label}
                  </span>
                  <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)]">
                    {shortcut.key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* List navigation */}
          <div>
            <h2 className="section-header">
              List Navigation
            </h2>
            <div className="flex flex-col" style={{ gap: `var(--space-item-gap)` }}>
              {listNavigationShortcuts.map((shortcut) => {
                const isJk = shortcut.key === 'j/k'
                const description = isJk
                  ? jkMode === 'inverse' ? 'j = ↑, k = ↓' : 'j = ↓, k = ↑'
                  : shortcut.description
                return (
                  <div key={shortcut.key} className="flex items-center justify-between px-3 py-2 rounded bg-[var(--color-surface)] opacity-90">
                    <div className="min-w-0">
                      <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text)]">
                        {shortcut.label}
                      </span>
                      {(description || isJk) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {description && (
                            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)]">
                              {description}
                            </span>
                          )}
                          {isJk && <JkModeToggle />}
                        </div>
                      )}
                    </div>
                    <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)] shrink-0">
                      {shortcut.key}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Entry form */}
          <div>
            <h2 className="section-header">
              Entry Form
            </h2>
            <div className="flex flex-col" style={{ gap: `var(--space-item-gap)` }}>
              {entryFormShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between px-3 py-2 rounded bg-[var(--color-surface)] opacity-90">
                  <div>
                    <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text)]">
                      {shortcut.label}
                    </span>
                    <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)]">
                      {shortcut.description}
                    </div>
                  </div>
                  <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)] shrink-0">
                    {shortcut.key}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}