import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { BorderBeam } from '../../lib/border-beam-fork/BorderBeam'
import { paletteBlobsWithOverride } from '../../lib/border-beam-fork/palettes'
import { ParticleLayer } from './ParticleLayer'
import { useThemesStore } from '../../store/themesStore'
import { DEFAULT_BORDER_BEAM_CONFIG, type SurfaceId, type SurfaceConfig } from '@shared/themes'

interface GlowSurfaceProps {
  surface: SurfaceId
  /** 'wrap' (default): renders <BorderBeam>{children}</BorderBeam>. The
   *  BorderBeam wrapper div is layout-affecting — pass `style` to control
   *  its display/sizing.
   *
   *  'overlay': renders ONLY a positioned overlay containing the beam,
   *  no children pass-through. Drop the GlowSurface alongside the host's
   *  existing children so it sits as a sibling. The host must have
   *  `position: relative` and a defined `border-radius` so the overlay
   *  inherits both. Use this for surfaces where the glow should match an
   *  outer container without disturbing structural refs (e.g. dnd-kit
   *  setNodeRef on motion.div) or AnimatePresence exit transitions. */
  mode?: 'wrap' | 'overlay'
  children?: ReactNode
  style?: CSSProperties
  className?: string
}


function renderBeam(
  c: SurfaceConfig['borderBeam'],
  active: boolean,
  children: ReactNode,
  overlay: ReactNode,
  style?: CSSProperties,
  className?: string
) {
  return (
    <BorderBeam
      active={active}
      size={c.size}
      colorVariant={c.colorVariant}
      theme="dark"
      strength={c.strength}
      duration={c.duration}
      brightness={c.brightness}
      saturation={c.saturation}
      hueRange={c.hueRange}
      staticColors={c.staticColors}
      borderRadius={c.borderRadius}
      borderWidth={c.borderWidth}
      strokeOpacity={c.strokeOpacity}
      innerOpacity={c.innerOpacity}
      bloomOpacity={c.bloomOpacity}
      innerShadow={c.innerShadow}
      beamLength={c.beamLength}
      glowDepth={c.glowDepth}
      paletteOverride={c.paletteOverride}
      overlay={overlay}
      style={style}
      className={className}
    >
      {children}
    </BorderBeam>
  )
}

/** Wraps (or overlays) a target surface with the active theme's effect.
 *
 *  Wrap mode ALWAYS mounts BorderBeam; the `active` prop drives the
 *  fade-in/out animations. This keeps DOM identity stable so descendants
 *  (e.g. the QuickAdd input that auto-focuses on mount) don't lose their
 *  state when themes hydrate or the per-surface toggle flips.
 *
 *  Overlay mode keeps conditional rendering — the overlay is a sibling
 *  (pointer-events:none) so it can come and go without affecting the
 *  host's children.
 *
 *  Particle layer (when enabled) composes alongside the beam — inside the
 *  BorderBeam wrapper for wrap mode, inside the overlay div for overlay
 *  mode. Either way it inherits border-radius and clipping from its parent. */
export function GlowSurface({
  surface,
  children,
  mode = 'wrap',
  style,
  className
}: GlowSurfaceProps) {
  const masterEnabled = useThemesStore((s) => s.masterEnabled)
  const surfaceConfig = useThemesStore((s) => s.surfaces[surface])
  const hydrated = useThemesStore((s) => s.hydrated)

  const baseActive = hydrated && masterEnabled && (surfaceConfig?.enabled ?? false)
  const burst = surfaceConfig?.burst
  const burstEnabled = baseActive && (burst?.enabled ?? false)

  // Burst pulse: when enabled, toggles burstPulse between true/false on a
  // setTimeout cycle. The beam's own fade-in/out animations carry the
  // visual smoothing; we just flip `active` on schedule. When burst is
  // off, burstPulse stays true so it's a no-op multiplier.
  const [burstPulse, setBurstPulse] = useState(true)
  useEffect(() => {
    if (!burstEnabled || !burst) {
      setBurstPulse(true)
      return
    }
    let id: number | undefined
    let on = true
    setBurstPulse(true)
    const tick = (): void => {
      on = !on
      setBurstPulse(on)
      id = window.setTimeout(tick, on ? burst.onMs : burst.offMs)
    }
    id = window.setTimeout(tick, burst.onMs)
    return () => {
      if (id != null) window.clearTimeout(id)
    }
  }, [burstEnabled, burst?.onMs, burst?.offMs])

  const active = baseActive && (!burstEnabled || burstPulse)
  const particles = surfaceConfig?.particles
  const showParticles = active && (particles?.enabled ?? false)
  // Pass the live palette blobs (with per-blob color overrides applied) to
  // the particle layer so its 'palette' spawn mode and 'auto' coloring stay
  // in sync with whatever the beam is rendering.
  const paletteBlobs = surfaceConfig
    ? paletteBlobsWithOverride(
        surfaceConfig.borderBeam.colorVariant,
        surfaceConfig.borderBeam.paletteOverride
      )
    : []

  const particleLayer =
    showParticles && particles ? (
      <ParticleLayer config={particles} paletteBlobs={paletteBlobs} />
    ) : null

  if (mode === 'overlay') {
    if (!baseActive) return null
    const c = surfaceConfig!.borderBeam
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius: 'inherit', ...style }}
      >
        {renderBeam(
          c,
          active,
          <div style={{ width: '100%', height: '100%' }} />,
          null,
          { width: '100%', height: '100%' },
          className
        )}
        {particleLayer}
      </div>
    )
  }

  // Wrap mode disabled: return children bare (no BorderBeam wrapper).
  // An always-mounted wrapper with overflow:hidden + border-radius inside
  // a vibrancy: under-window BrowserWindow can fail to composite the OS
  // backdrop and paint opaque black behind content. The QuickAdd focus
  // issue this used to fix is handled differently — see the focus
  // discussion in the next commit.
  if (!baseActive) {
    return <>{children}</>
  }
  const c = surfaceConfig!.borderBeam
  return renderBeam(c, active, children, particleLayer, style, className)
}
