import type { CSSProperties, ReactNode } from 'react'
import { BorderBeam } from 'border-beam'
import { useThemesStore } from '../../store/themesStore'
import type { SurfaceId } from '@shared/themes'

interface GlowSurfaceProps {
  surface: SurfaceId
  children: ReactNode
  /** Forwarded to the BorderBeam wrapper div when the effect is active.
   *  Pass `display: 'inline-block'` (or similar) when wrapping inline elements
   *  like input fields so the host's layout flow is preserved. */
  style?: CSSProperties
  className?: string
}

/** Wraps a target surface with the active theme's effect. When the master
 *  switch is off OR the per-surface toggle is off, renders children with no
 *  wrapper so the production DOM stays clean. Layout *can* shift when
 *  toggling on/off — this is intentional and visible only on deliberate
 *  user action via Settings → Themes. */
export function GlowSurface({ surface, children, style, className }: GlowSurfaceProps) {
  const masterEnabled = useThemesStore((s) => s.masterEnabled)
  const surfaceConfig = useThemesStore((s) => s.surfaces[surface])
  const hydrated = useThemesStore((s) => s.hydrated)

  // Until hydrated, behave as if disabled (avoids a flash of glow on cold
  // load if the persisted state happens to be on but hasn't arrived yet).
  if (!hydrated || !masterEnabled || !surfaceConfig?.enabled) {
    return <>{children}</>
  }

  const c = surfaceConfig.borderBeam

  return (
    <BorderBeam
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
      style={style}
      className={className}
    >
      {children}
    </BorderBeam>
  )
}
