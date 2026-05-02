// Canvas-based ambient-particle layer composed alongside the BorderBeam.
// Each particle is a soft radial gradient that drifts and fades in/out
// over its lifetime. Self-contained: tracks its own particle pool, RAF
// loop, and DPR-correct sizing. Mounted as an absolutely-positioned
// child of a positioned ancestor (the BorderBeam wrapper or the GlowSurface
// overlay div) — pointer-events:none so it never blocks input.

import { useEffect, useRef } from 'react'
import type { ParticleConfig } from '@shared/themes'

interface ParticleLayerProps {
  config: ParticleConfig
  /** Source colors when config.color === 'auto'. The active variant's
   *  9 (or 8) blob colors. Component picks one per particle in round-robin. */
  variantColors: string[]
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  lifetime: number
  size: number
  color: string // hex or rgb()
}

const HARD_PARTICLE_CAP = 300

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function spawnParticle(
  width: number,
  height: number,
  config: ParticleConfig,
  variantColors: string[],
  seq: number
): Particle {
  let x: number, y: number
  if (config.spawn === 'edges') {
    // Pick a random edge then a random position along it.
    const side = Math.floor(Math.random() * 4)
    const t = Math.random()
    if (side === 0) { x = t * width; y = 0 }
    else if (side === 1) { x = width; y = t * height }
    else if (side === 2) { x = t * width; y = height }
    else { x = 0; y = t * height }
  } else {
    x = Math.random() * width
    y = Math.random() * height
  }
  const size = rand(config.minSize, config.maxSize)
  const lifetime = rand(config.minLifetimeMs, config.maxLifetimeMs)
  const speed = config.speed
  const vx = rand(-speed, speed)
  const vy = rand(-speed, speed)
  const color =
    config.color === 'auto'
      ? variantColors.length > 0
        ? variantColors[seq % variantColors.length]
        : '#ffffff'
      : config.color
  return { x, y, vx, vy, age: 0, lifetime, size, color }
}

/** Parses a CSS color (rgb, rgba, hex) into [r, g, b]. Hex returns the
 *  alpha-less form; rgba's alpha is dropped because we apply our own. */
function parseColor(c: string): [number, number, number] {
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const hex = c.match(/^#([\da-f]{3}|[\da-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16)
      ]
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ]
  }
  return [255, 255, 255]
}

export function ParticleLayer({ config, variantColors }: ParticleLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const seqRef = useRef(0)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })

  // Track parent size with ResizeObserver so the canvas stays aligned to
  // the host as windows resize. DPR scaling done once per resize.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const resize = (width: number, height: number): void => {
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      sizeRef.current = { width, height, dpr }
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    const initial = parent.getBoundingClientRect()
    resize(initial.width, initial.height)
    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (!e) return
      resize(e.contentRect.width, e.contentRect.height)
    })
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  // Animation loop. Restarts whenever any config field changes — particles
  // get cleared so old settings don't linger.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !config.enabled) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    particlesRef.current = []
    seqRef.current = 0

    const cap = Math.min(HARD_PARTICLE_CAP, Math.max(0, Math.floor(config.count)))

    const tick = (ts: number): void => {
      const dt = Math.min(64, ts - last) // clamp big tab-resume gaps
      last = ts
      const { width, height, dpr } = sizeRef.current
      if (width <= 0 || height <= 0) {
        raf = requestAnimationFrame(tick)
        return
      }

      const particles = particlesRef.current

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age += dt
        if (p.age >= p.lifetime) {
          particles.splice(i, 1)
          continue
        }
        p.x += (p.vx * dt) / 1000
        p.y += (p.vy * dt) / 1000
      }

      while (particles.length < cap) {
        particles.push(
          spawnParticle(width, height, config, variantColors, seqRef.current++)
        )
      }
      // If the cap shrank below current count, shed extras from the front
      // (oldest first — they're most likely fading out anyway).
      while (particles.length > cap) particles.shift()

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      const softness = Math.max(0, Math.min(1, config.glowSoftness))

      for (const p of particles) {
        const t = p.age / p.lifetime
        const fadeIn = 0.2
        const holdEnd = 0.7
        let alpha: number
        if (t < fadeIn) alpha = t / fadeIn
        else if (t > holdEnd) alpha = 1 - (t - holdEnd) / (1 - holdEnd)
        else alpha = 1
        if (alpha <= 0) continue

        const [r, g, b] = parseColor(p.color)
        // Soft radial gradient — softness controls where the half-alpha
        // stop lands. softness=0 → tight (sharp core, quick falloff).
        // softness=1 → wide soft halo.
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.95).toFixed(3)})`)
        grad.addColorStop(
          0.3 + softness * 0.4,
          `rgba(${r}, ${g}, ${b}, ${(alpha * 0.35).toFixed(3)})`
        )
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      particlesRef.current = []
      const c = canvas.getContext('2d')
      if (c) c.clearRect(0, 0, canvas.width, canvas.height)
    }
    // Stringify config so any field change restarts the loop cleanly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(config),
    variantColors.join('|')
  ])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ borderRadius: 'inherit' }}
    />
  )
}
