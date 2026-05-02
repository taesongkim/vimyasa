// Dev-only controls panel for the theme system. Lives in its own frameless
// BrowserWindow (created by main/theme-dev-panel.ts) at route #/themedev.
// Tuning a slider mutates the themes store, which broadcasts the new config
// to every renderer so the surface being tuned updates live.

import { useEffect, useMemo, useState } from 'react'
import { useThemesStore } from '../../store/themesStore'
import {
  SURFACE_IDS,
  SURFACE_LABELS,
  defaultSurfaceConfig,
  type SurfaceId,
  type SurfaceConfig,
  type ThemeDevPreset
} from '@shared/themes'

const COLOR_OPTIONS: SurfaceConfig['borderBeam']['colorVariant'][] = [
  'colorful',
  'mono',
  'ocean',
  'sunset'
]

// `size` selects the *geometry* (full-perimeter rotating beam vs bottom-
// only travelling beam). Continuous size now comes from `borderWidth` —
// both knobs are exposed.
const SIZE_STOPS: SurfaceConfig['borderBeam']['size'][] = ['sm', 'md', 'line']
const SIZE_LABELS: Record<SurfaceConfig['borderBeam']['size'], string> = {
  sm: 'sm · small full perimeter',
  md: 'md · large full perimeter',
  line: 'line · bottom only'
}
function sizeToIndex(size: SurfaceConfig['borderBeam']['size']): number {
  return Math.max(0, SIZE_STOPS.indexOf(size))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-[var(--color-border)]">
      <div className="text-[length:var(--font-size-xs)] uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {title}
      </div>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          className={`flex-1 px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium transition-default ${
            value === opt
              ? 'bg-[var(--active-bg)] text-[color:var(--color-text)]'
              : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-secondary)] hover:bg-[var(--hover-highlight)]'
          }`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
          {label}
        </span>
        <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] font-mono tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  )
}

function ToggleRow({
  label,
  on,
  onToggle
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
        {label}
      </span>
      <button
        className={`w-7 h-4 rounded-full transition-default relative shrink-0 ${
          on ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
        }`}
        onClick={onToggle}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            on ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export function ThemeDevPanel() {
  const hydrated = useThemesStore((s) => s.hydrated)
  const hydrate = useThemesStore((s) => s.hydrate)
  const masterEnabled = useThemesStore((s) => s.masterEnabled)
  const surfaces = useThemesStore((s) => s.surfaces)
  const setMasterEnabled = useThemesStore((s) => s.setMasterEnabled)
  const setSurfaceEnabled = useThemesStore((s) => s.setSurfaceEnabled)
  const setSurfaceConfig = useThemesStore((s) => s.setSurfaceConfig)

  const [selectedSurface, setSelectedSurface] = useState<SurfaceId>('quickadd-window')
  const [presets, setPresets] = useState<ThemeDevPreset[]>([])
  const [newPresetLabel, setNewPresetLabel] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) hydrate().catch(() => {})
  }, [hydrated, hydrate])

  useEffect(() => {
    void window.api.themeDev.listPresets().then(setPresets)
  }, [])

  const config = surfaces[selectedSurface] ?? defaultSurfaceConfig()
  const c = config.borderBeam

  const update = (patch: Partial<SurfaceConfig['borderBeam']>) => {
    void setSurfaceConfig(selectedSurface, {
      ...config,
      borderBeam: { ...c, ...patch }
    })
  }

  const visiblePresets = useMemo(
    () => presets.filter((p) => p.surfaceId === selectedSurface),
    [presets, selectedSurface]
  )

  const refreshPresets = async () => {
    const next = await window.api.themeDev.listPresets()
    setPresets(next)
  }

  const handleSavePreset = async () => {
    const label = newPresetLabel.trim()
    if (!label) return
    await window.api.themeDev.savePreset(selectedSurface, label, config)
    setNewPresetLabel('')
    await refreshPresets()
  }

  const handleApplyPreset = async (preset: ThemeDevPreset) => {
    await setSurfaceConfig(selectedSurface, preset.config)
  }

  const handleDeletePreset = async (id: string) => {
    await window.api.themeDev.deletePreset(id)
    await refreshPresets()
  }

  const handleCopyConfig = async () => {
    const payload = {
      surface: selectedSurface,
      config
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopyFeedback('copied')
    setTimeout(() => setCopyFeedback(null), 1200)
  }

  return (
    <div
      className="flex flex-col h-full glass-surface"
      style={{ padding: `var(--space-component-padding) var(--space-container-padding)` }}
    >
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-1 py-2 border-b border-[var(--color-border)]">
        <span className="text-[length:var(--font-size-base)] font-tight heading-tracking font-semibold">
          Theme Dev · Border Beam
        </span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 2L10 10M10 2L2 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="no-drag flex-1 overflow-y-auto px-1">
        {/* Master + surface picker */}
        <Section title="Scope">
          <ToggleRow
            label="Master switch (all surfaces)"
            on={masterEnabled}
            onToggle={() => setMasterEnabled(!masterEnabled)}
          />
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
              Surface
            </span>
            <select
              className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text)] border border-[var(--color-border)] outline-none"
              value={selectedSurface}
              onChange={(e) => setSelectedSurface(e.target.value as SurfaceId)}
            >
              {SURFACE_IDS.map((id) => (
                <option key={id} value={id}>
                  {SURFACE_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-1">
            <ToggleRow
              label="Enable on this surface"
              on={config.enabled}
              onToggle={() => setSurfaceEnabled(selectedSurface, !config.enabled)}
            />
          </div>
        </Section>

        {/* Knobs */}
        <Section title="Border beam">
          <div className="flex flex-col gap-1.5">
            {/* Size — discrete slider over border-beam's 3 enum values. */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
                  Size
                </span>
                <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] font-mono tabular-nums">
                  {SIZE_LABELS[c.size]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={SIZE_STOPS.length - 1}
                step={1}
                value={sizeToIndex(c.size)}
                onChange={(e) => update({ size: SIZE_STOPS[Number(e.target.value)] })}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
                Color variant
              </span>
              <Segmented
                value={c.colorVariant}
                options={COLOR_OPTIONS}
                onChange={(v) => update({ colorVariant: v })}
              />
            </div>
            <Slider
              label="Border width (px) — main size knob"
              value={c.borderWidth}
              min={0.5}
              max={40}
              step={0.5}
              onChange={(v) => update({ borderWidth: v })}
            />
            <Slider
              label="Strength (opacity multiplier)"
              value={c.strength}
              min={0}
              max={5}
              step={0.05}
              onChange={(v) => update({ strength: v })}
            />
            <Slider
              label="Duration (s)"
              value={c.duration}
              min={0.5}
              max={8}
              step={0.1}
              onChange={(v) => update({ duration: v })}
            />
            <Slider
              label="Brightness"
              value={c.brightness}
              min={0.3}
              max={5}
              step={0.05}
              onChange={(v) => update({ brightness: v })}
            />
            <Slider
              label="Saturation"
              value={c.saturation}
              min={0}
              max={5}
              step={0.05}
              onChange={(v) => update({ saturation: v })}
            />
            <Slider
              label="Hue range (deg)"
              value={c.hueRange}
              min={0}
              max={360}
              step={1}
              onChange={(v) => update({ hueRange: v })}
            />
            <ToggleRow
              label="Static colors (disable hue cycle)"
              on={c.staticColors}
              onToggle={() => update({ staticColors: !c.staticColors })}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
                Border radius (px, blank = auto-detect)
              </span>
              <input
                type="number"
                min={0}
                max={200}
                step={1}
                value={c.borderRadius ?? ''}
                placeholder="auto"
                onChange={(e) => {
                  const raw = e.target.value
                  update({ borderRadius: raw === '' ? undefined : Number(raw) })
                }}
                className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text)] border border-[var(--color-border)] outline-none"
              />
            </div>
          </div>
        </Section>

        {/* Per-layer fine tuning. The package's three layers (beam stroke,
            inner glow, outer bloom) compose the final look — these used to
            be pinned to the size enum. The fork lets us mix them freely. */}
        <Section title="Layers (fork)">
          <Slider
            label="Stroke opacity (z-index 2 — beam itself)"
            value={c.strokeOpacity}
            min={0}
            max={2}
            step={0.02}
            onChange={(v) => update({ strokeOpacity: v })}
          />
          <Slider
            label="Inner glow opacity (z-index 1)"
            value={c.innerOpacity}
            min={0}
            max={2}
            step={0.02}
            onChange={(v) => update({ innerOpacity: v })}
          />
          <Slider
            label="Outer bloom opacity (z-index 3)"
            value={c.bloomOpacity}
            min={0}
            max={2}
            step={0.02}
            onChange={(v) => update({ bloomOpacity: v })}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
              Inner shadow color (any CSS color)
            </span>
            <input
              type="text"
              value={c.innerShadow}
              onChange={(e) => update({ innerShadow: e.target.value })}
              placeholder="rgba(255, 255, 255, 0.27)"
              className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text)] border border-[var(--color-border)] outline-none font-mono"
            />
          </div>
        </Section>

        {/* Saved presets */}
        <Section title={`Presets (${visiblePresets.length})`}>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Preset name…"
              value={newPresetLabel}
              onChange={(e) => setNewPresetLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSavePreset()
              }}
              className="flex-1 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text)] border border-[var(--color-border)] outline-none"
            />
            <button
              className="px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--active-bg)] text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default disabled:opacity-40"
              disabled={!newPresetLabel.trim()}
              onClick={() => void handleSavePreset()}
            >
              Save
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {visiblePresets.length === 0 && (
              <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)]">
                No saved presets for this surface yet.
              </div>
            )}
            {visiblePresets.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                <span className="flex-1 text-[length:var(--font-size-xs)] text-[color:var(--color-text)] truncate">
                  {p.label}
                </span>
                <button
                  className="px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
                  onClick={() => void handleApplyPreset(p)}
                >
                  Apply
                </button>
                <button
                  className="px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-amber)] hover:bg-[var(--hover-highlight)] transition-default"
                  onClick={() => void handleDeletePreset(p.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Copy clipboard */}
        <Section title="Export">
          <button
            className="px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--active-bg)] text-[color:var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
            onClick={() => void handleCopyConfig()}
          >
            {copyFeedback === 'copied' ? 'Copied to clipboard' : 'Copy current config as JSON'}
          </button>
          <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] mt-1">
            Paste back in chat to bake the values into a default or new variant.
          </div>
        </Section>
      </div>
    </div>
  )
}
