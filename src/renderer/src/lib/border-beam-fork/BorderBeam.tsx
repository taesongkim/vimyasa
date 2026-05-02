// Forked from `border-beam` v1.0.1 (MIT, © Jakub Antalik). The CSS
// generators and color tables are vendored verbatim in ./source.js;
// this file replaces the package's React component with one that:
//   1. Lets us override `borderWidth`, `strokeOpacity`, `innerOpacity`,
//      `bloomOpacity`, and `innerShadow` directly — these are normally
//      pinned to the size enum's preset, which is what kept the size
//      slider feeling like 3 stops.
//   2. Removes the upper clamp on `strength` (was Math.max(0, Math.min(1, n)))
//      so the dev panel can push the effect past the package's "1.0 = full".
//
// Everything else mirrors the original: same auto-radius detection from
// the first child, same fade-in/out animation choreography, same
// dark-mode default. Returns the same DOM shape the original did so any
// CSS keyed off `[data-beam=...]` keeps working.

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type ForwardedRef,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode
} from 'react'
// @ts-expect-error — vendored JS source has no types; we describe its
// shape in BeamCSSOptions below and trust it.
import {
  generateBeamCSS,
  sizePresets,
  sizeThemePresets
} from './source.js'

export type BorderBeamSize = 'sm' | 'md' | 'line'
export type BorderBeamColorVariant = 'colorful' | 'mono' | 'ocean' | 'sunset'
export type BorderBeamTheme = 'dark' | 'light' | 'auto'

interface BeamCSSOptions {
  id: string
  borderRadius: number
  borderWidth: number
  duration: number
  strokeOpacity: number
  innerOpacity: number
  bloomOpacity: number
  innerShadow: string
  size: BorderBeamSize
  colorVariant: BorderBeamColorVariant
  staticColors: boolean
  brightness: number
  saturation: number
  hueRange: number
  theme: 'dark' | 'light'
  /** Percent of the perimeter the bright streak covers (sm/md only).
   *  28 ≈ upstream default; 100 = full uniform glow. */
  beamLength: number
  /** Optional per-blob color override. Up to 9 entries; null/undefined
   *  preserves the variant default for that blob. */
  paletteOverride?: (string | null)[]
  /** Inner-glow blob size multiplier (default 1). Tightens / loosens the
   *  inward gradient depth without moving the beam. */
  glowDepth: number
}

interface SizeThemePreset {
  strokeOpacity: number
  innerOpacity: number
  bloomOpacity: number
  innerShadow: string
  saturation: number
}
interface SizePreset {
  borderRadius: number
  borderWidth: number
}

const _sizePresets = sizePresets as Record<BorderBeamSize, SizePreset>
const _sizeThemePresets = sizeThemePresets as Record<
  BorderBeamSize,
  Record<'dark' | 'light', SizeThemePreset>
>
const _generateBeamCSS = generateBeamCSS as (opts: BeamCSSOptions) => string

export interface BorderBeamProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode
  size?: BorderBeamSize
  colorVariant?: BorderBeamColorVariant
  theme?: BorderBeamTheme
  staticColors?: boolean
  duration?: number
  active?: boolean
  borderRadius?: number
  brightness?: number
  saturation?: number
  hueRange?: number
  /** 0..N — multiplies all layer opacities. Original package clamped at 1; the
   *  fork allows >1 so the dev panel can over-saturate. Negative values are
   *  still clamped to 0. */
  strength?: number
  /** Override stroke thickness in px. When omitted, inherits from `size`'s
   *  preset (sm/md/line all default to 1). This is the knob that gives
   *  genuinely continuous size — the slider in the dev panel maps to this. */
  borderWidth?: number
  /** Override per-layer opacities. When omitted, inherits from sizeThemePresets. */
  strokeOpacity?: number
  innerOpacity?: number
  bloomOpacity?: number
  /** Override the inner-shadow color (any CSS color). */
  innerShadow?: string
  /** Bright-streak coverage as a percent of the perimeter (sm/md only).
   *  Defaults to 28 (≈ upstream behavior); set to 100 for a uniform
   *  full-perimeter glow with no rotating streak. */
  beamLength?: number
  /** Inset in CSS px from the wrapper edge — pulls the beam (and inner
   *  glow + bloom) inward by this amount. The wrapper itself stays full
   *  size; only the pseudo-element layers shrink. Default 0 = beam at the
   *  wrapper's edge. */
  beamInset?: number
  /** Per-blob color override. Up to 9 entries; null/undefined preserves
   *  the variant's default for that blob. Forwarded into the CSS generator. */
  paletteOverride?: (string | null)[]
  /** Inner-glow size multiplier (≈0.1–3, default 1). Scales the inner
   *  glow's radial-gradient blob sizes — lower tightens the glow toward
   *  the edge, higher lets it bleed further inward. Beam perimeter
   *  position is unchanged. */
  glowDepth?: number
  /** Extra content rendered as a sibling of children inside the BorderBeam
   *  wrapper (which has position:relative). Used by GlowSurface to mount
   *  the ParticleLayer canvas overlay so it inherits the wrapper's
   *  border-radius and clipping. */
  overlay?: React.ReactNode
  onActivate?: () => void
  onDeactivate?: () => void
}

function useSystemTheme(): 'dark' | 'light' {
  const [t, setT] = useState<'dark' | 'light'>(() =>
    typeof window === 'undefined' ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => setT(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return t
}

export const BorderBeam = forwardRef<HTMLDivElement, BorderBeamProps>(
  function BorderBeam(props, fwdRef: ForwardedRef<HTMLDivElement>) {
    const {
      children,
      size = 'md',
      colorVariant = 'colorful',
      theme = 'dark',
      staticColors = false,
      duration,
      active = true,
      borderRadius,
      brightness = 1.3,
      saturation,
      hueRange = 30,
      strength = 1,
      borderWidth,
      strokeOpacity,
      innerOpacity,
      bloomOpacity,
      innerShadow,
      beamLength = 28,
      beamInset = 0,
      paletteOverride,
      glowDepth = 1,
      overlay,
      className,
      style,
      onActivate,
      onDeactivate,
      onAnimationEnd: consumerOnAnimationEnd,
      ...rest
    } = props

    const baseId = useId()
    const id = baseId.replace(/:/g, '-')
    const systemTheme = useSystemTheme()
    const internalRef = useRef<HTMLDivElement | null>(null)
    const [isActive, setIsActive] = useState(active)
    const [isFading, setIsFading] = useState(false)
    const [detectedRadius, setDetectedRadius] = useState<number | null>(null)

    // Auto-detect radius from first child (matches package behavior).
    useEffect(() => {
      if (borderRadius != null) return
      const el = internalRef.current
      if (!el) return
      const detect = (): void => {
        const child = el.firstElementChild
        if (!child) return
        const computed = getComputedStyle(child as Element)
        const r = parseFloat(computed.borderTopLeftRadius)
        if (!isNaN(r) && r > 0) setDetectedRadius(r)
      }
      detect()
      const obs = new MutationObserver(detect)
      obs.observe(el, { childList: true, subtree: false })
      return () => obs.disconnect()
    }, [borderRadius, children])

    useEffect(() => {
      if (active && !isActive && !isFading) setIsActive(true)
      else if (!active && isActive && !isFading) setIsFading(true)
    }, [active, isActive, isFading])

    const handleAnimEnd = useCallback(
      (e: AnimationEvent<HTMLDivElement>) => {
        const name = e.animationName
        if (name.includes('fade-out')) {
          setIsActive(false)
          setIsFading(false)
          onDeactivate?.()
        } else if (name.includes('fade-in')) {
          onActivate?.()
        }
        consumerOnAnimationEnd?.(e)
      },
      [onActivate, onDeactivate, consumerOnAnimationEnd]
    )

    const resolvedTheme: 'dark' | 'light' = theme === 'auto' ? systemTheme : theme
    const themePreset = _sizeThemePresets[size][resolvedTheme]
    const sizePreset = _sizePresets[size]

    const finalBorderRadius = borderRadius ?? detectedRadius ?? sizePreset.borderRadius
    const finalBorderWidth = borderWidth ?? sizePreset.borderWidth
    const finalDuration = duration ?? (size === 'line' ? 2.4 : 1.96)
    const finalSaturation = saturation ?? themePreset.saturation
    const finalHueRange = size === 'line' ? Math.min(hueRange, 13) : hueRange
    const finalStaticColors = colorVariant === 'mono' ? true : staticColors
    const finalStrokeOpacity = strokeOpacity ?? themePreset.strokeOpacity
    const finalInnerOpacity = innerOpacity ?? themePreset.innerOpacity
    const finalBloomOpacity = bloomOpacity ?? themePreset.bloomOpacity
    const finalInnerShadow = innerShadow ?? themePreset.innerShadow

    const cssStyles = useMemo(
      () =>
        _generateBeamCSS({
          id,
          borderRadius: finalBorderRadius,
          borderWidth: finalBorderWidth,
          duration: finalDuration,
          strokeOpacity: finalStrokeOpacity,
          innerOpacity: finalInnerOpacity,
          bloomOpacity: finalBloomOpacity,
          innerShadow: finalInnerShadow,
          size,
          colorVariant,
          staticColors: finalStaticColors,
          brightness,
          saturation: finalSaturation,
          hueRange: finalHueRange,
          theme: resolvedTheme,
          beamLength,
          paletteOverride,
          glowDepth
        }),
      [
        id,
        finalBorderRadius,
        finalBorderWidth,
        finalDuration,
        finalStrokeOpacity,
        finalInnerOpacity,
        finalBloomOpacity,
        finalInnerShadow,
        size,
        colorVariant,
        finalStaticColors,
        brightness,
        finalSaturation,
        finalHueRange,
        resolvedTheme,
        beamLength,
        glowDepth,
        // useMemo deps must be primitives or stable references. Stringify the
        // override so identity changes when the user tweaks any blob color.
        paletteOverride ? paletteOverride.join('|') : ''
      ]
    )

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node
        if (typeof fwdRef === 'function') fwdRef(node)
        else if (fwdRef) (fwdRef as MutableRefObject<HTMLDivElement | null>).current = node
      },
      [fwdRef]
    )

    // Strength clamp: only the floor at 0. Original package also clamped at 1
    // — we leave the upper end open so the dev panel can over-drive.
    const mergedStyle: CSSProperties = {
      ...(style ?? {}),
      ['--beam-strength' as string]: Math.max(0, strength)
    }
    // beamInset is currently a no-op — schema field kept so older presets
    // load cleanly, but the CSS-variable wiring it depended on caused
    // visual regressions and is reverted. We'll re-introduce as a
    // "glow depth inward" knob via a different mechanism (radial-gradient
    // softness on the inner layer rather than inset/clip-path surgery).
    void beamInset

    return (
      <>
        <style>{cssStyles}</style>
        <div
          {...rest}
          ref={setRefs}
          data-beam={id}
          data-active={isActive && !isFading ? '' : undefined}
          data-fading={isFading ? '' : undefined}
          className={className}
          style={mergedStyle}
          onAnimationEnd={handleAnimEnd}
        >
          {children}
          <div data-beam-bloom />
          {overlay}
        </div>
      </>
    )
  }
)

export default BorderBeam
