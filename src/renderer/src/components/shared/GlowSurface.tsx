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
   *  its display/sizing. Wrap mode ALWAYS mounts BorderBeam (with active
   *  driven by the per-surface flag) so descendants like the QuickAdd
   *  input keep focus across hydration.
   *
   *  'overlay': renders ONLY a positioned overlay containing the beam,
   *  no children pass-through. Drop the GlowSurface alongside the host's
   *  existing children so it sits as a sibling. The host must have
   *  `position: relative` and a defined `border-radius` so the overlay
   *  inherits both. Use this for surfaces where the glow should match an
   *  outer container without disturbing structural refs (e.g. dnd-kit
   *  setNodeRef on motion.div) or AnimatePresence exit transitions.
   *  Overlay mode bails to null when the surface is disabled — cheap. */
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
      beamInset={c.beamInset}
      paletteOverride={c.paletteOverride}
      overlay={overlay}
      style={style}
      className={className}
    >
      {children}
    </BorderBeam>
  )
}

export function GlowSurface({
  surface,
  children,
  mode = 'wrap',
  style,
  className
}: GlowSurfaceProps) {
  // Subscribe via thin selectors so unrelated theme-store updates (e.g. a
  // user dragging a slider for a *different* surface) don't re-render every
  // GlowSurface on the page. The list-window route mounts hundreds of
  // ItemRow GlowSurfaces — wide subscriptions there cause render thrash
  // and visible glitches under load (rows go black/blank as the renderer
  // can't keep up).
  const hydrated = useThemesStore((s) => s.hydrated)
  const masterEnabled = useThemesStore((s) => s.masterEnabled)
  const enabled = useThemesStore((s) => s.surfaces[surface]?.enabled ?? false)
  const baseActive = hydrated && masterEnabled && enabled

  // Burst hook — selector returns undefined when not active so disabled
  // surfaces never re-render on burst-config changes for OTHER surfaces.
  const [burstPulse, setBurstPulse] = useState(true)
  const burst = useThemesStore((s) =>
    baseActive ? s.surfaces[surface]?.burst : undefined
  )
  const burstEnabled = baseActive && (burst?.enabled ?? false)
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

  // Heavy selector — only fetches the full config when active. Disabled
  // surfaces stay subscribed to `undefined` so config tweaks elsewhere
  // don't fire re-renders here.
  const surfaceConfig = useThemesStore((s) =>
    baseActive ? s.surfaces[surface] : undefined
  )

  // Overlay mode disabled: bail null. Cheap; no DOM, no further work.
  if (mode === 'overlay' && !baseActive) return null

  const active = baseActive && (!burstEnabled || burstPulse)

  // For wrap mode when DISABLED we still mount BorderBeam (with active=false)
  // so the children's parent in the React tree stays stable across hydration —
  // otherwise inputs that auto-focus on mount lose focus when the user toggles
  // the surface on. Use defaults when surfaceConfig is undefined.
  const cfg = surfaceConfig
  const c: SurfaceConfig['borderBeam'] = cfg?.borderBeam ?? DEFAULT_BORDER_BEAM_CONFIG
  const particles = cfg?.particles
  const showParticles = active && (particles?.enabled ?? false)
  const paletteBlobs = active
    ? paletteBlobsWithOverride(c.colorVariant, c.paletteOverride)
    : []
  // Particle layer composition. Three modes:
  //  - particles disabled: nothing
  //  - threeLayers off: a single ParticleLayer with full count, no blur
  //  - threeLayers on: stacked canvases, one per enabled layer config,
  //    each getting count/3 particles and its own blur + opacity (CSS
  //    filter on the canvas — runs in the GPU compositor, ~free)
  let particleLayer: ReactNode = null
  if (showParticles && particles) {
    if (particles.threeLayers) {
      const enabledLayers = particles.layers.filter((l) => l.enabled)
      const perLayerCount =
        enabledLayers.length > 0 ? Math.round(particles.count / enabledLayers.length) : 0
      particleLayer = (
        <>
          {particles.layers.map((layer, i) =>
            layer.enabled ? (
              <ParticleLayer
                key={i}
                config={particles}
                paletteBlobs={paletteBlobs}
                blur={layer.blur}
                opacity={layer.opacity}
                countOverride={perLayerCount}
              />
            ) : null
          )}
        </>
      )
    } else {
      particleLayer = <ParticleLayer config={particles} paletteBlobs={paletteBlobs} />
    }
  }

  if (mode === 'overlay') {
    // (baseActive must be true here — the early-return above caught the rest)
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

  // Wrap mode (active or inactive): always render BorderBeam.
  return renderBeam(c, active, children, particleLayer, style, className)
}
