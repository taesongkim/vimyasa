// Renderer-local fan-out for theme trigger events. Subscribes once to the
// main-process IPC ('theme:event'), then re-emits to any number of in-window
// listeners (typically GlowSurface instances). Avoids each GlowSurface
// installing its own ipcRenderer listener — one bridge, many subscribers.

import type { ThemeEventName } from '@shared/themes'

type Listener = (name: ThemeEventName) => void

class ThemeEventBus {
  private listeners = new Set<Listener>()
  private bridgeInstalled = false
  private removeBridge: (() => void) | undefined

  on(listener: Listener): () => void {
    this.installBridgeOnce()
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Useful for non-React callsites (none today) and for tests. */
  emit(name: ThemeEventName): void {
    this.listeners.forEach((l) => {
      try {
        l(name)
      } catch {
        // Swallow listener errors so one bad subscriber doesn't poison the rest.
      }
    })
  }

  private installBridgeOnce(): void {
    if (this.bridgeInstalled) return
    this.bridgeInstalled = true
    // Lazy: only attach the IPC listener when something actually subscribes.
    this.removeBridge = window.api.themeEvents.onEvent((name) => this.emit(name))
  }

  /** Currently never called — the renderer lives for the window's lifetime
   *  and the bridge is harmless to leave attached. Provided for symmetry. */
  dispose(): void {
    this.removeBridge?.()
    this.removeBridge = undefined
    this.bridgeInstalled = false
    this.listeners.clear()
  }
}

export const themeEvents = new ThemeEventBus()
