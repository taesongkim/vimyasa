// Persistence for the production themes state (Settings → Themes) and the
// dev panel's saved-preset library. Two separate electron-store files so the
// dev presets can be wiped without losing the user's chosen Themes settings.

import Store from 'electron-store'
import {
  DEFAULT_BORDER_BEAM_CONFIG,
  DEFAULT_PARTICLE_CONFIG,
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
  const surfaces = { ...raw.surfaces } as Record<SurfaceId, SurfaceConfig>
  for (const id of SURFACE_IDS) {
    if (!surfaces[id]) {
      surfaces[id] = defaultSurfaceConfig()
      mutated = true
      continue
    }
    // Backfill any missing borderBeam / particles fields so the renderer
    // always sees a fully-typed config (covers users whose persisted state
    // predates a schema addition).
    const cur = surfaces[id]
    const backfilledBeam: SurfaceConfig['borderBeam'] = {
      ...DEFAULT_BORDER_BEAM_CONFIG,
      ...(cur.borderBeam ?? {})
    }
    const backfilledParticles: SurfaceConfig['particles'] = {
      ...DEFAULT_PARTICLE_CONFIG,
      ...(cur.particles ?? {})
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
    if (beamMissing || particlesMissing) {
      surfaces[id] = {
        ...cur,
        borderBeam: backfilledBeam,
        particles: backfilledParticles
      }
      mutated = true
    }
  }
  if (mutated) {
    themesStore.set('surfaces', surfaces)
    return { ...raw, surfaces }
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
