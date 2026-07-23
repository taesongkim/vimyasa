import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { KeyCapture } from './KeyCapture'
import { JkModeToggle } from '../JkModeToggle'
import { getRegularLists, type ShortcutAction, type BuiltinShortcuts } from '@shared/types'

const actionLabels: Record<ShortcutAction, string> = {
  openList: 'Open List',
  quickAddFixed: 'Quick Add',
  cycleAllLists: 'Cycle All Lists'
}

const actionOptions: ShortcutAction[] = ['openList', 'quickAddFixed', 'cycleAllLists']

// Built-in shortcut definitions for display
const builtinShortcutDefs: { key: keyof BuiltinShortcuts; label: string }[] = [
  { key: 'openFirstList', label: 'Open First List' },
  { key: 'quickAddFirst', label: 'Quick Add (First List)' }
]

// List navigation shortcuts (non-configurable). j/k is special-cased
// in the render: it has a toggle that flips the mapping and a dynamic
// description that reflects the current mode.
const listNavigationShortcuts: { key: string; label: string; description?: string }[] = [
  { key: 'j/k', label: 'Navigate Items' },
  { key: 'Space', label: 'Cycle Status', description: 'default → active → pending → complete → hidden' },
  { key: 'a', label: 'Archive Item', description: 'Archive selected item' },
  { key: 'r', label: 'Rename', description: 'Edit selected item text (caret lands at end)' },
  { key: 'c or ⌘C', label: 'Copy Text', description: 'Copy item text to clipboard' },
  { key: 'o or ⌘O', label: 'Open Comments', description: 'Open comments for selected item' },
  { key: 'Backspace', label: 'Delete Item', description: 'Delete selected item (with confirmation)' },
  { key: 'Escape', label: 'Deselect/Close', description: 'Deselect item or close window' },
  { key: 'n', label: 'New Item', description: 'Focus the add item input' },
  { key: '1-9', label: 'Switch List', description: 'Jump to that list (regular lists by sortOrder)' },
  { key: '0', label: 'Hot List', description: 'Open / focus the hot list (in carry mode: send item to hot list)' }
]

// Carry mode (m) sub-shortcuts. Rendered as its own block so the user
// reads them as a temporary mode rather than always-on shortcuts.
const carryModeShortcuts: { key: string; label: string; description?: string }[] = [
  { key: 'm', label: 'Enter Carry Mode', description: 'Pick up the focused item' },
  { key: '0', label: 'Send to Hot List', description: 'Sends the carry item to the hot list, exits carry' },
  { key: '1-9', label: 'Send to List N', description: 'Sends to regular list N (by sortOrder), exits carry' },
  { key: 'j/k', label: 'Reorder', description: 'Move carry item up/down by one position; carry persists' },
  { key: 'Enter', label: 'Land + Exit', description: 'Commit at current position' },
  { key: 'Esc', label: 'Cancel + Exit', description: 'Functionally identical to Enter; semantic-only distinction' }
]

function formatAccelerator(accel: string): string {
  return accel
    .replace(/CommandOrControl/g, '⌘')
    .replace(/Command/g, '⌘')
    .replace(/Shift/g, 'SHIFT')
    .replace(/Alt|Option/g, 'OPTION')
    .replace(/\+/g, ' ')
}

export function ShortcutsTab() {
  const { shortcuts, lists, builtinShortcuts, jkMode } = useStore()
  // Custom shortcuts can only target user lists. The hot list has its
  // own dedicated builtin (Cmd+Shift+H, ships in PR 2) and isn't a
  // valid target for openList / quickAddFixed shortcuts.
  const targetableLists = getRegularLists(lists)
  const [newAction, setNewAction] = useState<ShortcutAction>('openList')
  const [newTarget, setNewTarget] = useState<string>(targetableLists[0]?.id || '')
  const [editingBuiltin, setEditingBuiltin] = useState<keyof BuiltinShortcuts | null>(null)
  const [editingBuiltinAccel, setEditingBuiltinAccel] = useState('')

  // Keep target in sync when lists change (e.g. new list created)
  useEffect(() => {
    if (targetableLists.length > 0 && !targetableLists.find((l) => l.id === newTarget)) {
      setNewTarget(targetableLists[0].id)
    }
  }, [targetableLists, newTarget])
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
        <div className="section-header">
          Default Shortcuts
        </div>
        {builtinShortcutDefs.map((def) => (
          <div
            key={def.key}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
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
                    className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] hover:text-[color:var(--color-text-primary)] transition-default px-1"
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

      {/* List navigation shortcuts */}
      <div className="flex flex-col gap-1">
        <div className="section-header">
          List Navigation
        </div>
        <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] mb-2">
          Available when viewing a list (non-configurable)
        </div>
        {listNavigationShortcuts.map((shortcut) => {
          const isJk = shortcut.key === 'j/k'
          const jkDescription =
            jkMode === 'inverse' ? 'j = ↑, k = ↓' : 'j = ↓, k = ↑'
          return (
            <div
              key={shortcut.key}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] opacity-80"
            >
              <div className="flex-1 min-w-0">
                <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
                  {shortcut.label}
                </span>
                {(isJk || shortcut.description) && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)]">
                      {isJk ? jkDescription : shortcut.description}
                    </span>
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

      {/* Carry mode (m) — sub-shortcuts active only while carrying. */}
      <div className="flex flex-col gap-1">
        <div className="section-header">Carry Mode</div>
        <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] mb-2">
          Press <span className="font-mono text-[color:var(--color-accent)]">m</span> on a focused item to enter. The item is "picked up" and these keys take over until you commit / cancel.
        </div>
        {carryModeShortcuts.map((shortcut) => (
          <div
            key={shortcut.key + shortcut.label}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] opacity-80"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
                {shortcut.label}
              </span>
              {shortcut.description && (
                <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] mt-0.5">
                  {shortcut.description}
                </div>
              )}
            </div>
            <span className="text-[length:var(--font-size-sm)] font-mono text-[color:var(--color-accent)] shrink-0">
              {shortcut.key}
            </span>
          </div>
        ))}
      </div>

      {/* Custom shortcuts */}
      <div className="flex flex-col gap-1">
        <div className="section-header">
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
                <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
                  {actionLabels[s.action]}
                </span>
                {targetList && (
                  <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
                    → {targetList.name}
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
        <div className="section-header">
          Add Custom Shortcut
        </div>
        <div className="flex flex-col gap-2">
          {/* Action type */}
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)] w-16 shrink-0">Action</span>
            <select
              className="flex-1 bg-[var(--color-surface)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-default"
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
                className="flex-1 bg-[var(--color-surface)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-default"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              >
                {targetableLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
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
