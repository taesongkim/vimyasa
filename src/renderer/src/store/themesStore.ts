// Renderer-side zustand store for theme settings. The initial state comes
// from `window.themesInitial` — a snapshot main passes via the preload
// script's argv handoff (see main/themes-store.ts: getThemesPreloadArg).
// This makes hydration SYNCHRONOUS on first render: GlowSurface knows the
// right wrap mode immediately, so motion.div doesn't get remounted by an
// async hydration arriving mid-fade and restarting the animation.
//
// Cross-window updates still flow over IPC: the onChanged subscription
// installs once at store creation and overwrites local state on each
// broadcast.

import { create } from 'zustand'
import {
  defaultThemesState,
  type EffectsConfig,
  type SurfaceConfig,
  type SurfaceId,
  type ThemesState
} from '@shared/themes'

interface ThemesStoreState extends ThemesState {
  hydrated: boolean
  /** No-op now — kept so existing call sites (App.tsx) don't break. The
   *  initial state arrived via preload; cross-window updates flow via the
   *  onChanged subscription installed at store creation. */
  hydrate: () => Promise<void>
  setMasterEnabled: (enabled: boolean) => Promise<void>
  setSurfaceEnabled: (surfaceId: SurfaceId, enabled: boolean) => Promise<void>
  setSurfaceConfig: (surfaceId: SurfaceId, config: SurfaceConfig) => Promise<void>
  setEffects: (partial: Partial<EffectsConfig>) => Promise<void>
  reset: () => Promise<void>
}

/** Mirror selected `effects` fields onto `<html>` as CSS variables so
 *  globals.css can compose them into rules like `.glass-surface`'s
 *  background. Runs once on initial state read and again on every
 *  cross-window broadcast — every renderer in this Electron process
 *  picks up the new value live, no reload needed.
 *
 *  Currently only `--bg-base-a` is mirrored (Phase 0 dev-bg slider —
 *  alpha for the pure-black overlay over vibrancy). When Phase 1's
 *  proper token system lands, this whole helper either retires or
 *  expands to mirror the full token set. */
function applyEffectsToDOM(effects: EffectsConfig): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--bg-base-a', String(effects.devBgBaseA))
}

// Read the preload-injected snapshot synchronously. Only null if the
// preload didn't run for this window (shouldn't happen in normal flow).
function readInitial(): ThemesState {
  const injected = window.themesInitial
  return injected ?? defaultThemesState()
}

export const useThemesStore = create<ThemesStoreState>((set) => {
  const initial = readInitial()
  // Mirror onto `<html>` ASAP so the first paint already has the right
  // background lightness (no flash from default → user value).
  applyEffectsToDOM(initial.effects)

  // Install the cross-window broadcast subscription exactly once, when the
  // store is first created in this renderer. Each renderer's window has its
  // own subscription. Lives until the renderer exits — no cleanup needed.
  if (typeof window !== 'undefined' && window.api?.themes?.onChanged) {
    window.api.themes.onChanged((next) => {
      applyEffectsToDOM(next.effects)
      set({ ...next })
    })
  }

  return {
    ...initial,
    hydrated: true,

    hydrate: async () => {
      // No-op — initial state arrived synchronously via window.themesInitial
      // (set by the preload script from main's argv flag), and the
      // cross-window onChanged subscription is installed at store creation
      // above. Kept on the API so existing call sites (App.tsx) compile
      // unchanged; consider removing once those callers are updated.
    },

    setMasterEnabled: async (enabled) => {
      const next = await window.api.themes.setMasterEnabled(enabled)
      applyEffectsToDOM(next.effects)
      set({ ...next })
    },

    setSurfaceEnabled: async (surfaceId, enabled) => {
      const next = await window.api.themes.setSurfaceEnabled(surfaceId, enabled)
      applyEffectsToDOM(next.effects)
      set({ ...next })
    },

    setSurfaceConfig: async (surfaceId, config) => {
      const next = await window.api.themes.setSurfaceConfig(surfaceId, config)
      applyEffectsToDOM(next.effects)
      set({ ...next })
    },

    setEffects: async (partial) => {
      const next = await window.api.themes.setEffects(partial)
      applyEffectsToDOM(next.effects)
      set({ ...next })
    },

    reset: async () => {
      const next = await window.api.themes.reset()
      applyEffectsToDOM(next.effects)
      set({ ...next })
    }
  }
})
