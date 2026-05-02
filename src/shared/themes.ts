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
  /** Per-blob color override (advanced). Length up to 9 (md size has 9
   *  border blobs; sm has 8). Each slot replaces the matching blob's
   *  color in the rotating beam; null preserves the variant default for
   *  that slot. Position and size inherit from the variant — only color
   *  is editable from the dev panel. Undefined = no override applied. */
  paletteOverride?: (string | null)[]
}

// One configured effect stack per surface. Future effect layers (particles,
// perimeter-rotate, burst) get added as optional fields here.
export interface SurfaceConfig {
  enabled: boolean
  effect: 'border-beam'
  borderBeam: BorderBeamConfig
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
  beamLength: 28
}

export function defaultSurfaceConfig(): SurfaceConfig {
  return {
    enabled: false,
    effect: 'border-beam',
    borderBeam: { ...DEFAULT_BORDER_BEAM_CONFIG }
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
