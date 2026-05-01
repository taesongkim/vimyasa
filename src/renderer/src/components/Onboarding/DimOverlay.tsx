import { useState, useEffect, useMemo, type CSSProperties } from 'react'

// Renders inside the dim BrowserWindow (route #/onboarding-dim). Layers:
//   1. Window background = transparent + CSS rgba(0,0,0,0.75) on .onb-dim
//      → desktop visible at ~25% through the dim
//   2. Animated dot grid (.onb-dot-grid) → ambient ripple sweep
//   3. Dismiss-dim button (top-right)
//
// Mouse events on the dim itself are ignored; only the dismiss button
// is interactive. Window is focusable: false so keystrokes pass through
// to the host windows the tour is teaching.
//
// The values below were dialed in via the iteration panel that used to
// live here. If you want to tune them again, see git history for the
// SliderRow + ControlsPanel UI.
const DOT_SIZE = 2
const SPACING = 16
const BASE_OPACITY = 0.2
const PEAK_OPACITY = 1
const RIPPLE_DURATION_S = 1

export function DimOverlay(): JSX.Element {
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900
  })

  useEffect(() => {
    const onResize = (): void => {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Mount the dot grid only AFTER main signals that the dim window has
  // actually been shown. The Page Visibility API (document.hidden) isn't
  // reliable for this in Electron — a BrowserWindow with show:false is
  // not "hidden" in Chromium's tab-visibility sense, so document.hidden
  // is false during pre-warm. Instead, the main process emits an
  // 'onboarding:dim-shown' IPC every time it calls win.show(), and we
  // gate on that. Result: dot CSS animations start fresh in a visible
  // context, so the negative random delays put each dot at a different
  // phase from the very first frame the user sees.
  const [dotsMounted, setDotsMounted] = useState(false)
  const [dotsReady, setDotsReady] = useState(false)

  useEffect(() => {
    return window.api.onboarding.onDimShown(() => {
      setDotsMounted(true)
    })
  }, [])

  useEffect(() => {
    if (!dotsMounted) return
    // rAF twice — first commits the mount, second fires the transition.
    // Without this the browser can collapse both state changes into one
    // paint and skip the transition entirely.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setDotsReady(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [dotsMounted])

  // Compute the grid of dots from the constants. Memoized so we only
  // rebuild the array when the viewport actually changes — the random
  // phases stay stable between renders.
  const dots = useMemo(() => {
    const cols = Math.ceil(viewport.w / SPACING) + 1
    const rows = Math.ceil(viewport.h / SPACING) + 1
    const out: { x: number; y: number; delay: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: c * SPACING,
          y: r * SPACING,
          // Random phase offset within one full cycle. Every dot is
          // animating from t=0; the random delay just puts each at a
          // different point in the cycle. Net effect: a shimmering field
          // of independent ripples — bird's-eye-view-of-sunlight-on-water.
          delay: -Math.random() * RIPPLE_DURATION_S * 1000
        })
      }
    }
    return out
  }, [viewport.w, viewport.h])

  const dismiss = (): void => {
    void window.api.onboarding.dismissDim()
  }

  return (
    <div className="onb-dim">
      {dotsMounted && (
        <div className={`onb-dot-grid ${dotsReady ? 'is-ready' : ''}`}>
          {dots.map((d, i) => {
            const style: CSSProperties = {
              left: `${d.x}px`,
              top: `${d.y}px`,
              width: `${DOT_SIZE}px`,
              height: `${DOT_SIZE}px`,
              animationDuration: `${RIPPLE_DURATION_S}s`,
              animationDelay: `${d.delay}ms`,
              ['--dot-base-opacity' as string]: BASE_OPACITY,
              ['--dot-peak-opacity' as string]: PEAK_OPACITY
            }
            return <span key={i} className="onb-dot" style={style} />
          })}
        </div>
      )}

      <button
        type="button"
        className="onb-dim-close"
        onClick={dismiss}
        title="Tour continues without the dim"
      >
        Dismiss Background Dim for Tour
      </button>
    </div>
  )
}
