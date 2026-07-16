// Minimal hex ↔ OKLCH conversion. Pure JS, no dependency — the app already
// speaks OKLCH in CSS, but the Magic Colors palette is stored as hex, so the
// dev panel needs to move between the two to offer per-blob L/C/H sliders.
//
// Pipeline: hex → sRGB → linear sRGB → OKLab → OKLCH (and back). Matrices are
// Björn Ottosson's reference constants (https://bottosson.github.io/posts/oklab/).
// L is 0–1, C is 0–~0.4, H is degrees 0–360.

export interface Oklch {
  /** Perceived lightness, 0–1. */
  l: number
  /** Chroma, 0–~0.4 in-gamut for sRGB. */
  c: number
  /** Hue in degrees, 0–360. */
  h: number
}

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Parse `#rgb` / `#rrggbb` (with or without leading #) into 0–1 sRGB. */
function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return [r, g, b]
}

function toHexByte(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v * 255)))
    .toString(16)
    .padStart(2, '0')
}

/** Convert a hex color to OKLCH. Returns a neutral gray on unparseable input. */
export function hexToOklch(hex: string): Oklch {
  const parsed = parseHex(hex)
  if (!parsed) return { l: 0.5, c: 0, h: 0 }
  const r = srgbToLinear(parsed[0])
  const g = srgbToLinear(parsed[1])
  const b = srgbToLinear(parsed[2])

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

  const c = Math.sqrt(a * a + bb * bb)
  let h = (Math.atan2(bb, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

/** Convert OKLCH back to a `#rrggbb` hex, clamping out-of-gamut channels. */
export function oklchToHex({ l: L, c, h }: Oklch): string {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const bb = c * Math.sin(hr)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return `#${toHexByte(clamp01(linearToSrgb(r)))}${toHexByte(
    clamp01(linearToSrgb(g))
  )}${toHexByte(clamp01(linearToSrgb(b)))}`
}
