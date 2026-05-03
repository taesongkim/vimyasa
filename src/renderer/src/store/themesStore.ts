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
  reset: () => Promise<void>
}

// Read the preload-injected snapshot synchronously. Only null if the
// preload didn't run for this window (shouldn't happen in normal flow).
function readInitial(): ThemesState {
  const injected = window.themesInitial
  return injected ?? defaultThemesState()
}

export const useThemesStore = create<ThemesStoreState>((set) => {
  const initial = readInitial()

  // Install the cross-window broadcast subscription exactly once, when the
  // store is first created in this renderer. Each renderer's window has its
  // own subscription. Lives until the renderer exits — no cleanup needed.
  if (typeof window !== 'undefined' && window.api?.themes?.onChanged) {
    window.api.themes.onChanged((next) => {
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
      set({ ...next })
    },

    setSurfaceEnabled: async (surfaceId, enabled) => {
      const next = await window.api.themes.setSurfaceEnabled(surfaceId, enabled)
      set({ ...next })
    },

    setSurfaceConfig: async (surfaceId, config) => {
      const next = await window.api.themes.setSurfaceConfig(surfaceId, config)
      set({ ...next })
    },

    reset: async () => {
      const next = await window.api.themes.reset()
      set({ ...next })
    }
  }
})
