import type { CSSProperties, ReactNode } from 'react'
import { BorderBeam } from '../../lib/border-beam-fork/BorderBeam'
import { defaultPaletteHex } from '../../lib/border-beam-fork/palettes'
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

function resolveVariantColors(
  variant: SurfaceConfig['borderBeam']['colorVariant'],
  override: SurfaceConfig['borderBeam']['paletteOverride']
): string[] {
  // Particles default to picking from the variant's palette so they tint
  // alongside the beam. Per-blob overrides (when set) take priority so a
  // user's custom palette feeds particles too.
  const defaults = defaultPaletteHex(variant)
  if (!override) return defaults
  return defaults.map((d, i) => {
    const o = override[i]
    return typeof o === 'string' && o.length > 0 ? o : d
  })
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

  const active = hydrated && masterEnabled && (surfaceConfig?.enabled ?? false)
  const particles = surfaceConfig?.particles
  const showParticles = active && (particles?.enabled ?? false)
  const variantColors = surfaceConfig
    ? resolveVariantColors(
        surfaceConfig.borderBeam.colorVariant,
        surfaceConfig.borderBeam.paletteOverride
      )
    : []

  const particleLayer =
    showParticles && particles ? (
      <ParticleLayer config={particles} variantColors={variantColors} />
    ) : null

  if (mode === 'overlay') {
    if (!active) return null
    const c = surfaceConfig!.borderBeam
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius: 'inherit', ...style }}
      >
        {renderBeam(
          c,
          true,
          <div style={{ width: '100%', height: '100%' }} />,
          null,
          { width: '100%', height: '100%' },
          className
        )}
        {particleLayer}
      </div>
    )
  }

  // Wrap mode: always-mount with active prop so children's identity is stable.
  // Use the persisted config when available, otherwise fall back to defaults
  // (which only matters during the brief pre-hydration window).
  const c = surfaceConfig?.borderBeam ?? DEFAULT_BORDER_BEAM_CONFIG
  return renderBeam(c, active, children, particleLayer, style, className)
}
