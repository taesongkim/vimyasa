// Dev-only controls panel for the theme system. Lives in its own frameless
// BrowserWindow (created by main/theme-dev-panel.ts) at route #/themedev.
// Tuning a slider mutates the themes store, which broadcasts the new config
// to every renderer so the surface being tuned updates live.

import { useEffect, useMemo, useState } from 'react'
import { useThemesStore } from '../../store/themesStore'
import {
  APPEARANCE_VALUES,
  SURFACE_IDS,
  SURFACE_LABELS,
  THEME_EVENT_NAMES,
  defaultSurfaceConfig,
  type Appearance,
  type LightBeamOverride,
  type SurfaceId,
  type SurfaceConfig,
  type ThemeDevPreset,
  type ThemeEventName
} from '@shared/themes'
import { defaultPaletteHex } from '../../lib/border-beam-fork/palettes'
import { hexToOklch, oklchToHex, type Oklch } from '../../lib/oklch'

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
              ? 'bg-[var(--active-bg)] text-[color:var(--color-text-primary)]'
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
  decimals,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  /** Decimal places shown next to the slider. Defaults to 2 for sub-1
   *  steps and 0 for integer steps — fine for most knobs. Pass an
   *  explicit value (e.g. 3 for the bg-darkness slider's 0.005 step)
   *  when the default precision would round away meaningful detail. */
  decimals?: number
  onChange: (v: number) => void
}) {
  const fixed = decimals ?? (step < 1 ? 2 : 0)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
          {label}
        </span>
        <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] font-mono tabular-nums">
          {value.toFixed(fixed)}
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

/** Compact inline range for one OKLCH channel — denser than <Slider> so a
 *  blob's L/C/H fit on one row. Used only by the light-mode palette editor. */
function LchMini({
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
    <label className="flex items-center gap-1 grow" title={`${label} ${value.toFixed(3)}`}>
      <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] w-2.5 shrink-0">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="grow accent-[var(--color-accent)]"
      />
    </label>
  )
}

/** One blob's light-mode row: dark base swatch → resulting light swatch,
 *  then L/C/H sliders seeded from the current light color (falling back to
 *  the dark base so the user starts from today's palette and tunes down).
 *  Moving any channel writes a concrete hex, so the blob becomes an
 *  override; the × clears it back to inheriting the dark color. */
function OklchBlobRow({
  index,
  darkHex,
  lightHex,
  onChange,
  onClear
}: {
  index: number
  darkHex: string
  lightHex: string | null
  onChange: (hex: string) => void
  onClear: () => void
}) {
  const isOverride = typeof lightHex === 'string' && lightHex.length > 0
  const seed: Oklch = hexToOklch(isOverride ? lightHex! : darkHex)
  const resultHex = oklchToHex(seed)
  const emit = (patch: Partial<Oklch>): void => onChange(oklchToHex({ ...seed, ...patch }))
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] w-5 shrink-0 font-mono">
        {index + 1}
      </span>
      <span
        className="w-4 h-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] shrink-0"
        style={{ backgroundColor: darkHex }}
        title={`dark ${darkHex}`}
      />
      <span className="text-[color:var(--color-text-ghost)] shrink-0">→</span>
      <span
        className="w-4 h-4 rounded-[var(--radius-sm)] shrink-0"
        style={{
          backgroundColor: resultHex,
          outline: isOverride ? '1px solid var(--color-accent)' : '1px solid var(--color-border)'
        }}
        title={`light ${resultHex}${isOverride ? ' (override)' : ' (inherited)'}`}
      />
      <LchMini label="L" value={seed.l} min={0} max={1} step={0.005} onChange={(v) => emit({ l: v })} />
      <LchMini label="C" value={seed.c} min={0} max={0.37} step={0.002} onChange={(v) => emit({ c: v })} />
      <LchMini label="H" value={seed.h} min={0} max={360} step={1} onChange={(v) => emit({ h: v })} />
      <button
        className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] hover:text-[color:var(--color-text-primary)] w-4 shrink-0 disabled:opacity-30"
        onClick={onClear}
        disabled={!isOverride}
        title="Clear this blob (inherit dark)"
      >
        ×
      </button>
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
  const effects = useThemesStore((s) => s.effects)
  const appearance = useThemesStore((s) => s.appearance)
  const setMasterEnabled = useThemesStore((s) => s.setMasterEnabled)
  const setSurfaceEnabled = useThemesStore((s) => s.setSurfaceEnabled)
  const setSurfaceConfig = useThemesStore((s) => s.setSurfaceConfig)
  const setEffects = useThemesStore((s) => s.setEffects)
  const setAppearance = useThemesStore((s) => s.setAppearance)

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
  const p = config.particles
  const b = config.burst
  const tr = config.triggers

  const update = (patch: Partial<SurfaceConfig['borderBeam']>) => {
    void setSurfaceConfig(selectedSurface, {
      ...config,
      borderBeam: { ...c, ...patch }
    })
  }
  const updateParticles = (patch: Partial<SurfaceConfig['particles']>) => {
    void setSurfaceConfig(selectedSurface, {
      ...config,
      particles: { ...p, ...patch }
    })
  }
  const updateBurst = (patch: Partial<SurfaceConfig['burst']>) => {
    void setSurfaceConfig(selectedSurface, {
      ...config,
      burst: { ...b, ...patch }
    })
  }
  const updateTriggers = (patch: Partial<SurfaceConfig['triggers']>) => {
    void setSurfaceConfig(selectedSurface, {
      ...config,
      triggers: { ...tr, ...patch }
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

  // ── Light-mode override plumbing (v0.1.9 Magic Colors calibration) ──
  // Every write funnels through pruneLight so a lightBeam with no meaningful
  // content collapses back to `undefined` — light mode then inherits the
  // dark config, and nothing stale gets baked when Justin copies the snippet.
  const pruneLight = (obj: LightBeamOverride): LightBeamOverride | undefined => {
    const cleaned: LightBeamOverride = {}
    if (obj.paletteOverride && obj.paletteOverride.some((v) => v != null)) {
      cleaned.paletteOverride = obj.paletteOverride
    }
    if (obj.glowDepth !== undefined) cleaned.glowDepth = obj.glowDepth
    if (obj.strength !== undefined) cleaned.strength = obj.strength
    if (obj.whiteSheen !== undefined) cleaned.whiteSheen = obj.whiteSheen
    if (obj.strokeOpacity !== undefined) cleaned.strokeOpacity = obj.strokeOpacity
    if (obj.brightness !== undefined) cleaned.brightness = obj.brightness
    if (obj.saturation !== undefined) cleaned.saturation = obj.saturation
    if (typeof obj.innerShadow === 'string' && obj.innerShadow.length > 0) {
      cleaned.innerShadow = obj.innerShadow
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined
  }
  const updateLight = (patch: Partial<LightBeamOverride>) => {
    update({ lightBeam: pruneLight({ ...(c.lightBeam ?? {}), ...patch }) })
  }
  const handleCopyLight = async () => {
    const light = pruneLight(c.lightBeam ?? {})
    const text = light
      ? `// ${SURFACE_LABELS[selectedSurface]} — light-mode override\nlightBeam: ${JSON.stringify(light, null, 2)}`
      : `// ${SURFACE_LABELS[selectedSurface]} — no light-mode override set`
    await navigator.clipboard.writeText(text)
    setCopyFeedback('copied-light')
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
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
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
        {/* Phase 2 of color-tokenization — appearance mode picker.
            Features lane builds the user-facing Settings → Appearance
            tab; this dev-panel control mirrors the same `themes.setAppearance`
            IPC for live tuning of light-mode tokens. Order matches the
            macOS System Settings convention (Light / Dark / Auto). */}
        <Section title="Appearance">
          <Segmented<Appearance>
            value={appearance}
            options={APPEARANCE_VALUES}
            onChange={(v) => void setAppearance(v)}
          />
          <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] leading-snug">
            Mirrors onto &lt;html data-appearance&gt;. Auto follows the macOS
            system setting via prefers-color-scheme.
          </span>
        </Section>

        {/* Bg-base alpha tuning — per-mode pair (Phase 2 split). Each
            slider drives a distinct store field (devBgBaseDarkA /
            devBgBaseLightA), mirrored onto <html> as two CSS vars, and
            globals.css's appearance selectors pick the active one. Both
            stay visible regardless of current appearance so cross-mode
            iteration doesn't require flipping back and forth. */}
        <Section title="Interface background">
          <Slider
            label="Dark mode darkness"
            value={effects.devBgBaseDarkA}
            min={0.05}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => void setEffects({ devBgBaseDarkA: v })}
          />
          <Slider
            label="Light mode lightness"
            value={effects.devBgBaseLightA}
            min={0.05}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => void setEffects({ devBgBaseLightA: v })}
          />
          <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] leading-snug">
            Higher = more overlay over vibrancy (darker in dark, lighter in
            light). Each mode tunes independently. Bake new defaults into
            <code className="font-mono">DEFAULT_EFFECTS_CONFIG</code> when
            values land right.
          </span>
        </Section>

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
              className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] outline-none"
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
              label="Border width (px) — stroke thickness"
              value={c.borderWidth}
              min={0.5}
              max={40}
              step={0.5}
              onChange={(v) => update({ borderWidth: v })}
            />
            <Slider
              label="Beam length (% of perimeter) — 100 = full perimeter"
              value={c.beamLength}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ beamLength: v })}
            />
            <Slider
              label="Start angle (deg, sm/md only) — phase offset on perimeter"
              value={c.startAngle}
              min={0}
              max={360}
              step={1}
              onChange={(v) => update({ startAngle: v })}
            />
            <Slider
              label="Glow depth inward (1 = upstream, lower = tighter to edge)"
              value={c.glowDepth}
              min={0.1}
              max={3}
              step={0.05}
              onChange={(v) => update({ glowDepth: v })}
            />
            <Slider
              label="White sheen (0 = pure hue streak, 1 = upstream white highlight)"
              value={c.whiteSheen}
              min={0}
              max={1}
              step={0.02}
              onChange={(v) => update({ whiteSheen: v })}
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
                className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] outline-none"
              />
            </div>
          </div>
        </Section>

        {/* Extra beams: stacked secondary rotations layered on top of the
            primary beam. Each has its own duration / beamLength / strength
            but inherits variant + palette so the family stays coherent. */}
        <Section title={`Extra beams (${c.extraBeams.length}/3)`}>
          <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] mb-1">
            Up to 3 stacked rotating layers; each at its own speed + length.
            Variant + palette + colors are inherited from the primary above.
          </div>
          <button
            className="px-2 py-0.5 self-start rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--active-bg)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default disabled:opacity-40"
            disabled={c.extraBeams.length >= 3}
            onClick={() =>
              update({
                extraBeams: [
                  ...c.extraBeams,
                  {
                    enabled: true,
                    duration: 2.4,
                    beamLength: 28,
                    strength: 1,
                    startAngle: 0
                  }
                ]
              })
            }
          >
            + Add beam layer
          </button>
          <div className="flex flex-col gap-2 mt-1">
            {c.extraBeams.map((eb, i) => (
              <div
                key={i}
                className="flex flex-col gap-0.5 p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between">
                  <ToggleRow
                    label={`Beam ${i + 1}`}
                    on={eb.enabled}
                    onToggle={() => {
                      const next = [...c.extraBeams]
                      next[i] = { ...eb, enabled: !eb.enabled }
                      update({ extraBeams: next })
                    }}
                  />
                  <button
                    className="ml-2 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-amber)] hover:bg-[var(--hover-highlight)] transition-default"
                    onClick={() => {
                      const next = c.extraBeams.filter((_, j) => j !== i)
                      update({ extraBeams: next })
                    }}
                    title="Remove this beam"
                  >
                    Remove
                  </button>
                </div>
                <Slider
                  label="Duration (s)"
                  value={eb.duration}
                  min={0.5}
                  max={8}
                  step={0.1}
                  onChange={(v) => {
                    const next = [...c.extraBeams]
                    next[i] = { ...eb, duration: v }
                    update({ extraBeams: next })
                  }}
                />
                <Slider
                  label="Beam length (% of perimeter)"
                  value={eb.beamLength}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(v) => {
                    const next = [...c.extraBeams]
                    next[i] = { ...eb, beamLength: v }
                    update({ extraBeams: next })
                  }}
                />
                <Slider
                  label="Strength"
                  value={eb.strength}
                  min={0}
                  max={5}
                  step={0.05}
                  onChange={(v) => {
                    const next = [...c.extraBeams]
                    next[i] = { ...eb, strength: v }
                    update({ extraBeams: next })
                  }}
                />
                <Slider
                  label="Start angle (deg) — phase offset"
                  value={eb.startAngle}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(v) => {
                    const next = [...c.extraBeams]
                    next[i] = { ...eb, startAngle: v }
                    update({ extraBeams: next })
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Per-blob color editing for the rotating beam. The package picks
            from a 9-blob palette per variant; here you can swap any blob's
            color. Position and size are inherited from the variant. */}
        <Section title="Colors (per blob — sm/md only)">
          <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] mb-1">
            Click a swatch to override the blob color. Reset clears all 9.
          </div>
          {(() => {
            const defaults = defaultPaletteHex(c.colorVariant)
            const override = c.paletteOverride ?? []
            const numBlobs = Math.max(defaults.length, 9)
            const swatches: { idx: number; current: string; isOverride: boolean }[] = []
            for (let i = 0; i < numBlobs; i++) {
              const o = override[i]
              const def = defaults[i] ?? '#000000'
              const isOverride = typeof o === 'string' && o.length > 0
              swatches.push({ idx: i, current: isOverride ? o : def, isOverride })
            }
            const setBlob = (i: number, hex: string | null) => {
              const next = [...(c.paletteOverride ?? [])]
              while (next.length < numBlobs) next.push(null)
              next[i] = hex
              const allEmpty = next.every((v) => v == null)
              update({ paletteOverride: allEmpty ? undefined : next })
            }
            return (
              <>
                <div className="grid grid-cols-9 gap-1">
                  {swatches.map((s) => (
                    <label
                      key={s.idx}
                      className="relative block w-full aspect-square rounded-[var(--radius-sm)] cursor-pointer overflow-hidden border border-[var(--color-border)]"
                      style={{ backgroundColor: s.current }}
                      title={`Blob ${s.idx + 1}${s.isOverride ? ' (override)' : ''}`}
                    >
                      <input
                        type="color"
                        value={s.current}
                        onChange={(e) => setBlob(s.idx, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {s.isOverride && (
                        <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] m-0.5" />
                      )}
                    </label>
                  ))}
                </div>
                <button
                  className="mt-1 px-2 py-0.5 self-start rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
                  onClick={() => update({ paletteOverride: undefined })}
                  disabled={!c.paletteOverride || c.paletteOverride.every((v) => v == null)}
                >
                  Reset to {c.colorVariant} defaults
                </button>
              </>
            )
          })()}
        </Section>

        {/* ── Light-mode override (v0.1.9 Magic Colors legibility) ──────────
            Everything here applies ONLY when the resolved appearance is light
            (explicit Light, or Auto while the system is light). Flip the
            Appearance control at the top of the panel to preview live. Any
            knob left untouched inherits the dark config, so this stays a
            small delta on Magic Colors rather than a second full theme. */}
        <Section title="Light-mode override (Magic Colors on white)">
          <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] mb-1">
            Applies only in Light appearance — flip Appearance → Light above to
            preview. Sliders seed from the dark palette; drag L down / C up to
            darken and saturate for a white background.
          </div>
          {(() => {
            const light = c.lightBeam ?? {}
            const defaults = defaultPaletteHex(c.colorVariant)
            const darkPal = c.paletteOverride ?? []
            const lightPal = light.paletteOverride ?? []
            const numBlobs = Math.max(defaults.length, 9)
            const setLightBlob = (i: number, hex: string | null) => {
              const next = [...lightPal]
              while (next.length < numBlobs) next.push(null)
              next[i] = hex
              const allEmpty = next.every((v) => v == null)
              updateLight({ paletteOverride: allEmpty ? undefined : next })
            }
            const rows: React.ReactNode[] = []
            for (let i = 0; i < numBlobs; i++) {
              const d = darkPal[i]
              const darkHex = typeof d === 'string' && d.length > 0 ? d : defaults[i] ?? '#000000'
              const l = lightPal[i]
              const lightHex = typeof l === 'string' && l.length > 0 ? l : null
              rows.push(
                <OklchBlobRow
                  key={i}
                  index={i}
                  darkHex={darkHex}
                  lightHex={lightHex}
                  onChange={(hex) => setLightBlob(i, hex)}
                  onClear={() => setLightBlob(i, null)}
                />
              )
            }
            const paletteSet = lightPal.some((v) => v != null)
            return (
              <div className="flex flex-col gap-1">
                {rows}
                <button
                  className="mt-1 px-2 py-0.5 self-start rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default disabled:opacity-40"
                  onClick={() => updateLight({ paletteOverride: undefined })}
                  disabled={!paletteSet}
                >
                  Reset light palette (inherit dark)
                </button>
              </div>
            )
          })()}

          {/* Legibility extras — the near-white layers (sheen, inner-shadow,
              stroke) that wash out on a light background. Off by default so
              light inherits the dark values; toggling on seeds them from the
              dark config as a starting point. */}
          {(() => {
            const light = c.lightBeam ?? {}
            const extrasOn =
              light.glowDepth !== undefined ||
              light.strength !== undefined ||
              light.whiteSheen !== undefined ||
              light.strokeOpacity !== undefined ||
              light.brightness !== undefined ||
              light.saturation !== undefined ||
              (typeof light.innerShadow === 'string' && light.innerShadow.length > 0)
            return (
              <div className="mt-2 flex flex-col gap-1.5">
                <ToggleRow
                  label="Tune light-mode layers (seed from dark)"
                  on={extrasOn}
                  onToggle={() => {
                    if (extrasOn) {
                      updateLight({
                        glowDepth: undefined,
                        strength: undefined,
                        whiteSheen: undefined,
                        strokeOpacity: undefined,
                        brightness: undefined,
                        saturation: undefined,
                        innerShadow: undefined
                      })
                    } else {
                      updateLight({
                        glowDepth: c.glowDepth,
                        strength: c.strength,
                        whiteSheen: c.whiteSheen,
                        strokeOpacity: c.strokeOpacity,
                        brightness: c.brightness,
                        saturation: c.saturation,
                        innerShadow: c.innerShadow
                      })
                    }
                  }}
                />
                {extrasOn && (
                  <>
                    <Slider
                      label="Light glow depth (inward)"
                      value={light.glowDepth ?? c.glowDepth}
                      min={0.1}
                      max={3}
                      step={0.02}
                      onChange={(v) => updateLight({ glowDepth: v })}
                    />
                    <Slider
                      label="Light strength"
                      value={light.strength ?? c.strength}
                      min={0}
                      max={3}
                      step={0.02}
                      onChange={(v) => updateLight({ strength: v })}
                    />
                    <Slider
                      label="Light brightness"
                      value={light.brightness ?? c.brightness}
                      min={0}
                      max={3}
                      step={0.02}
                      onChange={(v) => updateLight({ brightness: v })}
                    />
                    <Slider
                      label="Light saturation"
                      value={light.saturation ?? c.saturation}
                      min={0}
                      max={3}
                      step={0.02}
                      onChange={(v) => updateLight({ saturation: v })}
                    />
                    <Slider
                      label="Light stroke opacity"
                      value={light.strokeOpacity ?? c.strokeOpacity}
                      min={0}
                      max={2}
                      step={0.02}
                      onChange={(v) => updateLight({ strokeOpacity: v })}
                    />
                    <Slider
                      label="Light white sheen"
                      value={light.whiteSheen ?? c.whiteSheen}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={(v) => updateLight({ whiteSheen: v })}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
                        Light inner shadow (any CSS color)
                      </span>
                      <input
                        type="text"
                        value={light.innerShadow ?? c.innerShadow}
                        onChange={(e) => updateLight({ innerShadow: e.target.value })}
                        placeholder="rgba(0, 0, 0, 0.35)"
                        className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] outline-none font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          <button
            className="mt-2 px-2 py-0.5 self-start rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
            onClick={() => void handleCopyLight()}
          >
            {copyFeedback === 'copied-light' ? 'Copied lightBeam' : 'Copy lightBeam snippet'}
          </button>
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
              className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] outline-none font-mono"
            />
          </div>
        </Section>

        {/* Particle layer — composed on top of the beam, runs continuously
            on a canvas. Tinted from the variant palette by default. */}
        <Section title="Particles">
          <ToggleRow
            label="Enable particle layer"
            on={p.enabled}
            onToggle={() => updateParticles({ enabled: !p.enabled })}
          />
          <Slider
            label="Count"
            value={p.count}
            min={0}
            max={200}
            step={1}
            onChange={(v) => updateParticles({ count: v })}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
              Color (CSS color, or 'auto' for variant palette)
            </span>
            <input
              type="text"
              value={p.color}
              onChange={(e) => updateParticles({ color: e.target.value })}
              placeholder="auto"
              className="w-full px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] outline-none font-mono"
            />
          </div>
          <Slider
            label="Min size (CSS px) — 0.5 ≈ one device pixel on retina"
            value={p.minSize}
            min={0.25}
            max={4}
            step={0.05}
            onChange={(v) => updateParticles({ minSize: v })}
          />
          <Slider
            label="Max size (CSS px)"
            value={p.maxSize}
            min={0.25}
            max={4}
            step={0.05}
            onChange={(v) => updateParticles({ maxSize: v })}
          />
          <Slider
            label="Min lifetime (ms)"
            value={p.minLifetimeMs}
            min={200}
            max={10000}
            step={50}
            onChange={(v) => updateParticles({ minLifetimeMs: v })}
          />
          <Slider
            label="Max lifetime (ms)"
            value={p.maxLifetimeMs}
            min={200}
            max={10000}
            step={50}
            onChange={(v) => updateParticles({ maxLifetimeMs: v })}
          />
          <Slider
            label="Drift speed (px/sec, ± per axis)"
            value={p.speed}
            min={0}
            max={300}
            step={1}
            onChange={(v) => updateParticles({ speed: v })}
          />
          <Slider
            label="Glow softness (0 = sharp, 1 = soft halo)"
            value={p.glowSoftness}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => updateParticles({ glowSoftness: v })}
          />
          <Slider
            label="Color variation (0 = exact blob color, 1 = wide HSL jitter)"
            value={p.colorJitter}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => updateParticles({ colorJitter: v })}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
              Spawn from
            </span>
            <Segmented
              value={p.spawn}
              options={['palette', 'inside', 'edges'] as const}
              onChange={(v) => updateParticles({ spawn: v })}
            />
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)]">
              palette: cluster near wave blobs · inside / edges: random,
              colored from nearest blob (when color = auto)
            </span>
          </div>

          {/* 3-layer split: each enabled sublayer renders count/N particles
              with its own blur + opacity. Cheap depth-of-field. */}
          <div className="border-t border-[var(--color-border)] pt-2 mt-1 flex flex-col gap-1">
            <ToggleRow
              label="Split into 3 layers (independent blur + opacity)"
              on={p.threeLayers}
              onToggle={() => updateParticles({ threeLayers: !p.threeLayers })}
            />
            {p.threeLayers && (
              <div className="flex flex-col gap-2 mt-1">
                {p.layers.map((layer, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-0.5 p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                  >
                    <ToggleRow
                      label={`Layer ${i + 1}`}
                      on={layer.enabled}
                      onToggle={() => {
                        const layers = [...p.layers] as typeof p.layers
                        layers[i] = { ...layer, enabled: !layer.enabled }
                        updateParticles({ layers })
                      }}
                    />
                    <Slider
                      label="Blur (px)"
                      value={layer.blur}
                      min={0}
                      max={20}
                      step={0.5}
                      onChange={(v) => {
                        const layers = [...p.layers] as typeof p.layers
                        layers[i] = { ...layer, blur: v }
                        updateParticles({ layers })
                      }}
                    />
                    <Slider
                      label="Opacity"
                      value={layer.opacity}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={(v) => {
                        const layers = [...p.layers] as typeof p.layers
                        layers[i] = { ...layer, opacity: v }
                        updateParticles({ layers })
                      }}
                    />
                  </div>
                ))}
                <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)]">
                  Each enabled layer renders count/N particles independently.
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Burst-and-fade timing — drives both beam and particles in pulses. */}
        <Section title="Burst mode (auto pulse)">
          <ToggleRow
            label="Enable burst pulsing"
            on={b.enabled}
            onToggle={() => updateBurst({ enabled: !b.enabled })}
          />
          <Slider
            label="On duration (ms) — beam visible"
            value={b.onMs}
            min={100}
            max={6000}
            step={50}
            onChange={(v) => updateBurst({ onMs: v })}
          />
          <Slider
            label="Off duration (ms) — quiet between bursts"
            value={b.offMs}
            min={0}
            max={6000}
            step={50}
            onChange={(v) => updateBurst({ offMs: v })}
          />
          <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] mt-1">
            Cycle drives the surface's active state — beam fade and particle
            mount/unmount both follow.
          </div>
        </Section>

        {/* Triggers: app events fire surface pulses. When enabled, the
            surface is dormant until a matching event broadcasts; on a hit
            it stays active for `durationMs` then fades out. Overrides
            burst-mode and continuous behavior. */}
        <Section title="Triggers (fire on event)">
          <ToggleRow
            label="Enable event triggers"
            on={tr.enabled}
            onToggle={() => updateTriggers({ enabled: !tr.enabled })}
          />
          <div className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)]">
            When on, the surface only lights up briefly when a matching app
            event fires. Suppresses burst-mode and continuous animation while
            triggered.
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)]">
              Subscribe to events
            </span>
            <div className="flex flex-wrap gap-1">
              {THEME_EVENT_NAMES.map((name) => {
                const on = tr.events.includes(name)
                return (
                  <button
                    key={name}
                    className={`px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium transition-default ${
                      on
                        ? 'bg-[var(--color-accent)] text-[color:var(--color-text-primary)]'
                        : 'bg-[var(--color-surface)] text-[color:var(--color-text-muted)] border border-[var(--color-border)] hover:text-[color:var(--color-text-secondary)]'
                    }`}
                    onClick={() => {
                      const next = on
                        ? tr.events.filter((e) => e !== name)
                        : [...tr.events, name]
                      updateTriggers({ events: next as ThemeEventName[] })
                    }}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
          <Slider
            label="Active duration (ms) — held visible after each event"
            value={tr.durationMs}
            min={100}
            max={6000}
            step={50}
            onChange={(v) => updateTriggers({ durationMs: v })}
          />
          <div className="flex gap-1 mt-1">
            <button
              className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--active-bg)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
              onClick={() => void window.api.themeEvents.fire('manual-test')}
            >
              Test fire (manual-test)
            </button>
            <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-ghost)] self-center">
              Make sure 'manual-test' is selected above.
            </span>
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
              className="flex-1 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] border border-[var(--color-border)] outline-none"
            />
            <button
              className="px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--active-bg)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default disabled:opacity-40"
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
                <span className="flex-1 text-[length:var(--font-size-xs)] text-[color:var(--color-text-primary)] truncate">
                  {p.label}
                </span>
                <button
                  className="px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
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
            className="px-2 py-1 rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] font-medium bg-[var(--active-bg)] text-[color:var(--color-text-primary)] hover:bg-[var(--hover-highlight)] transition-default"
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
