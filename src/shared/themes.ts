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

export const SURFACE_IDS: readonly SurfaceId[] = [
  'quickadd-window',
  'quickadd-input',
  'list-window',
  'list-item',
  'list-item-edit',
  'list-add-new',
  'welcome-callout-window',
  'welcome-callout-start-button'
] as const

export const SURFACE_LABELS: Record<SurfaceId, string> = {
  'quickadd-window': 'Entry form window',
  'quickadd-input': 'Entry form input',
  'list-window': 'List window',
  'list-item': 'List item',
  'list-item-edit': 'List item — edit field',
  'list-add-new': 'Add new item field',
  'welcome-callout-window': 'Welcome callout window',
  'welcome-callout-start-button': 'Welcome callout — Start Tour button'
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
  /** Stacked secondary beams (up to 3) layered on top of the primary, each
   *  with its own rotation duration, beam length, and strength. They share
   *  the primary's color variant + palette so the family stays coherent;
   *  use them to make multiple streaks meet and diverge at different rates.
   *  Empty array = single-beam (default). */
  extraBeams: ExtraBeam[]
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

export interface ThemesState {
  schemaVersion: 1
  /** Master switch. When false, no surface renders any glow regardless of per-surface flags. */
  masterEnabled: boolean
  activeTheme: ThemeId
  surfaces: Record<SurfaceId, SurfaceConfig>
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

export function defaultSurfaceConfig(): SurfaceConfig {
  return {
    enabled: false,
    effect: 'border-beam',
    borderBeam: { ...DEFAULT_BORDER_BEAM_CONFIG },
    particles: { ...DEFAULT_PARTICLE_CONFIG },
    burst: { ...DEFAULT_BURST_CONFIG },
    triggers: { ...DEFAULT_TRIGGER_CONFIG, events: [] }
  }
}

export function defaultThemesState(): ThemesState {
  const surfaces = {} as Record<SurfaceId, SurfaceConfig>
  for (const id of SURFACE_IDS) surfaces[id] = defaultSurfaceConfig()
  return {
    schemaVersion: 1,
    masterEnabled: false,
    activeTheme: 'border-beam',
    surfaces
  }
}

export interface ThemeAttribution {
  themeId: ThemeId
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
    author: 'Jakub Antalik',
    authorUrl: 'https://github.com/Jakubantalik',
    packageName: 'border-beam',
    packageUrl: 'https://github.com/Jakubantalik/border-beam',
    playgroundUrl: 'https://beam.jakubantalik.com/',
    license: 'MIT',
    description: 'Animated CSS border beam — conic-gradient glow with optional hue-shift cycling.'
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
