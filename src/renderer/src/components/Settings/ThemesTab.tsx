import { useThemesStore } from '../../store/themesStore'
import {
  SURFACE_IDS,
  SURFACE_LABELS,
  THEME_ATTRIBUTIONS,
  type SurfaceId
} from '@shared/themes'

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <button
      className="underline text-[color:var(--color-accent)] hover:text-[color:var(--color-text)] transition-default"
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

export function ThemesTab() {
  const masterEnabled = useThemesStore((s) => s.masterEnabled)
  const surfaces = useThemesStore((s) => s.surfaces)
  const activeTheme = useThemesStore((s) => s.activeTheme)
  const setMasterEnabled = useThemesStore((s) => s.setMasterEnabled)
  const setSurfaceEnabled = useThemesStore((s) => s.setSurfaceEnabled)
  const reset = useThemesStore((s) => s.reset)

  const attribution = THEME_ATTRIBUTIONS[activeTheme]

  return (
    <div className="flex flex-col gap-4 px-1 py-3">
      {/* Master toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[length:var(--font-size-base)] font-medium">Visual effects</div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Master switch — turns all theme effects on or off.
          </div>
        </div>
        <ToggleSwitch on={masterEnabled} onToggle={() => setMasterEnabled(!masterEnabled)} />
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Active theme + attribution */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[length:var(--font-size-base)] font-medium">Theme 1: Border Beam</div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          {attribution.description}
        </div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-ghost)] mt-1">
          By{' '}
          {attribution.authorUrl ? (
            <ExternalLink href={attribution.authorUrl}>{attribution.author}</ExternalLink>
          ) : (
            attribution.author
          )}
          {attribution.packageUrl && (
            <>
              {' · '}
              <ExternalLink href={attribution.packageUrl}>{attribution.packageName}</ExternalLink>
            </>
          )}
          {attribution.playgroundUrl && (
            <>
              {' · '}
              <ExternalLink href={attribution.playgroundUrl}>Playground</ExternalLink>
            </>
          )}
          {' · '}
          {attribution.license}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Per-surface toggles */}
      <div className="flex flex-col gap-2">
        <div className="text-[length:var(--font-size-base)] font-medium">Apply to surfaces</div>
        <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
          Enable the effect on each surface independently. The master switch above must also be on.
        </div>
        <div className="flex flex-col gap-1 mt-1">
          {SURFACE_IDS.map((id: SurfaceId) => (
            <div key={id} className="flex items-center justify-between py-1">
              <span className="text-[length:var(--font-size-sm)]">{SURFACE_LABELS[id]}</span>
              <ToggleSwitch
                on={surfaces[id]?.enabled ?? false}
                disabled={!masterEnabled}
                onToggle={() => setSurfaceEnabled(id, !(surfaces[id]?.enabled ?? false))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]" />

      {/* Reset */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[length:var(--font-size-sm)] font-medium">Reset themes</div>
          <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Restore default theme settings (does not affect dev panel presets).
          </div>
        </div>
        <button
          className="no-drag px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => reset()}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
