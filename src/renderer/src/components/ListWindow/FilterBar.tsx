import type { ItemStatus } from '../../../../../shared/types'

export type FilterType = 'all' | ItemStatus

const filters: { key: FilterType; label: string; shortcut: string }[] = [
  { key: 'all', label: 'All', shortcut: '1' },
  { key: 'active', label: 'Active', shortcut: '2' },
  { key: 'done', label: 'Done', shortcut: '3' },
  { key: 'hold', label: 'Hold', shortcut: '4' }
]

export function FilterBar({
  active,
  onChange,
  counts
}: {
  active: FilterType
  onChange: (filter: FilterType) => void
  counts: Record<FilterType, number>
}) {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5 border-b border-[var(--color-border)]">
      {filters.map((f) => (
        <button
          key={f.key}
          className={`no-drag px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--font-size-xs)] font-medium transition-default ${
            active === f.key
              ? 'bg-[var(--active-bg)] text-[var(--color-text)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
          }`}
          onClick={() => onChange(f.key)}
          title={`${f.label} (${f.shortcut})`}
        >
          {f.label}
          <span className="ml-1 opacity-60">{counts[f.key]}</span>
        </button>
      ))}
    </div>
  )
}
