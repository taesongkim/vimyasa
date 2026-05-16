import { useState, useRef, useEffect } from 'react'
import type { ItemStatus } from '../../../../../shared/types'

export type FilterType = 'all' | ItemStatus

const filters: { key: FilterType; label: string; shortcut: string }[] = [
  { key: 'all', label: 'All', shortcut: '1' },
  { key: 'active', label: 'Active', shortcut: '2' },
  { key: 'done', label: 'Done', shortcut: '3' },
  { key: 'hold', label: 'Hold', shortcut: '4' }
]

export function FilterDropdown({
  active,
  onChange,
  counts
}: {
  active: FilterType
  onChange: (filter: FilterType) => void
  counts: Record<FilterType, number>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        className={`no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] transition-default ${
          active !== 'all'
            ? 'text-[color:var(--color-accent)]'
            : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)]'
        }`}
        onClick={() => setOpen(!open)}
        title="Filter"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 2h10M3 6h6M5 10h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-50 min-w-[120px] py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-menu)]"
          style={{ boxShadow: 'var(--shadow-tooltip)' }}
        >
          {filters.map((f) => (
            <button
              key={f.key}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-[length:var(--font-size-xs)] transition-default ${
                active === f.key
                  ? 'text-[color:var(--color-accent)]'
                  : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)]'
              }`}
              onClick={() => {
                onChange(f.key)
                setOpen(false)
              }}
            >
              <span>
                {f.label} <span className="opacity-60">{counts[f.key]}</span>
              </span>
              <span className="text-[length:var(--font-size-micro)] opacity-40">{f.shortcut}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
