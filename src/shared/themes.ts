// Theme system — types, surface registry, and attribution metadata shared
// between main and renderer. No React/JSX here so this can be imported from
// the main process bundle.

export type SurfaceId =
  | 'quickadd-window'
  | 'quickadd-input'
  | 'list-window'
  | 'list-item'
  | 'list-item-edit'
  | 'list-add-new'
  | 'welcome-callout-window'
  | 'welcome-callout-start-button'
  | 'feedback-input'

export const SURFACE_IDS: readonly SurfaceId[] = [
  'quickadd-window',
  'quickadd-input',
  'list-window',
  'list-item',
  'list-item-edit',
  'list-add-new',
  'welcome-callout-window',
  'welcome-callout-start-button',
  'feedback-input'
] as const

export const SURFACE_LABELS: Record<SurfaceId, string> = {
  'quickadd-window': 'Entry form window',
  'quickadd-input': 'Entry form input',
  'list-window': 'List window',
  'list-item': 'List item',
  'list-item-edit': 'List item — edit field',
  'list-add-new': 'Add new item field',
  'welcome-callout-window': 'Welcome callout window',
  'welcome-callout-start-button': 'Welcome callout — Start Tour button',
  'feedback-input': 'Feedback window — message field'
}

// Subset of border-beam-fork's props we expose for tuning. We always pass
// theme: 'dark' since the app is dark-mode-only by intent.
//
// `size` selects the geometry (sm/md = full perimeter rotating beam,
// line = bottom-only travelling beam). The fork-only knobs below
// (borderWidth, strokeOpacity, innerOpacity, bloomOpacity, innerShadow)
// were size-enum-pinned in the upstream package; here they're always
// active overrides so the dev panel can tune the look continuously
// without being stuck in 3-stop preset land.
export interface BorderBeamConfig {
  size: 'sm' | 'md' | 'line'
  colorVariant: 'colorful' | 'mono' | 'ocean' | 'sunset'
  strength: number
  duration: number
  brightness: number
  saturation: number
  hueRange: number
  staticColors: boolean
  /** Optional override; when undefined, the fork auto-detects from the host element. */
  borderRadius?: number
  /** Stroke thickness in px. Upstream pinned to 1 for every size; here it
   *  becomes the primary "size" knob — dial it up for thicker beams. */
  borderWidth: number
  /** Per-layer opacities. Independent of `size` so the layer mix can be
   *  tuned freely. Initial defaults match the upstream md/dark preset. */
  strokeOpacity: number
  innerOpacity: number
  bloomOpacity: number
  /** Inner-shadow color (any CSS color). Initial default matches md/dark. */
  innerShadow: string
  /** Percent of the perimeter the bright streak covers (sm/md only).
   *  28 ≈ upstream default; 100 = full uniform perimeter glow. Line mode
   *  ignores this — its travel + breathe animations dictate streak length. */
  beamLength: number
  /** Inset in CSS px from the BorderBeam wrapper's edge — currently a
   *  no-op kept for back-compat with old saved presets. The "tighten the
   *  glow toward the edge" intent is now served by `glowDepth` below. */
  beamInset: number
  /** Inner-glow size multiplier (≈0.1–3, default 1). Scales the radial-
   *  gradient blob sizes that compose the inner glow layer. Lower =
   *  glow gradient tighter to the perimeter (less reaches inward toward
   *  the center); higher = glow extends further inward. The beam's
   *  perimeter position is unchanged — the streak still anchors at the
   *  edge, only the soft falloff is reshaped. */
  glowDepth: number
  /** Intensity of the white highlight streak riding on top of the colored
   *  blob gradients (and the bright spike inside the bloom layer). 0 = no
   *  white sheen — the rotating beam shows only the variant's hue blobs.
   *  1 = upstream behavior. The colored streak is unaffected — turn this
   *  down to keep just the hue. */
  whiteSheen: number
  /** Per-blob color override (advanced). Length up to 9 (md size has 9
   *  border blobs; sm has 8). Each slot replaces the matching blob's
   *  color in the rotating beam; null preserves the variant default for
   *  that slot. Position and size inherit from the variant — only color
   *  is editable from the dev panel. Undefined = no override applied. */
  paletteOverride?: (string | null)[]
  /** Rotation phase offset in degrees (0–360, sm/md only). Shifts where the
   *  rotating bright streak starts on the perimeter — without this, every
   *  beam on a surface starts at the same conic angle and stacked extras
   *  visually line up. Line mode ignores this (its travel anim doesn't
   *  rotate). Default 0 = upstream behavior. */
  startAngle: number
  /** Stacked secondary beams (up to 3) layered on top of the primary, each
   *  with its own rotation duration, beam length, and strength. They share
   *  the primary's color variant + palette so the family stays coherent;
   *  use them to make multiple streaks meet and diverge at different rates.
   *  Empty array = single-beam (default). */
  extraBeams: ExtraBeam[]
  /** Per-mode override applied when the resolved appearance is LIGHT (an
   *  explicit `light` appearance, or `auto` while the system is light).
   *  Only the legibility-critical knobs live here — the Magic Colors palette
   *  and the few layers that wash out on a near-white background. Every
   *  field is optional and merged shallowly (defined keys only) over the
   *  base config in GlowSurface; anything omitted inherits the base
   *  (dark-tuned) value. Undefined/absent = light uses the base config
   *  unchanged (current behavior). Dark mode never consults this field. */
  lightBeam?: LightBeamOverride
}

/** Light-mode override for a border beam. Shape is a curated subset of
 *  BorderBeamConfig — not `Partial<BorderBeamConfig>` — so it stays flat
 *  (no recursive `lightBeam`) and the dev panel exposes exactly the knobs
 *  that matter for reading Magic Colors on white. See BorderBeamConfig
 *  for each field's meaning. */
export interface LightBeamOverride {
  /** Light-mode palette (per-blob color; null preserves the variant default
   *  for that slot). Independent of the base `paletteOverride`. */
  paletteOverride?: (string | null)[]
  /** White highlight streak intensity. Near-invisible on white at the base
   *  0.18 — usually pushed down further or repurposed in light mode. */
  whiteSheen?: number
  /** Inner-shadow color. Base is white (invisible on white); a darker value
   *  here gives the glow an edge on a light background. */
  innerShadow?: string
  /** Beam stroke opacity — bump for more contrast against white. */
  strokeOpacity?: number
  /** Beam brightness multiplier. */
  brightness?: number
  /** Beam saturation multiplier — more saturation reads better on white. */
  saturation?: number
}

export interface ExtraBeam {
  enabled: boolean
  /** Rotation period in seconds — independent of the primary's duration. */
  duration: number
  /** Streak coverage 0–100 (% of perimeter). Mirrors the primary's
   *  beamLength but per-layer. */
  beamLength: number
  /** Opacity multiplier 0–N applied via --beam-strength on this layer. */
  strength: number
  /** Rotation phase offset in degrees (0–360, sm/md only). Shifts this
   *  layer's start angle relative to the primary so stacked streaks don't
   *  all line up at 0°. Line mode ignores this. Default 0. */
  startAngle: number
}

// One configured effect stack per surface. The border beam is the primary
// visual; the particle layer is an optional companion that composes on top.
// Burst is an optional auto-pulse timing mode; triggers fire on app events.
export interface SurfaceConfig {
  enabled: boolean
  effect: 'border-beam'
  borderBeam: BorderBeamConfig
  particles: ParticleConfig
  burst: BurstConfig
  triggers: TriggerConfig
}

/** Names of app events that can fire a surface's trigger. Broadcast over
 *  IPC from the main process so the event hits every renderer window —
 *  e.g., adding an item in QuickAdd can pulse the list window's beam. */
export type ThemeEventName =
  | 'item-added'
  | 'item-status-changed'
  | 'item-edit-committed'
  | 'manual-test'

export const THEME_EVENT_NAMES: readonly ThemeEventName[] = [
  'item-added',
  'item-status-changed',
  'item-edit-committed',
  'manual-test'
] as const

/** Event payload broadcast over IPC. Optional metadata lets surfaces filter
 *  to specific entities — e.g., a list-item GlowSurface can subscribe to
 *  'item-status-changed' but only react when payload.itemId matches its
 *  own row, so toggling one item's status pulses only that row instead of
 *  every list-item GlowSurface in the window. */
export interface ThemeEventPayload {
  name: ThemeEventName
  itemId?: string
}

/** When `enabled`, the surface becomes active only when one of `events`
 *  fires, and stays active for `durationMs` before fading out (the beam's
 *  own fade-in/out animations carry the visual smoothing). When `enabled`
 *  is false, the surface follows its normal continuous + burst behavior. */
export interface TriggerConfig {
  enabled: boolean
  events: ThemeEventName[]
  durationMs: number
}

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  enabled: false,
  events: [],
  durationMs: 1500
}

/** Periodic on/off cycle for the surface's active state. When enabled, the
 *  surface fires for `onMs`, fades out, waits `offMs`, then repeats — both
 *  the beam's CSS fade and the particle layer's mount/unmount follow this
 *  cycle. Use it for "burst and fade" iteration without wiring per-surface
 *  trigger events. */
export interface BurstConfig {
  enabled: boolean
  /** How long each burst stays active before fading out. */
  onMs: number
  /** Quiet time between bursts (after fade-out completes). */
  offMs: number
}

/** Drifting particle effect — a canvas painted alongside the beam. Each
 *  particle is a soft radial gradient that fades in and out over its
 *  lifetime. Tuned to run continuously at sub-200 counts. */
export interface ParticleConfig {
  enabled: boolean
  /** Particles in flight at any moment. Hard cap 300 to keep canvas work bounded. */
  count: number
  /** 'auto' picks colors from the active variant's 9-blob palette (rotated
   *  through). Any CSS color string also accepted for a single-color look. */
  color: 'auto' | string
  /** Particle radius range in px. */
  minSize: number
  maxSize: number
  /** Lifetime range in ms — each particle fades in over the first 20% of its
   *  lifetime, holds, then fades out over the last 30%. */
  minLifetimeMs: number
  maxLifetimeMs: number
  /** Max drift speed in px/sec (each axis independently random in [-speed, +speed]). */
  speed: number
  /** Where new particles appear:
   *  - 'palette' (default): spawn near the palette blob positions with
   *    jitter; color comes from the same blob. Particles cluster where
   *    the wave colors are concentrated.
   *  - 'inside': spawn anywhere in the host's box. Color is picked from
   *    the nearest palette blob (when `color === 'auto'`).
   *  - 'edges': spawn along the perimeter. Color is also picked from
   *    the nearest palette blob (when `color === 'auto'`). */
  spawn: 'palette' | 'inside' | 'edges'
  /** 0 = hard core, 1 = very soft halo. Controls the radial gradient stop. */
  glowSoftness: number
  /** 0 = exact blob color, 1 = wide HSL jitter (±60° hue, ±30% sat, ±40% light).
   *  Use to break up the obvious tinting when many particles share a blob. */
  colorJitter: number
  /** When true, render particles across 3 stacked sub-layers with
   *  independent blur and opacity per layer. Each enabled layer gets
   *  count/3 particles spawned independently — a cheap depth-of-field. */
  threeLayers: boolean
  /** Per-layer configs (only consulted when threeLayers is true). */
  layers: [ParticleLayerConfig, ParticleLayerConfig, ParticleLayerConfig]
}

export interface ParticleLayerConfig {
  enabled: boolean
  /** CSS blur radius applied to the layer's canvas via `filter: blur()`. */
  blur: number
  /** 0–1, applied via `opacity` on the canvas. */
  opacity: number
}

export type ThemeId = 'border-beam'

/** Schema version, bumped on each batch of baked-default changes:
 *  - 1 → 2: Theme 1 baked `quickadd-input` and flipped master on.
 *  - 2 → 3: Theme 1 added `list-item-edit` (renaming-row glow).
 *  - 3 → 4: Theme 1 added `list-add-new` (in-progress new-item glow).
 *  - 4 → 5: Theme 1 tuned MAGIC_COLORS_BEAM (innerOpacity 0.16 → 0.35);
 *    migration re-bakes all three Magic Colors surfaces so the value
 *    change actually reaches existing stores.
 *  - 5 → 6: Theme 1 added `feedback-input` to the bake (feedback window
 *    textarea — mirror of quickadd-input, same Magic Colors styling).
 *  - 6 → 7: added `effects` namespace with `devBgBaseA` — Phase 0 of the
 *    color-tokenization proposal (dev-only slider for the dark-mode bg
 *    overlay alpha; the overlay itself is pure black, so alpha alone
 *    controls how much vibrancy gets dimmed). Temporary; retires when
 *    Phase 1 bakes the value into Layer 2 tokens. Originally drafted
 *    as `devBgBaseL` (OKLCH lightness with fixed alpha) but that
 *    mechanism produces nearly-imperceptible changes at 0.1 alpha; the
 *    pure-black-overlay-with-variable-alpha shape is simpler and gives
 *    the slider a useful range. See INBOX 2026-05-08 themes note for
 *    the trail and a flag back to Decision 6 of the proposal.
 *  - 7 → 8: added `appearance` field ('light' | 'dark' | 'auto') —
 *    Phase 2 of color-tokenization. Default 'dark' so existing users
 *    on v7 see no change on update (preserves v0.1.7 behavior).
 *    Renderer mirrors the value onto <html data-appearance="..."> for
 *    CSS-only mode switching via the [data-appearance="light"] and
 *    [data-appearance="auto"] + @media (prefers-color-scheme: light)
 *    selectors in globals.css.
 *
 *  Each step is applied incrementally in `getThemesState` so a user
 *  on v1 picks up everything; a user already on v7 only picks up v8. */
export const CURRENT_SCHEMA_VERSION = 8 as const

/** Top-level "effects" namespace — non-surface theme knobs that don't
 *  fit the per-surface SurfaceConfig shape. Originally a single alpha
 *  knob (Phase 0 — `devBgBaseA`); Phase 2 split it into per-mode pair
 *  (dark + light) so each appearance has its own baked default and
 *  can be tuned independently from the dev panel.
 *
 *  This whole namespace is expected to retire (or radically reshape)
 *  once Phase 3 extracts the token system to a cross-project package.
 *  Treat fields here as ephemeral. */
export interface EffectsConfig {
  /** Alpha for the pure-black overlay painted on top of macOS vibrancy
   *  when appearance is 'dark' (or 'auto' + system is dark). 0 =
   *  vibrancy untouched; 1 = fully opaque black. Renderer mirrors
   *  this onto `<html>` as the `--bg-base-dark-a` CSS variable;
   *  globals.css picks it up via `--bg-base-a` in the dark-mode
   *  resolution. Phase 0 originally landed as `devBgBaseA`; Phase 2
   *  renames + splits — see the v8 migration in themes-store.ts. */
  devBgBaseDarkA: number
  /** Alpha for the pure-white overlay painted on top of macOS vibrancy
   *  when appearance is 'light' (or 'auto' + system is light). Same
   *  composition formula as dark, just `--bg-base-l: 1` instead of 0;
   *  higher alpha = lighter (more white sits over the vibrancy). */
  devBgBaseLightA: number
}

/** Dark = 0.8, Light = 0.95 picked by Justin on 2026-05-18 — dark
 *  bumped one notch from the v0.1.7 Phase 0 value (0.7) for slightly
 *  more contrast; light tuned to 0.95 to sit cleanly above the
 *  vibrancy almost-fully-opaque (the remaining 0.05 of vibrancy
 *  bleed gives the surface a subtle living-feel rather than flat
 *  white). Sliders in the dev panel remain for further iteration. */
export const DEFAULT_EFFECTS_CONFIG: EffectsConfig = {
  devBgBaseDarkA: 0.8,
  devBgBaseLightA: 0.95
}

/** User-facing appearance mode (Phase 2 of color-tokenization).
 *  - 'dark' — force dark interface tokens (current v0.1.7 behavior).
 *  - 'light' — force light interface tokens.
 *  - 'auto' — follow macOS system setting via `prefers-color-scheme`.
 *
 *  The renderer mirrors this onto `<html data-appearance="...">`; the
 *  CSS in globals.css picks the right Layer 2 mapping via attribute
 *  selectors + a media query for auto. */
export type Appearance = 'light' | 'dark' | 'auto'

export const APPEARANCE_VALUES: readonly Appearance[] = ['light', 'dark', 'auto'] as const

export interface ThemesState {
  schemaVersion: number
  /** Master switch. When false, no surface renders any glow regardless of per-surface flags. */
  masterEnabled: boolean
  activeTheme: ThemeId
  surfaces: Record<SurfaceId, SurfaceConfig>
  /** Top-level non-surface theme knobs. See EffectsConfig docs. */
  effects: EffectsConfig
  /** User-facing appearance mode. Default 'dark'; see Appearance docs. */
  appearance: Appearance
}

// Defaults below mirror the upstream `border-beam` md/dark preset
// (sizePresets.md.borderWidth = 1; sizeThemePresets.md.dark = { strokeOpacity:
// 0.48, innerOpacity: 0.7, bloomOpacity: 0.8, innerShadow: rgba(255,255,255,0.27) }).
// New surfaces start with this baseline and the dev panel can dial from there.
export const DEFAULT_BORDER_BEAM_CONFIG: BorderBeamConfig = {
  size: 'md',
  colorVariant: 'colorful',
  strength: 1,
  duration: 2.4,
  brightness: 1.3,
  saturation: 1.2,
  hueRange: 30,
  staticColors: false,
  borderWidth: 1,
  strokeOpacity: 0.48,
  innerOpacity: 0.7,
  bloomOpacity: 0.8,
  innerShadow: 'rgba(255, 255, 255, 0.27)',
  beamLength: 28,
  beamInset: 0,
  glowDepth: 1,
  whiteSheen: 1,
  startAngle: 0,
  extraBeams: []
}

// Defaults tuned for fine pixel-dust: minSize 0.5 ≈ one device pixel on a
// 2× retina screen (the smallest visible mark); maxSize 1 caps each particle
// at one CSS pixel. Spawn mode 'palette' clusters them near the wave blob
// positions and inherits each blob's color so the dust visually echoes the
// rotating beam underneath. Override per-surface in the dev panel.
export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  enabled: false,
  count: 30,
  color: 'auto',
  minSize: 0.5,
  maxSize: 1,
  minLifetimeMs: 1500,
  maxLifetimeMs: 4000,
  speed: 30,
  spawn: 'palette',
  glowSoftness: 0.5,
  colorJitter: 0,
  threeLayers: false,
  layers: [
    { enabled: true, blur: 0, opacity: 1 },
    { enabled: true, blur: 2, opacity: 0.7 },
    { enabled: true, blur: 6, opacity: 0.4 }
  ]
}

export const DEFAULT_BURST_CONFIG: BurstConfig = {
  enabled: false,
  onMs: 1500,
  offMs: 800
}

// ─── Theme 1 (Border Beam — "Magic Colors") baked-in overrides ────
//
// Each surface entry merges against the global defaults
// (DEFAULT_BORDER_BEAM_CONFIG / DEFAULT_PARTICLE_CONFIG / etc) — only
// fields that diverge belong in the override, so future schema
// additions backfill cleanly. Surfaces not listed here stay at the
// all-disabled baseline (no glow, no particles).
//
// Adding another surface to Theme 1: spread MAGIC_COLORS_BEAM +
// MAGIC_COLORS_PARTICLES below and override `borderRadius` to match the
// host element's corner radius. Adding another *theme* entirely:
// introduce a separate overrides map and switch on `activeTheme` inside
// `defaultSurfaceConfig`.

// Shared "Magic Colors" animation styling — the visual character of
// Theme 1. Per-surface entries spread this and override `borderRadius`
// (and anything else that needs to differ). Keeping this isolated means
// a single edit re-tunes every surface that uses it.
const MAGIC_COLORS_BEAM: Partial<BorderBeamConfig> = {
  strength: 0.95,
  duration: 2.5,
  brightness: 1.4,
  saturation: 0.55,
  hueRange: 198,
  staticColors: true,
  borderWidth: 0.5,
  innerOpacity: 0.35,
  bloomOpacity: 1.2,
  beamLength: 43,
  glowDepth: 0.5,
  whiteSheen: 0.18,
  paletteOverride: [
    '#7a33ff',
    '#ffde0a',
    '#ff0a0a',
    null,
    '#11bae4',
    '#001eff',
    '#ffc629',
    null,
    null
  ]
  // extraBeams omitted: the original dump had one extra at enabled:false,
  // which by the "don't bake disabled bits" rule means we ship without it.
}

const MAGIC_COLORS_PARTICLES: Partial<ParticleConfig> = {
  enabled: true,
  count: 5,
  minSize: 0.25,
  maxSize: 0.35,
  minLifetimeMs: 350,
  maxLifetimeMs: 1000,
  speed: 11,
  glowSoftness: 0.7
}

const THEME_1_SURFACE_OVERRIDES: Partial<
  Record<SurfaceId, Partial<Omit<SurfaceConfig, 'borderBeam' | 'particles' | 'burst' | 'triggers'>> & {
    borderBeam?: Partial<BorderBeamConfig>
    particles?: Partial<ParticleConfig>
    burst?: Partial<BurstConfig>
    triggers?: Partial<TriggerConfig>
  }>
> = {
  // Entry-form input: 8px radius matches the QuickAdd input field.
  'quickadd-input': {
    enabled: true,
    borderBeam: { ...MAGIC_COLORS_BEAM, borderRadius: 8 },
    particles: { ...MAGIC_COLORS_PARTICLES }
  },
  // List item being renamed: 4px radius matches the row's `rounded`
  // (Tailwind default = 0.25rem = 4px) so the beam traces the focus
  // highlight's corners exactly. Same Magic Colors styling as the
  // entry-form input — feels like the same surface in two places.
  'list-item-edit': {
    enabled: true,
    borderBeam: { ...MAGIC_COLORS_BEAM, borderRadius: 4 },
    particles: { ...MAGIC_COLORS_PARTICLES }
  },
  // New item in progress: same shape as the renaming row — DraftItemRow
  // shares the row layout (and the `rounded` 4px radius), so the same
  // Magic Colors styling reads as a continuous edit affordance whether
  // the user is creating or renaming.
  'list-add-new': {
    enabled: true,
    borderBeam: { ...MAGIC_COLORS_BEAM, borderRadius: 4 },
    particles: { ...MAGIC_COLORS_PARTICLES }
  },
  // Feedback window message field: 8px radius matches the textarea's
  // `rounded-[var(--radius-md)]` (same value used by the QuickAdd input).
  // Same Magic Colors styling as quickadd-input — feedback is a sibling
  // input affordance, so the visual character carries across.
  'feedback-input': {
    enabled: true,
    borderBeam: { ...MAGIC_COLORS_BEAM, borderRadius: 8 },
    particles: { ...MAGIC_COLORS_PARTICLES }
  }
}

/** Build a fresh surface config for `id`. Merges the global defaults with
 *  any THEME_1_SURFACE_OVERRIDES entry so baked surfaces ship pre-tuned;
 *  surfaces with no override return the all-disabled baseline. Pass no id
 *  to get the bare default (used by tests / backfills where the id is
 *  unknown). */
export function defaultSurfaceConfig(id?: SurfaceId): SurfaceConfig {
  const override = id ? THEME_1_SURFACE_OVERRIDES[id] : undefined
  return {
    enabled: override?.enabled ?? false,
    effect: 'border-beam',
    borderBeam: { ...DEFAULT_BORDER_BEAM_CONFIG, ...(override?.borderBeam ?? {}) },
    particles: { ...DEFAULT_PARTICLE_CONFIG, ...(override?.particles ?? {}) },
    burst: { ...DEFAULT_BURST_CONFIG, ...(override?.burst ?? {}) },
    triggers: { ...DEFAULT_TRIGGER_CONFIG, events: [], ...(override?.triggers ?? {}) }
  }
}

export function defaultThemesState(): ThemesState {
  const surfaces = {} as Record<SurfaceId, SurfaceConfig>
  for (const id of SURFACE_IDS) surfaces[id] = defaultSurfaceConfig(id)
  // Master defaults to ON: Theme 1 ships with the entry-form glow visible
  // out of the box. Users can flip it off in Settings → Themes.
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    masterEnabled: true,
    activeTheme: 'border-beam',
    surfaces,
    effects: { ...DEFAULT_EFFECTS_CONFIG },
    // 'dark' default preserves v0.1.7 behavior. Users opt into 'light'
    // or 'auto' via Settings → Appearance (features-lane PR).
    appearance: 'dark'
  }
}

export interface ThemeAttribution {
  themeId: ThemeId
  /** Public-facing theme name shown in Settings. The internal `themeId`
   *  stays a stable code identifier; this is what users read. */
  displayName: string
  author: string
  authorUrl?: string
  packageName?: string
  packageUrl?: string
  playgroundUrl?: string
  license: string
  description: string
}

export const THEME_ATTRIBUTIONS: Record<ThemeId, ThemeAttribution> = {
  'border-beam': {
    themeId: 'border-beam',
    displayName: 'Magic Colors',
    author: 'Jakub Antalik',
    authorUrl: 'https://github.com/Jakubantalik',
    packageName: 'border-beam',
    packageUrl: 'https://github.com/Jakubantalik/border-beam',
    playgroundUrl: 'https://beam.jakubantalik.com/',
    license: 'MIT',
    description:
      'Animated glows and sparks to bring life to focused areas. This will be a premium feature. Free for my beloved testers :) Thanks guys ♡'
  }
}

// A named, persisted dev-panel preset. Surface-scoped so users can build a
// library per surface (e.g., "soft cyan" for list-item, "burst-on-add" for
// list-add-new).
export interface ThemeDevPreset {
  id: string
  surfaceId: SurfaceId
  label: string
  config: SurfaceConfig
  createdAt: string
  updatedAt: string
}

export interface ThemeDevPresetsState {
  schemaVersion: 1
  presets: ThemeDevPreset[]
}

export function defaultThemeDevPresetsState(): ThemeDevPresetsState {
  return { schemaVersion: 1, presets: [] }
}

// ── IPC surface ─────────────────────────────────────────────────

export interface ThemesAPI {
  /** Snapshot the persisted themes state. */
  get: () => Promise<ThemesState>
  /** Master switch — gates every surface regardless of per-surface flags. */
  setMasterEnabled: (enabled: boolean) => Promise<ThemesState>
  /** Toggle one surface on/off. */
  setSurfaceEnabled: (surfaceId: SurfaceId, enabled: boolean) => Promise<ThemesState>
  /** Replace one surface's full config (used by dev panel + Themes tab presets). */
  setSurfaceConfig: (surfaceId: SurfaceId, config: SurfaceConfig) => Promise<ThemesState>
  /** Patch the top-level effects namespace. Partial — only listed fields
   *  are overwritten; others preserved. Currently used by the Phase 0
   *  dev-bg darkness slider; expected to retire alongside `EffectsConfig`. */
  setEffects: (partial: Partial<EffectsConfig>) => Promise<ThemesState>
  /** Set the user-facing appearance mode. Wired from Settings → Appearance
   *  (features lane). Renderer mirrors onto <html data-appearance>; CSS
   *  switches Layer 2 tokens via attribute selector + media query. */
  setAppearance: (appearance: Appearance) => Promise<ThemesState>
  /** Reset to defaults — useful escape hatch during experimentation. */
  reset: () => Promise<ThemesState>
  /** Fired whenever any window mutates the themes state. Receives the full new state. */
  onChanged: (callback: (state: ThemesState) => void) => () => void
}

/** API for the pre-warmed QuickAdd window — replaces the closeWindow path
 *  and adds show/hidden events the renderer can listen to for state-reset. */
export interface QuickAddAPI {
  /** Subscribe to show events from main. Fires each time the user summons
   *  the QuickAdd window. The handler should reset the form state (clear
   *  text, set selectedListId from the payload, clear dropdown, increment
   *  the motion.div key for fade-up replay). Returns an unsubscribe fn. */
  onShow: (callback: (payload: { listId: string }) => void) => () => void
  /** Subscribe to hidden events from main. Fires when main is about to
   *  hide the window (via Esc/submit hide path or shortcut-toggle). The
   *  handler should unmount the form contents synchronously so a
   *  subsequent show doesn't briefly flash stale content. */
  onHidden: (callback: () => void) => () => void
  /** Hide the pre-warmed QuickAdd window. Renderer stays alive. */
  hide: () => Promise<void>
  /** Tell main "I just added this item from the entry form." Main
   *  re-broadcasts to every renderer as 'quickadd:item-added' so any
   *  open list window whose `listId` matches the payload can scroll
   *  the new item into view. The data-changed broadcast that already
   *  fires on createItem reconciles the list contents — this is a
   *  pure UX hint, not a persistence signal. */
  notifyItemAdded: (itemId: string, listId: string) => Promise<void>
  /** Subscribe to entry-form item-added broadcasts. The handler should
   *  scroll the matching item into view if it belongs to this window's
   *  active list. Returns an unsubscribe fn. */
  onItemAdded: (
    callback: (payload: { itemId: string; listId: string }) => void
  ) => () => void
}

export interface ThemeEventsAPI {
  /** Subscribe to broadcasted theme events from the main process. Receives
   *  the full payload (name + optional metadata like itemId). Returns
   *  an unsubscribe function. */
  onEvent: (callback: (payload: ThemeEventPayload) => void) => () => void
  /** Ask main to broadcast a named theme event — used by the dev panel's
   *  "Test fire" button. */
  fire: (name: ThemeEventName) => Promise<void>
}

export interface ThemeDevAPI {
  /** Open the dev controls panel window (creates if missing, focuses if open). */
  openPanel: () => Promise<void>
  /** Close the dev controls panel window if open. */
  closePanel: () => Promise<void>
  /** Whether the dev panel window is currently open. */
  isPanelOpen: () => Promise<boolean>
  /** Read the full preset library. */
  listPresets: () => Promise<ThemeDevPreset[]>
  /** Save a new preset. Generates id + timestamps. */
  savePreset: (surfaceId: SurfaceId, label: string, config: SurfaceConfig) => Promise<ThemeDevPreset>
  /** Update an existing preset's label and/or config. */
  updatePreset: (
    id: string,
    updates: Partial<Pick<ThemeDevPreset, 'label' | 'config'>>
  ) => Promise<ThemeDevPreset>
  /** Delete a preset by id. */
  deletePreset: (id: string) => Promise<void>
}
