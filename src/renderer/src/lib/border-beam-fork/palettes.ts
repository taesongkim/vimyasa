// Reads the default 9-blob border palette for each color variant from the
// vendored source so the dev panel can pre-fill its swatches with the
// upstream colors. Converts rgb(...) → #rrggbb because <input type="color">
// only accepts hex.

// @ts-expect-error vendored source has no type declarations
import { borderColorPalettes } from './source.js'

type Variant = 'colorful' | 'mono' | 'ocean' | 'sunset'

interface VariantPalette {
  border: { color: string; pos: string; size: string }[]
}

const _palettes = borderColorPalettes as Record<Variant, VariantPalette>

/** Up to 9 hex strings — the variant's natural blob colors. Used to seed
 *  swatch values in the dev panel before the user has any overrides. */
export function defaultPaletteHex(variant: Variant): string[] {
  return (_palettes[variant]?.border ?? []).map((blob) => rgbToHex(blob.color))
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
