import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { BorderBeam } from '../../lib/border-beam-fork/BorderBeam'
import { paletteBlobsWithOverride } from '../../lib/border-beam-fork/palettes'
import { ParticleLayer } from './ParticleLayer'
import { useThemesStore } from '../../store/themesStore'
import { themeEvents } from '../../lib/theme-events'
import {
  DEFAULT_BORDER_BEAM_CONFIG,
  type SurfaceId,
  type SurfaceConfig,
  type ExtraBeam,
  type ThemeEventName,
  type ThemeEventPayload
} from '@shared/themes'

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
  /** Optional metadata filter applied to triggered events. When set, the
   *  surface only fires its trigger pulse if the incoming event payload
   *  matches every defined field — e.g., passing `{ itemId: item.id }`
   *  on a list-item GlowSurface scopes its 'item-status-changed' pulse
   *  to that single row. Empty/undefined = match every event whose name
   *  is in the surface's triggers.events list (current global behavior). */
  eventFilter?: { itemId?: string }
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
      whiteSheen={c.whiteSheen}
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
  eventFilter,
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

  // Triggered state: when triggers are enabled, the surface is only
  // visually active during a brief window after a matching event fires.
  // The pulse follows BorderBeam's own fade-in/out (~0.6s in, ~0.5s out)
  // around the held duration. Stale timers cleared on each new event so
  // rapid-fire events don't queue up.
  const triggers = surfaceConfig?.triggers
  const triggersEnabled = baseActive && (triggers?.enabled ?? false)
  const triggerEvents = triggersEnabled ? (triggers?.events ?? []) : []
  const triggerDurationMs = triggers?.durationMs ?? 1500
  const [triggered, setTriggered] = useState(false)
  const triggerTimeoutRef = useRef<number | undefined>(undefined)

  // Filter primitive snapshot for the dep array — a stable string we can
  // diff. Adding fields here is straightforward (e.g., listId later).
  const filterItemId = eventFilter?.itemId ?? ''

  useEffect(() => {
    if (!triggersEnabled || triggerEvents.length === 0) return
    const matchSet = new Set<ThemeEventName>(triggerEvents)
    const onEvent = (payload: ThemeEventPayload): void => {
      if (!matchSet.has(payload.name)) return
      // Metadata filter: when filterItemId is set, the event MUST carry a
      // matching itemId. Events without an itemId never match a scoped
      // surface — that's intentional so per-row surfaces don't pulse on
      // unrelated unscoped events.
      if (filterItemId && payload.itemId !== filterItemId) return
      setTriggered(true)
      if (triggerTimeoutRef.current != null) {
        window.clearTimeout(triggerTimeoutRef.current)
      }
      triggerTimeoutRef.current = window.setTimeout(() => {
        setTriggered(false)
        triggerTimeoutRef.current = undefined
      }, triggerDurationMs)
    }
    const off = themeEvents.on(onEvent)
    return () => {
      off()
      if (triggerTimeoutRef.current != null) {
        window.clearTimeout(triggerTimeoutRef.current)
        triggerTimeoutRef.current = undefined
      }
      // Clear stale triggered state so a re-mount with new config doesn't
      // come in already-on for the wrong reason.
      setTriggered(false)
    }
    // Stringify events array so identity changes when the user edits it.
  }, [triggersEnabled, triggerEvents.join('|'), triggerDurationMs, filterItemId])

  // Effective active state combines all the gates:
  //  - baseActive must be true (master + per-surface enabled, hydrated)
  //  - if triggers enabled: only active while triggered
  //  - else if burst enabled: pulses on/off via timer
  //  - else: continuously active
  const active =
    baseActive &&
    (triggersEnabled ? triggered : !burstEnabled || burstPulse)
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

  // Extra beams: stacked sibling BorderBeams with independent
  // duration / beamLength / strength but the primary's variant + palette.
  // Each renders into the primary's wrapper via the overlay slot, sized
  // absolute inset:0 so it shares the wrapper's geometry exactly. Streaks
  // overlap and rotate independently.
  const extraBeams: ExtraBeam[] = baseActive ? surfaceConfig?.borderBeam.extraBeams ?? [] : []
  const renderedExtraBeams = extraBeams
    .filter((eb) => eb.enabled)
    .map((eb, i) => {
      const cfg = surfaceConfig!.borderBeam
      return (
        <BorderBeam
          key={`extra-${i}`}
          active={active}
          size={cfg.size}
          colorVariant={cfg.colorVariant}
          theme="dark"
          duration={eb.duration}
          beamLength={eb.beamLength}
          strength={eb.strength}
          brightness={cfg.brightness}
          saturation={cfg.saturation}
          hueRange={cfg.hueRange}
          staticColors={cfg.staticColors}
          borderRadius={cfg.borderRadius}
          borderWidth={cfg.borderWidth}
          strokeOpacity={cfg.strokeOpacity}
          innerOpacity={cfg.innerOpacity}
          bloomOpacity={cfg.bloomOpacity}
          innerShadow={cfg.innerShadow}
          glowDepth={cfg.glowDepth}
          whiteSheen={cfg.whiteSheen}
          paletteOverride={cfg.paletteOverride}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <div style={{ width: '100%', height: '100%' }} />
        </BorderBeam>
      )
    })

  // Particle composition. When threeLayers is on, render one ParticleLayer
  // per enabled sub-layer with its own blur + opacity (CSS filter on the
  // canvas, runs in the GPU compositor) — the count is split across enabled
  // layers so total on-screen population matches `count`. When off, a
  // single ParticleLayer with default blur=0 opacity=1.
  let particleLayer: ReactNode = null
  if (showParticles && particles) {
    if (particles.threeLayers) {
      const enabledLayers = particles.layers.filter((l) => l.enabled)
      const perLayerCount =
        enabledLayers.length > 0
          ? Math.round(particles.count / enabledLayers.length)
          : 0
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

  // Combined overlay slot — extras render BEHIND the primary's pseudo-elements
  // visually (rendered first inside the wrapper), particles on top of those.
  const innerOverlay =
    renderedExtraBeams.length > 0 || particleLayer ? (
      <>
        {renderedExtraBeams}
        {particleLayer}
      </>
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
          innerOverlay,
          { width: '100%', height: '100%' },
          className
        )}
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
  return renderBeam(c, active, children, innerOverlay, style, className)
}
