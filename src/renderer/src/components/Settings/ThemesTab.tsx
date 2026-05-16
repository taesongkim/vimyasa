import { useThemesStore } from '../../store/themesStore'
import { THEME_ATTRIBUTIONS } from '@shared/themes'

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <button
      className="underline text-[color:var(--color-accent)] hover:text-[color:var(--color-text-primary)] transition-default"
      onClick={() => window.api.openExternal(href)}
    >
      {children}
    </button>
  )
}

function ToggleSwitch({
  on,
  onToggle,
  disabled
}: {
  on: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      className={`w-9 h-5 rounded-full transition-default relative shrink-0 ${
        on ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      onClick={onToggle}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          on ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// Single theme on/off. Per-surface fidelity is intentionally hidden — each
// theme defines its own surface coverage in code (THEME_1_SURFACE_OVERRIDES
// in shared/themes.ts). The user's only knob is "is this theme on or off."
export function ThemesTab() {
  const masterEnabled = useThemesStore((s) => s.masterEnabled)
  const activeTheme = useThemesStore((s) => s.activeTheme)
  const setMasterEnabled = useThemesStore((s) => s.setMasterEnabled)

  const attribution = THEME_ATTRIBUTIONS[activeTheme]

  return (
    <div className="flex flex-col gap-4 px-1 py-3">
      {/* Single theme toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="text-[length:var(--font-size-base)] font-medium">
            Theme 1: {attribution.displayName}
          </div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            {attribution.description}
          </div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] mt-1">
            Based off the work of{' '}
            {attribution.authorUrl ? (
              <ExternalLink href={attribution.authorUrl}>{attribution.author}</ExternalLink>
            ) : (
              attribution.author
            )}
            {attribution.packageName ? `'s ${attribution.packageName}.` : '.'}
          </div>
        </div>
        <ToggleSwitch on={masterEnabled} onToggle={() => setMasterEnabled(!masterEnabled)} />
      </div>
    </div>
  )
}
