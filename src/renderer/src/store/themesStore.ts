// Renderer-side zustand store for theme settings. Mirrors the persisted
// state on the main side; mutations round-trip through IPC and broadcast
// back so every window stays in sync.

import { create } from 'zustand'
import {
  defaultThemesState,
  type SurfaceConfig,
  type SurfaceId,
  type ThemesState
} from '@shared/themes'

interface ThemesStoreState extends ThemesState {
  hydrated: boolean
  hydrate: () => Promise<void>
  setMasterEnabled: (enabled: boolean) => Promise<void>
  setSurfaceEnabled: (surfaceId: SurfaceId, enabled: boolean) => Promise<void>
  setSurfaceConfig: (surfaceId: SurfaceId, config: SurfaceConfig) => Promise<void>
  reset: () => Promise<void>
}

export const useThemesStore = create<ThemesStoreState>((set) => ({
  ...defaultThemesState(),
  hydrated: false,

  hydrate: async () => {
    const state = await window.api.themes.get()
    set({ ...state, hydrated: true })
    // Broadcast subscription — main process pushes the full new state
    // whenever any window mutates. We just overwrite locally.
    window.api.themes.onChanged((next) => {
      set({ ...next })
    })
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
}))
