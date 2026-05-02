import type { CSSProperties, ReactNode } from 'react'
import { BorderBeam } from '../../lib/border-beam-fork/BorderBeam'
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
 *  host's children. */
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
          { width: '100%', height: '100%' },
          className
        )}
      </div>
    )
  }

  // Wrap mode: always-mount with active prop so children's identity is stable.
  // Use the persisted config when available, otherwise fall back to defaults
  // (which only matters during the brief pre-hydration window).
  const c = surfaceConfig?.borderBeam ?? DEFAULT_BORDER_BEAM_CONFIG
  return renderBeam(c, active, children, style, className)
}
