// Canvas-based ambient-particle layer composed alongside the BorderBeam.
// Particles are tiny pixel-dust marks (default: ~1 device pixel up to 1
// CSS px) that drift, fade in/out, and tint themselves from the active
// variant's palette so they echo the wave they're near.
//
// Spawn modes:
//   - 'palette': pick a random palette blob, spawn near its position with
//     jitter sized to the blob, color = same blob.
//   - 'inside' / 'edges': spawn random in box / perimeter, color = nearest
//     blob's color (when config.color === 'auto').
//
// Mounted as an absolutely-positioned child of a positioned ancestor (the
// BorderBeam wrapper or the GlowSurface overlay div) — pointer-events:none
// so it never blocks input.

import { useEffect, useRef } from 'react'
import type { ParticleConfig } from '@shared/themes'
import type { PaletteBlob } from '../../lib/border-beam-fork/palettes'

interface ParticleLayerProps {
  config: ParticleConfig
  /** Palette source for spawn positions and per-particle colors when
   *  config.color === 'auto'. Match what the BorderBeam is rendering so
   *  the dust echoes the beam visually. */
  paletteBlobs: PaletteBlob[]
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  lifetime: number
  size: number
  color: string
}

const HARD_PARTICLE_CAP = 300

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Parse one component of a CSS pos string ("33%", "-7.4%", "12px"). */
function parsePosComponent(v: string, total: number): number {
  const trimmed = v.trim()
  if (trimmed.endsWith('%')) {
    return (parseFloat(trimmed) / 100) * total
  }
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed)
  }
  const n = parseFloat(trimmed)
  return Number.isNaN(n) ? 0 : n
}

function parseBlobPos(pos: string, width: number, height: number): [number, number] {
  const parts = pos.trim().split(/\s+/)
  if (parts.length !== 2) return [width / 2, height / 2]
  return [parsePosComponent(parts[0], width), parsePosComponent(parts[1], height)]
}

/** Estimate a jitter radius from the blob's `size` string ("70px 40px").
 *  Falls back to 12px if parsing fails. */
function parseBlobJitter(size: string): number {
  const parts = size.trim().split(/\s+/)
  const w = parseFloat(parts[0]) || 12
  const h = parseFloat(parts[1] ?? parts[0]) || 12
  // Jitter is a fraction of the blob size — keeps particles clustered
  // around the blob center but not perfectly stacked.
  return Math.max(4, (w + h) / 4)
}

function colorOfNearestBlob(
  x: number,
  y: number,
  width: number,
  height: number,
  blobs: PaletteBlob[]
): string {
  if (blobs.length === 0) return '#ffffff'
  let best = blobs[0]
  let bestD = Infinity
  for (const blob of blobs) {
    const [bx, by] = parseBlobPos(blob.pos, width, height)
    const d = (x - bx) * (x - bx) + (y - by) * (y - by)
    if (d < bestD) {
      bestD = d
      best = blob
    }
  }
  return best.color
}

function spawnParticle(
  width: number,
  height: number,
  config: ParticleConfig,
  blobs: PaletteBlob[]
): Particle {
  let x: number, y: number, color: string

  if (config.spawn === 'palette' && blobs.length > 0) {
    const blob = blobs[Math.floor(Math.random() * blobs.length)]
    const [bx, by] = parseBlobPos(blob.pos, width, height)
    const jitter = parseBlobJitter(blob.size)
    // Gaussian-ish jitter via two uniform samples — good enough for
    // visual clustering without pulling in a full RNG.
    x = bx + rand(-jitter, jitter)
    y = by + rand(-jitter, jitter)
    color = config.color === 'auto' ? blob.color : config.color
  } else if (config.spawn === 'edges') {
    const side = Math.floor(Math.random() * 4)
    const t = Math.random()
    if (side === 0) { x = t * width; y = 0 }
    else if (side === 1) { x = width; y = t * height }
    else if (side === 2) { x = t * width; y = height }
    else { x = 0; y = t * height }
    color =
      config.color === 'auto'
        ? colorOfNearestBlob(x, y, width, height, blobs)
        : config.color
  } else {
    // 'inside'
    x = Math.random() * width
    y = Math.random() * height
    color =
      config.color === 'auto'
        ? colorOfNearestBlob(x, y, width, height, blobs)
        : config.color
  }

  const size = rand(config.minSize, config.maxSize)
  const lifetime = rand(config.minLifetimeMs, config.maxLifetimeMs)
  const speed = config.speed
  const vx = rand(-speed, speed)
  const vy = rand(-speed, speed)
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

export function ParticleLayer({ config, paletteBlobs }: ParticleLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })

  // Track parent size with ResizeObserver. DPR scaling done on each resize.
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !config.enabled) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    particlesRef.current = []

    const cap = Math.min(HARD_PARTICLE_CAP, Math.max(0, Math.floor(config.count)))

    const tick = (ts: number): void => {
      const dt = Math.min(64, ts - last)
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
        particles.push(spawnParticle(width, height, config, paletteBlobs))
      }
      while (particles.length > cap) particles.shift()

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      const softness = Math.max(0, Math.min(1, config.glowSoftness))
      // Smallest visible mark on the user's screen — used as a render-time
      // floor so even a slider-set 0.25px CSS particle still paints at
      // least one device pixel. Recompute each frame in case dpr changes
      // (window moved between displays).
      const minRenderSize = 1 / dpr

      for (const p of particles) {
        const t = p.age / p.lifetime
        const fadeIn = 0.2
        const holdEnd = 0.7
        let alpha: number
        if (t < fadeIn) alpha = t / fadeIn
        else if (t > holdEnd) alpha = 1 - (t - holdEnd) / (1 - holdEnd)
        else alpha = 1
        if (alpha <= 0) continue

        const renderSize = Math.max(minRenderSize, p.size)
        const [r, g, b] = parseColor(p.color)

        if (renderSize <= 1.25) {
          // Pixel-dust: skip the gradient, paint a single near-pixel dot.
          // Cheaper and avoids gradient artifacts at sub-pixel sizes.
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.95).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, renderSize, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, renderSize)
          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.95).toFixed(3)})`)
          grad.addColorStop(
            0.3 + softness * 0.4,
            `rgba(${r}, ${g}, ${b}, ${(alpha * 0.35).toFixed(3)})`
          )
          grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, renderSize, 0, Math.PI * 2)
          ctx.fill()
        }
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
    // Stringify config + palette so any field/blob change restarts cleanly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(config),
    paletteBlobs.map((b) => `${b.color}@${b.pos}`).join('|')
  ])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ borderRadius: 'inherit' }}
    />
  )
}
