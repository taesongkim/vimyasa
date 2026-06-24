import { useThemesStore } from '../../store/themesStore'
import type { Appearance } from '@shared/themes'

// Settings → Appearance. Phase 2 of the color-tokenization proposal.
// Themes lane shipped the foundation (Layer 2 mappings + the
// `appearance` store field + cross-window broadcast + the CSS rules
// that swap tokens based on `<html data-appearance="...">`). This
// component is the user-facing radio group on top of that field.
//
// Three options in Mac System Settings order (Light / Dark / Match
// system) with Dark as the default for existing testers (preserves
// v0.1.7 behavior, opt into light/auto here). Copy is locked from
// the proposal's "User-visible copy candidates" section (A1–A6) —
// don't restyle without coordinating with copy.

interface Option {
  value: Appearance
  label: string
  subtitle?: string
}

const OPTIONS: Option[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  {
    value: 'auto',
    label: 'Match system',
    subtitle: 'Light or dark, follows your macOS setting.'
  }
]

export function AppearanceTab() {
  const appearance = useThemesStore((s) => s.appearance)
  const setAppearance = useThemesStore((s) => s.setAppearance)

  const choose = (next: Appearance): void => {
    if (next === appearance) return
    void setAppearance(next)
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-3">
      <div className="flex flex-col gap-1">
        <div className="text-[length:var(--font-size-base)] font-medium">
          Theme
        </div>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="flex flex-col gap-1 mt-1"
        >
          {OPTIONS.map((option) => {
            const selected = appearance === option.value
            return (
              <button
                key={option.value}
                role="radio"
                aria-checked={selected}
                type="button"
                onClick={() => choose(option.value)}
                className={`no-drag flex items-start gap-3 px-2 py-2 rounded-[var(--radius-sm)] text-left transition-default ${
                  selected
                    ? 'bg-[var(--active-bg)]'
                    : 'hover:bg-[var(--hover-highlight)]'
                }`}
              >
                {/* Radio pip */}
                <div
                  className={`shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 transition-default ${
                    selected
                      ? 'border-[var(--color-accent)]'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {selected && (
                    <div className="w-2 h-2 m-0.5 rounded-full bg-[var(--color-accent)]" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[length:var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)]">
                    {option.label}
                  </span>
                  {option.subtitle && (
                    <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)]">
                      {option.subtitle}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
