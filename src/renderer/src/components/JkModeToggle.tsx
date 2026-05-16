import { useStore } from '../store/useStore'
import type { JkMode } from '@shared/types'

const OPTIONS: { value: JkMode; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'inverse', label: 'Inverse' }
]

// Two-position pill that flips j/k navigation between vim-standard
// (j down, k up) and inverse. Used in Settings → Shortcuts, the
// shortcuts overview, and the onboarding callout — flipping in any
// one place propagates everywhere via the data-changed broadcast.
export function JkModeToggle({ size = 'sm' }: { size?: 'sm' | 'xs' }) {
  const mode = useStore((s) => s.jkMode)
  const setJkMode = useStore((s) => s.setJkMode)

  const padX = size === 'xs' ? 'px-1.5' : 'px-2'
  const padY = size === 'xs' ? 'py-0' : 'py-0.5'
  const fontSize = size === 'xs' ? 'text-[length:var(--font-size-micro)]' : 'text-[length:var(--font-size-xs)]'

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5 shrink-0"
      role="group"
      aria-label="j/k mapping"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === mode
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (opt.value !== mode) setJkMode(opt.value)
            }}
            aria-pressed={active}
            className={`no-drag ${padX} ${padY} ${fontSize} rounded-[var(--radius-xs)] transition-default ${
              active
                ? 'bg-[var(--active-bg)] text-[color:var(--color-text-primary)]'
                : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
