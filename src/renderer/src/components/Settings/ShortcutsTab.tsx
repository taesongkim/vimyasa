import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { KeyCapture } from './KeyCapture'
import type { ShortcutAction, BuiltinShortcuts } from '../../../../../shared/types'

const actionLabels: Record<ShortcutAction, string> = {
  openList: 'Open List',
  quickAddFixed: 'Quick Add (Fixed)',
  quickAddSelect: 'Quick Add (Select)',
  cycleAllLists: 'Cycle All Lists'
}

const actionOptions: ShortcutAction[] = ['openList', 'quickAddFixed', 'quickAddSelect', 'cycleAllLists']

// Built-in shortcut definitions for display
const builtinShortcutDefs: { key: keyof BuiltinShortcuts; label: string }[] = [
  { key: 'openFirstList', label: 'Open First List' },
  { key: 'quickAddFirst', label: 'Quick Add (First List)' }
]

function formatAccelerator(accel: string): string {
  return accel
    .replace('CommandOrControl', '⌘')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replace(/\+/g, '')
}

export function ShortcutsTab() {
  const { shortcuts, lists, builtinShortcuts } = useStore()
  const [newAction, setNewAction] = useState<ShortcutAction>('openList')
  const [newTarget, setNewTarget] = useState<string>(lists[0]?.id || '')
  const [editingBuiltin, setEditingBuiltin] = useState<keyof BuiltinShortcuts | null>(null)
  const [editingBuiltinAccel, setEditingBuiltinAccel] = useState('')

  // Keep target in sync when lists change (e.g. new list created)
  useEffect(() => {
    if (lists.length > 0 && !lists.find((l) => l.id === newTarget)) {
      setNewTarget(lists[0].id)
    }
  }, [lists, newTarget])
  const [newAccel, setNewAccel] = useState('')

  const handleAddShortcut = async () => {
    if (!newAccel) return
    const targetId = ['openList', 'quickAddFixed'].includes(newAction) ? newTarget : null
    await window.api.createShortcut(newAction, newAccel, targetId)
    const store = useStore.getState()
    await store.refresh()
    setNewAccel('')
  }

  const handleDeleteShortcut = async (id: string) => {
    await window.api.deleteShortcut(id)
    const store = useStore.getState()
    await store.refresh()
  }

  const startEditingBuiltin = (key: keyof BuiltinShortcuts) => {
    setEditingBuiltin(key)
    setEditingBuiltinAccel(builtinShortcuts[key])
  }

  const saveBuiltinShortcut = async () => {
    if (!editingBuiltin || !editingBuiltinAccel) return
    await window.api.updateBuiltinShortcuts({ [editingBuiltin]: editingBuiltinAccel })
    const store = useStore.getState()
    await store.refresh()
    setEditingBuiltin(null)
    setEditingBuiltinAccel('')
  }

  const cancelEditingBuiltin = () => {
    setEditingBuiltin(null)
    setEditingBuiltinAccel('')
  }

  const needsTarget = (action: ShortcutAction) =>
    action === 'openList' || action === 'quickAddFixed'

  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      {/* Built-in shortcuts */}
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] uppercase tracking-wider mb-1">
          Default Shortcuts
        </div>
        {builtinShortcutDefs.map((def) => (
          <div
            key={def.key}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text)]">
              {def.label}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {editingBuiltin === def.key ? (
                <>
                  <KeyCapture value={editingBuiltinAccel} onChange={setEditingBuiltinAccel} />
                  <button
                    className="text-[length:var(--font-size-sm)] text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-hover)] transition-default px-1"
                    onClick={saveBuiltinShortcut}
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] hover:text-[color:var(--color-text)] transition-default px-1"
                    onClick={cancelEditingBuiltin}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <button
                  className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)] hover:bg-[var(--hover-highlight)] rounded-[var(--radius-sm)] px-2 py-0.5 transition-default cursor-pointer"
                  onClick={() => startEditingBuiltin(def.key)}
                  title="Click to change"
                >
                  {formatAccelerator(builtinShortcuts[def.key])}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom shortcuts */}
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] uppercase tracking-wider mb-1">
          Custom Shortcuts
        </div>
        {shortcuts.length === 0 && (
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] py-2">No custom shortcuts configured</div>
        )}
        {shortcuts.map((s) => {
          const targetList = s.targetId ? lists.find((l) => l.id === s.targetId) : null
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text)]">
                  {actionLabels[s.action]}
                </span>
                {targetList && (
                  <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
                    → {targetList.icon} {targetList.name}
                  </span>
                )}
              </div>
              <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)] shrink-0">
                {formatAccelerator(s.accelerator)}
              </span>
              <button
                className="text-[color:var(--color-text-ghost)] hover:text-[color:var(--color-red)] transition-default"
                onClick={() => handleDeleteShortcut(s.id)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Add new shortcut */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] uppercase tracking-wider mb-2">
          Add Custom Shortcut
        </div>
        <div className="flex flex-col gap-2">
          {/* Action type */}
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] w-16 shrink-0">Action</span>
            <select
              className="flex-1 bg-[var(--color-surface)] text-[length:var(--font-size-sm)] text-[color:var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-default"
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
              <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] w-16 shrink-0">Target</span>
              <select
                className="flex-1 bg-[var(--color-surface)] text-[length:var(--font-size-sm)] text-[color:var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-default"
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
            <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] w-16 shrink-0">Key</span>
            <KeyCapture value={newAccel} onChange={setNewAccel} />
          </div>

          <button
            className="mt-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-sm)] font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-default disabled:opacity-40 disabled:cursor-not-allowed"
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
