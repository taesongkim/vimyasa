import { nativeTheme } from 'electron'
import type { Appearance } from '../shared/themes'

// Wire Electron's `nativeTheme.themeSource` to the user's persisted
// Settings → Appearance value. Two callers:
//
//   1. `main/index.ts` at startup — applies the persisted value before
//      any windows are created, so vibrancy + the renderer's
//      `prefers-color-scheme` media queries pick the right side from
//      the first paint.
//   2. `main/ipc.ts` inside the `themes:setAppearance` handler — updates
//      on every user change, so Auto mode follows OS Light↔Dark toggles
//      live (nativeTheme.themeSource = 'system' makes Electron pass the
//      OS setting through to WebViews).
//
// Mapping — the renderer's `Appearance` type ('light' | 'dark' | 'auto')
// doesn't line up 1:1 with Electron's `themeSource` ('system' | 'light'
// | 'dark'); we map 'auto' → 'system'. The vibrancy match-with-CSS
// concern that pinned this to 'dark' pre-Phase-2 is addressed by the
// Phase 2 light-mode palette + the renderer's data-appearance attribute
// on `<html>`; the OS/vibrancy side now genuinely matches what the CSS
// paints.
export function applyNativeThemeSource(appearance: Appearance): void {
  nativeTheme.themeSource = appearance === 'auto' ? 'system' : appearance
}
