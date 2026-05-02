// Reads the default 9-blob border palette for each color variant from the
// vendored source. Used by the dev panel for swatch swatches and by the
// particle layer for blob-aware spawning + coloring.

// @ts-expect-error vendored source has no type declarations
import { borderColorPalettes } from './source.js'

type Variant = 'colorful' | 'mono' | 'ocean' | 'sunset'

export interface PaletteBlob {
  color: string
  /** Two-component position string (CSS-style), e.g. "33% -7.4%" — fed to
   *  the radial-gradient `at` clause in source.js. Particle layer parses
   *  these to drive blob-aware spawn positions. */
  pos: string
  /** Two-component size string, e.g. "70px 40px" — used by the gradient
   *  ellipse. Particle layer reads this for spawn jitter radius. */
  size: string
}

interface VariantPalette {
  border: PaletteBlob[]
}

const _palettes = borderColorPalettes as Record<Variant, VariantPalette>

/** Raw blobs (color + pos + size) for a variant. */
export function defaultPaletteBlobs(variant: Variant): PaletteBlob[] {
  return _palettes[variant]?.border ?? []
}

/** Apply a per-blob color override over the variant defaults. Slots with
 *  null/undefined entries keep the variant default's color. Position and
 *  size always inherit from the variant. */
export function paletteBlobsWithOverride(
  variant: Variant,
  override?: (string | null)[]
): PaletteBlob[] {
  const blobs = defaultPaletteBlobs(variant)
  if (!override || override.length === 0) return blobs
  return blobs.map((blob, i) => {
    const c = override[i]
    return typeof c === 'string' && c.length > 0 ? { ...blob, color: c } : blob
  })
}

/** Up to 9 hex strings — the variant's natural blob colors. Used to seed
 *  swatch values in the dev panel before the user has any overrides. */
export function defaultPaletteHex(variant: Variant): string[] {
  return defaultPaletteBlobs(variant).map((blob) => rgbToHex(blob.color))
}

export function rgbToHex(rgb: string): string {
  const m = rgb.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (!m) return '#000000'
  const r = clamp255(Number(m[1]))
  const g = clamp255(Number(m[2]))
  const b = clamp255(Number(m[3]))
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
}

function clamp255(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(255, Math.round(n)))
}

function toHexByte(n: number): string {
  return n.toString(16).padStart(2, '0')
}
