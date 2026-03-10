import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { KeyCapture } from './KeyCapture'
import type { ShortcutAction } from '../../../../../shared/types'

const actionLabels: Record<ShortcutAction, string> = {
  openList: 'Open List',
  quickAddFixed: 'Quick Add (Fixed)',
  quickAddSelect: 'Quick Add (Select)',
  cycleAllLists: 'Cycle All Lists'
}

const actionOptions: ShortcutAction[] = ['openList', 'quickAddFixed', 'quickAddSelect', 'cycleAllLists']

export function ShortcutsTab() {
  const { shortcuts, lists } = useStore()
  const [newAction, setNewAction] = useState<ShortcutAction>('openList')
  const [newTarget, setNewTarget] = useState<string>(lists[0]?.id || '')

  // Keep target in sync when lists change (e.g. new list created)
  useEffect(() => {
    if (lists.length > 0 && !lists.find((l) => l.id === newTarget)) {
      setNewTarget(lists[0].id)
    }
  }, [lists, newTarget])
  const [newAccel, setNewAccel] = useState('')

  // We need shortcuts CRUD in zustand — using window.api directly for now
  const handleAddShortcut = async () => {
    if (!newAccel) return
    const targetId = ['openList', 'quickAddFixed'].includes(newAction) ? newTarget : null
    await window.api.createShortcut(newAction, newAccel, targetId)
    // Refresh store
    const store = useStore.getState()
    await store.refresh()
    setNewAccel('')
  }

  const handleDeleteShortcut = async (id: string) => {
    await window.api.deleteShortcut(id)
    const store = useStore.getState()
    await store.refresh()
  }

  const needsTarget = (action: ShortcutAction) =>
    action === 'openList' || action === 'quickAddFixed'

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Existing shortcuts */}
      <div className="flex flex-col gap-1">
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
          Active Shortcuts
        </div>
        {shortcuts.length === 0 && (
          <div className="text-xs text-[var(--color-text-dim)] py-2">No shortcuts configured</div>
        )}
        {shortcuts.map((s) => {
          const targetList = s.targetId ? lists.find((l) => l.id === s.targetId) : null
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-medium text-[var(--color-text)]">
                  {actionLabels[s.action]}
                </span>
                {targetList && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    → {targetList.icon} {targetList.name}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-[var(--color-accent)] shrink-0">
                {s.accelerator
                  .replace('CommandOrControl', '⌘')
                  .replace('Alt', '⌥')
                  .replace('Shift', '⇧')
                  .replace(/\+/g, '')}
              </span>
              <button
                className="text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-colors"
                onClick={() => handleDeleteShortcut(s.id)}
              >
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Add new shortcut */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          Add Shortcut
        </div>
        <div className="flex flex-col gap-2">
          {/* Action type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">Action</span>
            <select
              className="flex-1 bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-2 py-1.5 outline-none"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as ShortcutAction)}
            >
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {actionLabels[a]}
                </option>
              ))}
            </select>
          </div>

          {/* Target (if needed) */}
          {needsTarget(newAction) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">Target</span>
              <select
                className="flex-1 bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-2 py-1.5 outline-none"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.icon} {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Key capture */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">Key</span>
            <KeyCapture value={newAccel} onChange={setNewAccel} />
          </div>

          <button
            className="mt-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleAddShortcut}
            disabled={!newAccel}
          >
            + Add Shortcut
          </button>
        </div>
      </div>
    </div>
  )
}
