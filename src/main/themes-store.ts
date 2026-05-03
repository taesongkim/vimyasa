// Persistence for the production themes state (Settings → Themes) and the
// dev panel's saved-preset library. Two separate electron-store files so the
// dev presets can be wiped without losing the user's chosen Themes settings.

import Store from 'electron-store'
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_BORDER_BEAM_CONFIG,
  DEFAULT_PARTICLE_CONFIG,
  DEFAULT_BURST_CONFIG,
  DEFAULT_TRIGGER_CONFIG,
  defaultThemesState,
  defaultThemeDevPresetsState,
  defaultSurfaceConfig,
  SURFACE_IDS,
  type ThemesState,
  type ThemeDevPresetsState,
  type ThemeDevPreset,
  type SurfaceId,
  type SurfaceConfig
} from '../shared/themes'

// ── Themes (production) ─────────────────────────────────────────

export const themesStore = new Store<ThemesState>({
  name: 'themes',
  defaults: defaultThemesState()
})

/** Read full state. Backfills any missing surface entries (e.g. when a new
 *  surface is added in a future build) and any missing borderBeam fields
 *  on existing entries (e.g. fork-only fields like borderWidth that landed
 *  after a user already had persisted state). Renderer never sees undefined
 *  for required fields. */
export function getThemesState(): ThemesState {
  const raw: ThemesState = {
    schemaVersion: themesStore.get('schemaVersion'),
    masterEnabled: themesStore.get('masterEnabled'),
    activeTheme: themesStore.get('activeTheme'),
    surfaces: themesStore.get('surfaces')
  }
  let mutated = false
  let surfaces = { ...raw.surfaces } as Record<SurfaceId, SurfaceConfig>

  // ── v1 → v2 migration ──────────────────────────────────────────
  // Theme 1 (Border Beam) is baked into surface defaults: `quickadd-input`
  // gets the tuned config and master flips on. For users (or dev installs)
  // whose store was written before v2, re-apply just those two changes;
  // leave any other surfaces' state alone so existing dev tuning isn't
  // clobbered.
  let schemaVersion = raw.schemaVersion
  let masterEnabled = raw.masterEnabled
  if (schemaVersion < CURRENT_SCHEMA_VERSION) {
    surfaces = { ...surfaces, 'quickadd-input': defaultSurfaceConfig('quickadd-input') }
    masterEnabled = true
    schemaVersion = CURRENT_SCHEMA_VERSION
    mutated = true
  }

  for (const id of SURFACE_IDS) {
    if (!surfaces[id]) {
      surfaces[id] = defaultSurfaceConfig(id)
      mutated = true
      continue
    }
    // Backfill any missing borderBeam / particles fields so the renderer
    // always sees a fully-typed config (covers users whose persisted state
    // predates a schema addition).
    const cur = surfaces[id]
    const savedExtras = (cur.borderBeam as Record<string, unknown> | undefined)?.extraBeams
    const backfilledBeam: SurfaceConfig['borderBeam'] = {
      ...DEFAULT_BORDER_BEAM_CONFIG,
      ...(cur.borderBeam ?? {}),
      // extraBeams is an array — preserve user's saved layers when present,
      // otherwise default to empty (single-beam, matches upstream). For each
      // saved layer, backfill any missing fields against ExtraBeam defaults
      // so additions like `startAngle` land as 0 on pre-existing presets
      // instead of leaking undefined into the dev-panel slider.
      extraBeams:
        savedExtras !== undefined
          ? (savedExtras as SurfaceConfig['borderBeam']['extraBeams']).map((eb) => ({
              enabled: true,
              duration: 2.4,
              beamLength: 28,
              strength: 1,
              startAngle: 0,
              ...eb
            }))
          : DEFAULT_BORDER_BEAM_CONFIG.extraBeams
    }
    const backfilledParticles: SurfaceConfig['particles'] = {
      ...DEFAULT_PARTICLE_CONFIG,
      ...(cur.particles ?? {}),
      // Nested array fields don't merge cleanly via spread — explicitly
      // backfill `layers` only when missing, so user's saved layer
      // configs (when present) survive a schema additions later.
      layers:
        (cur.particles as Record<string, unknown> | undefined)?.layers !== undefined
          ? (cur.particles as SurfaceConfig['particles']).layers
          : DEFAULT_PARTICLE_CONFIG.layers
    }
    const backfilledBurst: SurfaceConfig['burst'] = {
      ...DEFAULT_BURST_CONFIG,
      ...(cur.burst ?? {})
    }
    const backfilledTriggers: SurfaceConfig['triggers'] = {
      ...DEFAULT_TRIGGER_CONFIG,
      ...(cur.triggers ?? {}),
      // events is an array — preserve user's saved list when present.
      events:
        (cur.triggers as Record<string, unknown> | undefined)?.events !== undefined
          ? (cur.triggers as SurfaceConfig['triggers']).events
          : DEFAULT_TRIGGER_CONFIG.events
    }
    const beamMissing =
      cur.borderBeam == null ||
      Object.keys(backfilledBeam).some(
        (k) => (cur.borderBeam as Record<string, unknown>)?.[k] === undefined
      )
    const particlesMissing =
      cur.particles == null ||
      Object.keys(backfilledParticles).some(
        (k) => (cur.particles as Record<string, unknown> | undefined)?.[k] === undefined
      )
    const burstMissing =
      cur.burst == null ||
      Object.keys(backfilledBurst).some(
        (k) => (cur.burst as Record<string, unknown> | undefined)?.[k] === undefined
      )
    const triggersMissing =
      cur.triggers == null ||
      Object.keys(backfilledTriggers).some(
        (k) => (cur.triggers as Record<string, unknown> | undefined)?.[k] === undefined
      )
    if (beamMissing || particlesMissing || burstMissing || triggersMissing) {
      surfaces[id] = {
        ...cur,
        borderBeam: backfilledBeam,
        particles: backfilledParticles,
        burst: backfilledBurst,
        triggers: backfilledTriggers
      }
      mutated = true
    }
  }
  if (mutated) {
    themesStore.set('schemaVersion', schemaVersion)
    themesStore.set('masterEnabled', masterEnabled)
    themesStore.set('surfaces', surfaces)
    return { ...raw, schemaVersion, masterEnabled, surfaces }
  }
  return raw
}

export function setThemesState(next: ThemesState): ThemesState {
  themesStore.set('schemaVersion', next.schemaVersion)
  themesStore.set('masterEnabled', next.masterEnabled)
  themesStore.set('activeTheme', next.activeTheme)
  themesStore.set('surfaces', next.surfaces)
  return next
}

export function resetThemesState(): ThemesState {
  return setThemesState(defaultThemesState())
}

// ── Dev presets ─────────────────────────────────────────────────

export const devPresetsStore = new Store<ThemeDevPresetsState>({
  name: 'theme-dev-presets',
  defaults: defaultThemeDevPresetsState()
})

export function listDevPresets(): ThemeDevPreset[] {
  return devPresetsStore.get('presets')
}

export function setDevPresets(presets: ThemeDevPreset[]): void {
  devPresetsStore.set('presets', presets)
}

/** A snapshot of the current themes state encoded as a single argv flag,
 *  to be passed via `webPreferences.additionalArguments` when creating
 *  any BrowserWindow that mounts the renderer. The preload script picks
 *  it up from process.argv and exposes it as `window.themesInitial`, so
 *  the renderer's themes store can initialize SYNCHRONOUSLY on first
 *  render — no async hydration roundtrip, no first-render-without-glow
 *  followed by remount. Keeps fade-up animations from being interrupted
 *  by hydration completing mid-flight. */
export function getThemesPreloadArg(): string {
  return `--themes-initial=${JSON.stringify(getThemesState())}`
}
