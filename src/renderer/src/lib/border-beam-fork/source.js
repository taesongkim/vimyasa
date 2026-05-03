// Vendored from `border-beam` v1.0.1 (MIT, © Jakub Antalik) — bundled
// output of the package, copied verbatim from
// node_modules/border-beam/dist/index.es.js so we can layer additional
// override props (borderWidth, per-layer opacities, innerShadow) on top
// of the package's size-based presets and remove the upper clamp on
// strength. The React component itself is replaced by ./BorderBeam.tsx;
// only the data tables and CSS generators are exported from here.
//
// Variable names follow the bundled output (single letters from the
// minifier). Don't bother renaming for clarity — this file isn't read
// often, and rewriting risks subtle behavior drift. Treat it as
// effectively read-only; if you need to evolve the technique, fork the
// CSS generators by name and add new ones alongside instead.
//
// @ts-nocheck
/* eslint-disable */

// Fork addition: lets the renderer dial the bright streak's perimeter
// coverage continuously (0% = nothing, 28% = upstream default streak,
// 100% = uniform full perimeter — beam visible everywhere). Replaces the
// hardcoded conic-gradient mask that ran 52%-80% bright with fade zones
// before/after. Center is held at 66% so the default visual matches the
// upstream package; for L >= 95 we swap to a flat linear mask for true
// full-perimeter coverage (avoids conic-gradient out-of-range stops).
function __beamMask(e, L, angleExpr) {
  const n = typeof L === 'number' ? L : 28
  if (n >= 95) return `linear-gradient(#fff 0 0)`
  const center = 66
  const streakStart = Math.max(0, center - n / 2)
  const streakEnd = Math.min(100, center + n / 2)
  const fIn1 = Math.max(0, streakStart - 22)
  const fIn2 = Math.max(0, streakStart - 16)
  const fIn3 = Math.max(0, streakStart - 8)
  const fOut1 = Math.min(100, streakEnd + 6)
  const fOut2 = Math.min(100, streakEnd + 12)
  const fOut3 = Math.min(100, streakEnd + 15)
  const from = angleExpr || `var(--beam-angle-${e})`
  return `conic-gradient(
      from ${from},
      transparent 0%, transparent ${fIn1}%,
      rgba(255, 255, 255, 0.1) ${fIn2}%, rgba(255, 255, 255, 0.35) ${fIn3}%,
      white ${streakStart}%, white ${streakEnd}%,
      rgba(255, 255, 255, 0.35) ${fOut1}%, rgba(255, 255, 255, 0.1) ${fOut2}%,
      transparent ${fOut3}%, transparent 100%
    )`
}

const ce = {
  sm: {
    borderRadius: 18,
    borderWidth: 1,
    width: 70,
    height: 36
  },
  md: {
    borderRadius: 16,
    borderWidth: 1
  },
  line: {
    borderRadius: 16,
    borderWidth: 1
  }
}, I = {
  sm: {
    dark: {
      strokeOpacity: 0.48,
      innerOpacity: 0.7,
      bloomOpacity: 0.8,
      innerShadow: "rgba(255, 255, 255, 0.3)",
      saturation: 1.2
    },
    light: {
      strokeOpacity: 0.33,
      innerOpacity: 0.46,
      bloomOpacity: 0.54,
      innerShadow: "rgba(0, 0, 0, 0.14)",
      saturation: 0.96
    }
  },
  md: {
    dark: {
      strokeOpacity: 0.48,
      innerOpacity: 0.7,
      bloomOpacity: 0.8,
      innerShadow: "rgba(255, 255, 255, 0.27)",
      saturation: 1.2
    },
    light: {
      strokeOpacity: 0.33,
      innerOpacity: 0.46,
      bloomOpacity: 0.54,
      innerShadow: "rgba(0, 0, 0, 0.14)",
      saturation: 0.96
    }
  },
  line: {
    dark: {
      strokeOpacity: 0.72,
      innerOpacity: 0.7,
      bloomOpacity: 0.8,
      innerShadow: "rgba(255, 255, 255, 0.1)",
      saturation: 1.2
    },
    light: {
      strokeOpacity: 0.72,
      innerOpacity: 0.7,
      bloomOpacity: 0.8,
      innerShadow: "rgba(0, 0, 0, 0.14)",
      saturation: 1.2
    }
  }
}, Fe = {
  dark: { ...I.md.dark },
  light: { ...I.md.light }
}, B = {
  colorful: {
    border: [
      { color: "rgb(255, 50, 100)", pos: "33% -7.4%", size: "70px 40px" },
      { color: "rgb(40, 140, 255)", pos: "12% -5%", size: "60px 35px" },
      { color: "rgb(50, 200, 80)", pos: "2.1% 68.3%", size: "40px 70px" },
      { color: "rgb(30, 185, 170)", pos: "2.1% 68.3%", size: "20px 35px" },
      { color: "rgb(100, 70, 255)", pos: "74.4% 100%", size: "180px 32px" },
      { color: "rgb(40, 140, 255)", pos: "55% 100%", size: "85px 26px" },
      { color: "rgb(255, 120, 40)", pos: "93.9% 0%", size: "74px 32px" },
      { color: "rgb(240, 50, 180)", pos: "100% 27.1%", size: "26px 42px" },
      { color: "rgb(180, 40, 240)", pos: "100% 27.1%", size: "52px 48px" }
    ],
    spike: { primary: "rgb(255, 60, 80)", secondary: "rgba(40, 190, 180, 0.98)" },
    spikeLt: { primary: "rgb(200, 30, 60)", secondary: "rgb(20, 150, 140)" }
  },
  mono: {
    border: [
      { color: "rgb(180, 180, 180)", pos: "33% -7.4%", size: "70px 40px" },
      { color: "rgb(140, 140, 140)", pos: "12% -5%", size: "60px 35px" },
      { color: "rgb(160, 160, 160)", pos: "2.1% 68.3%", size: "40px 70px" },
      { color: "rgb(130, 130, 130)", pos: "2.1% 68.3%", size: "20px 35px" },
      { color: "rgb(170, 170, 170)", pos: "74.4% 100%", size: "180px 32px" },
      { color: "rgb(150, 150, 150)", pos: "55% 100%", size: "85px 26px" },
      { color: "rgb(190, 190, 190)", pos: "93.9% 0%", size: "74px 32px" },
      { color: "rgb(145, 145, 145)", pos: "100% 27.1%", size: "26px 42px" },
      { color: "rgb(165, 165, 165)", pos: "100% 27.1%", size: "52px 48px" }
    ],
    spike: { primary: "rgb(200, 200, 200)", secondary: "rgb(170, 170, 170)" },
    spikeLt: { primary: "rgb(80, 80, 80)", secondary: "rgb(120, 120, 120)" }
  },
  ocean: {
    border: [
      { color: "rgb(100, 80, 220)", pos: "33% -7.4%", size: "70px 40px" },
      { color: "rgb(60, 120, 255)", pos: "12% -5%", size: "60px 35px" },
      { color: "rgb(80, 100, 200)", pos: "2.1% 68.3%", size: "40px 70px" },
      { color: "rgb(50, 140, 220)", pos: "2.1% 68.3%", size: "20px 35px" },
      { color: "rgb(120, 80, 255)", pos: "74.4% 100%", size: "180px 32px" },
      { color: "rgb(70, 130, 255)", pos: "55% 100%", size: "85px 26px" },
      { color: "rgb(140, 100, 240)", pos: "93.9% 0%", size: "74px 32px" },
      { color: "rgb(90, 110, 230)", pos: "100% 27.1%", size: "26px 42px" },
      { color: "rgb(130, 70, 255)", pos: "100% 27.1%", size: "52px 48px" }
    ],
    spike: { primary: "rgb(100, 120, 255)", secondary: "rgba(130, 100, 220, 0.98)" },
    spikeLt: { primary: "rgb(60, 60, 180)", secondary: "rgb(80, 100, 200)" }
  },
  sunset: {
    border: [
      { color: "rgb(255, 80, 50)", pos: "33% -7.4%", size: "70px 40px" },
      { color: "rgb(255, 160, 40)", pos: "12% -5%", size: "60px 35px" },
      { color: "rgb(255, 120, 60)", pos: "2.1% 68.3%", size: "40px 70px" },
      { color: "rgb(255, 200, 50)", pos: "2.1% 68.3%", size: "20px 35px" },
      { color: "rgb(255, 100, 80)", pos: "74.4% 100%", size: "180px 32px" },
      { color: "rgb(255, 180, 60)", pos: "55% 100%", size: "85px 26px" },
      { color: "rgb(255, 60, 60)", pos: "93.9% 0%", size: "74px 32px" },
      { color: "rgb(255, 140, 50)", pos: "100% 27.1%", size: "26px 42px" },
      { color: "rgb(255, 90, 70)", pos: "100% 27.1%", size: "52px 48px" }
    ],
    spike: { primary: "rgb(255, 140, 80)", secondary: "rgba(255, 100, 60, 0.98)" },
    spikeLt: { primary: "rgb(200, 80, 40)", secondary: "rgb(220, 120, 30)" }
  }
}, A = {
  colorful: {
    border: [
      { color: "rgb(50, 200, 80)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgb(30, 185, 170)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgb(255, 120, 40)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgb(100, 70, 255)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgb(240, 50, 180)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgb(180, 40, 240)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgb(40, 140, 255)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgb(255, 50, 100)", pos: "100% 27%", size: "11px 12px" }
    ],
    inner: [
      { color: "rgba(50, 200, 80, 0.5)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgba(30, 185, 170, 0.45)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgba(255, 120, 40, 0.35)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgba(100, 70, 255, 0.35)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgba(240, 50, 180, 0.3)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgba(180, 40, 240, 0.4)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgba(40, 140, 255, 0.3)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgba(255, 50, 100, 0.3)", pos: "100% 27%", size: "11px 12px" }
    ]
  },
  mono: {
    border: [
      { color: "rgb(160, 160, 160)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgb(140, 140, 140)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgb(180, 180, 180)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgb(150, 150, 150)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgb(170, 170, 170)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgb(155, 155, 155)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgb(145, 145, 145)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgb(165, 165, 165)", pos: "100% 27%", size: "11px 12px" }
    ],
    inner: [
      { color: "rgba(160, 160, 160, 0.25)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgba(140, 140, 140, 0.22)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgba(180, 180, 180, 0.17)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgba(150, 150, 150, 0.17)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgba(170, 170, 170, 0.15)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgba(155, 155, 155, 0.20)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgba(145, 145, 145, 0.15)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgba(165, 165, 165, 0.15)", pos: "100% 27%", size: "11px 12px" }
    ]
  },
  ocean: {
    border: [
      { color: "rgb(60, 140, 200)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgb(50, 120, 180)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgb(100, 80, 220)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgb(80, 100, 255)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgb(120, 70, 240)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgb(90, 80, 220)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgb(70, 110, 255)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgb(110, 90, 230)", pos: "100% 27%", size: "11px 12px" }
    ],
    inner: [
      { color: "rgba(60, 140, 200, 0.5)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgba(50, 120, 180, 0.45)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgba(100, 80, 220, 0.35)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgba(80, 100, 255, 0.35)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgba(120, 70, 240, 0.3)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgba(90, 80, 220, 0.4)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgba(70, 110, 255, 0.3)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgba(110, 90, 230, 0.3)", pos: "100% 27%", size: "11px 12px" }
    ]
  },
  sunset: {
    border: [
      { color: "rgb(255, 180, 50)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgb(255, 150, 40)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgb(255, 80, 60)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgb(255, 100, 80)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgb(255, 60, 80)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgb(255, 120, 60)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgb(255, 200, 50)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgb(255, 90, 70)", pos: "100% 27%", size: "11px 12px" }
    ],
    inner: [
      { color: "rgba(255, 180, 50, 0.5)", pos: "2% 68%", size: "9px 18px" },
      { color: "rgba(255, 150, 40, 0.45)", pos: "2% 68%", size: "4px 8px" },
      { color: "rgba(255, 80, 60, 0.35)", pos: "72% -3%", size: "59px 9px" },
      { color: "rgba(255, 100, 80, 0.35)", pos: "74% 100%", size: "42px 7px" },
      { color: "rgba(255, 60, 80, 0.3)", pos: "100% 27%", size: "10px 17px" },
      { color: "rgba(255, 120, 60, 0.4)", pos: "100% 27%", size: "10px 18px" },
      { color: "rgba(255, 200, 50, 0.3)", pos: "100% 27%", size: "5px 10px" },
      { color: "rgba(255, 90, 70, 0.3)", pos: "100% 27%", size: "11px 12px" }
    ]
  }
};
// Fork addition: applies an optional per-blob color override over a default
// palette. Each entry in `override` (string | null) replaces the matching
// blob's color; null/undefined entries keep the default. Position and size
// are always inherited from the default palette to preserve the carefully
// tuned blob layout. Used by the helpers below.
function __palette(defaults, override) {
  if (!Array.isArray(override) || override.length === 0) return defaults
  return defaults.map((blob, i) => {
    const c = override[i]
    return typeof c === 'string' && c.length > 0 ? { ...blob, color: c } : blob
  })
}
// Fork addition: `whiteSheen` (0–1, default 1) scales the white highlight
// streak that rides on top of the colored blob gradients in ::after, plus
// the narrower bright spike inside the bloom layer. The colored streak
// ($h) is unaffected — turn this down to reveal the pure-hue beam without
// the white travelling sheen on top. Light theme uses black-tinted analogs;
// scale applies to either.
function __sheenAlpha(base, scale) {
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale < 0) return base
  return Math.max(0, Math.min(1, base * scale))
}
function __strokeSheen(angleVar, isDark, scale) {
  // Wide sheen used on the beam stroke (::after). Peak alpha 0.75 (dark)
  // or 0.55 (light) — 8 stops fading in/out across 24% of the perimeter.
  if (isDark) {
    return `conic-gradient(
        from ${angleVar},
        transparent 0%, transparent 54%,
        rgba(255, 255, 255, ${__sheenAlpha(0.1, scale).toFixed(3)}) 57%,
        rgba(255, 255, 255, ${__sheenAlpha(0.3, scale).toFixed(3)}) 60%,
        rgba(255, 255, 255, ${__sheenAlpha(0.6, scale).toFixed(3)}) 63%,
        rgba(255, 255, 255, ${__sheenAlpha(0.75, scale).toFixed(3)}) 66%,
        rgba(255, 255, 255, ${__sheenAlpha(0.6, scale).toFixed(3)}) 69%,
        rgba(255, 255, 255, ${__sheenAlpha(0.3, scale).toFixed(3)}) 72%,
        rgba(255, 255, 255, ${__sheenAlpha(0.1, scale).toFixed(3)}) 75%,
        transparent 78%, transparent 100%
      )`
  }
  return `conic-gradient(
        from ${angleVar},
        transparent 0%, transparent 54%,
        rgba(0, 0, 0, ${__sheenAlpha(0.08, scale).toFixed(3)}) 57%,
        rgba(0, 0, 0, ${__sheenAlpha(0.2, scale).toFixed(3)}) 60%,
        rgba(0, 0, 0, ${__sheenAlpha(0.4, scale).toFixed(3)}) 63%,
        rgba(0, 0, 0, ${__sheenAlpha(0.55, scale).toFixed(3)}) 66%,
        rgba(0, 0, 0, ${__sheenAlpha(0.4, scale).toFixed(3)}) 69%,
        rgba(0, 0, 0, ${__sheenAlpha(0.2, scale).toFixed(3)}) 72%,
        rgba(0, 0, 0, ${__sheenAlpha(0.08, scale).toFixed(3)}) 75%,
        transparent 78%, transparent 100%
      )`
}
function __bloomSheen(angleVar, isDark, scale) {
  // Narrower, brighter spike used inside the [data-beam-bloom] layer. Peak
  // alpha 0.85 (dark) or 0.6 (light) at 70%, with a fast falloff.
  if (isDark) {
    return `conic-gradient(
        from ${angleVar},
        transparent 0%, transparent 58%,
        rgba(255, 255, 255, ${__sheenAlpha(0.03, scale).toFixed(3)}) 62%,
        rgba(255, 255, 255, ${__sheenAlpha(0.08, scale).toFixed(3)}) 65%,
        rgba(255, 255, 255, ${__sheenAlpha(0.2, scale).toFixed(3)}) 67%,
        rgba(255, 255, 255, ${__sheenAlpha(0.45, scale).toFixed(3)}) 69%,
        rgba(255, 255, 255, ${__sheenAlpha(0.85, scale).toFixed(3)}) 70%,
        rgba(255, 255, 255, ${__sheenAlpha(0.85, scale).toFixed(3)}) 70.5%,
        rgba(255, 255, 255, ${__sheenAlpha(0.45, scale).toFixed(3)}) 71.5%,
        rgba(255, 255, 255, ${__sheenAlpha(0.2, scale).toFixed(3)}) 73%,
        rgba(255, 255, 255, ${__sheenAlpha(0.08, scale).toFixed(3)}) 75%,
        rgba(255, 255, 255, ${__sheenAlpha(0.03, scale).toFixed(3)}) 78%,
        transparent 82%
      )`
  }
  return `conic-gradient(
        from ${angleVar},
        transparent 0%, transparent 58%,
        rgba(0, 0, 0, ${__sheenAlpha(0.02, scale).toFixed(3)}) 62%,
        rgba(0, 0, 0, ${__sheenAlpha(0.08, scale).toFixed(3)}) 65%,
        rgba(0, 0, 0, ${__sheenAlpha(0.2, scale).toFixed(3)}) 67%,
        rgba(0, 0, 0, ${__sheenAlpha(0.4, scale).toFixed(3)}) 69%,
        rgba(0, 0, 0, ${__sheenAlpha(0.6, scale).toFixed(3)}) 70%,
        rgba(0, 0, 0, ${__sheenAlpha(0.6, scale).toFixed(3)}) 70.5%,
        rgba(0, 0, 0, ${__sheenAlpha(0.4, scale).toFixed(3)}) 71.5%,
        rgba(0, 0, 0, ${__sheenAlpha(0.2, scale).toFixed(3)}) 73%,
        rgba(0, 0, 0, ${__sheenAlpha(0.08, scale).toFixed(3)}) 75%,
        rgba(0, 0, 0, ${__sheenAlpha(0.02, scale).toFixed(3)}) 78%,
        transparent 82%
      )`
}

// Fork addition: `glowDepth` multiplies the radial-gradient blob sizes
// that compose the inner glow layer (::before / ::after's color stack).
// Lower = glow tighter to the perimeter; higher = glow extends further
// toward the center. The blob *positions* are unchanged so the beam
// stays anchored to the edge. Default 1.0 = upstream behavior.
function __scaleBlobSize(sizeStr, scale) {
  if (typeof scale !== 'number' || scale === 1 || !Number.isFinite(scale) || scale < 0) {
    return sizeStr
  }
  return sizeStr.split(' ').map((m) => {
    const s = parseInt(m)
    if (Number.isNaN(s)) return m
    return `${Math.max(1, Math.round(s * scale))}px`
  }).join(' ')
}
function pe(r, override, glowDepth) {
  return __palette(A[r].border, override).map((a) => `radial-gradient(ellipse ${__scaleBlobSize(a.size, glowDepth)} at ${a.pos}, ${a.color}, transparent)`).join(`,
    `);
}
function le(r, override, glowDepth) {
  // Inner palette has its own colors. We also apply override here so a
  // per-blob color change is reflected in both stroke and inner glow at
  // sm size. Inner blob count (8) differs from border (9), so any extra
  // override slot is silently ignored.
  return __palette(A[r].inner, override).map((a) => `radial-gradient(ellipse ${__scaleBlobSize(a.size, glowDepth)} at ${a.pos}, ${a.color}, transparent)`).join(`,
    `);
}
function be(r, override) {
  return __palette(B[r].border, override).map((a) => `radial-gradient(ellipse ${a.size} at ${a.pos}, ${a.color}, transparent)`).join(`,
    `);
}
function fe(r, override, glowDepth) {
  const a = r === "mono" ? 0.225 : 0.45;
  return __palette(B[r].border, override).map((t) => {
    // fe() softens each blob's color with alpha and shrinks the size by 10%
    // to render the inner glow layer. glowDepth further scales the blob
    // size — combined factor is 0.9 * glowDepth.
    const o = __toRgba(t.color, a);
    const scale = (typeof glowDepth === 'number' && Number.isFinite(glowDepth) && glowDepth >= 0) ? glowDepth : 1;
    return `radial-gradient(ellipse ${t.size.split(" ").map((m) => {
      const s = parseInt(m);
      return `${Math.max(1, Math.round(s * 0.9 * scale))}px`;
    }).join(" ")} at ${t.pos}, ${o}, transparent)`;
  }).join(`,
    `);
}

// Best-effort color → rgba(...) converter so per-blob color overrides
// (which arrive as hex from the dev panel) still get the alpha-softened
// inner-glow treatment. Falls back to the original string if parsing
// fails — keeps existing rgb()/rgba() inputs working unchanged.
function __toRgba(color, alpha) {
  if (typeof color !== 'string') return color
  const rgb = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    const r = h.length === 3 ? parseInt(h[0] + h[0], 16) : parseInt(h.slice(0, 2), 16)
    const g = h.length === 3 ? parseInt(h[1] + h[1], 16) : parseInt(h.slice(2, 4), 16)
    const b = h.length === 3 ? parseInt(h[2] + h[2], 16) : parseInt(h.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  // rgba(...) or hsl(...) etc. — return as-is rather than mangling.
  return color
}
function ge(r, e) {
  const a = B[r];
  return e ? a.spike : a.spikeLt;
}
const me = {
  colorful: {
    dark: [
      { color: "rgb(255, 50, 100)", sizeW: 36, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(40, 180, 220)", sizeW: 30, sizeH: 32, offsetX: 39, offsetY: 0 },
      { color: "rgb(50, 200, 80)", sizeW: 33, sizeH: 28, offsetX: -36, offsetY: 2 },
      { color: "rgb(180, 40, 240)", sizeW: 29, sizeH: 34, offsetX: -54, offsetY: 0 },
      { color: "rgb(255, 160, 30)", sizeW: 27, sizeH: 30, offsetX: 51, offsetY: -1 },
      { color: "rgb(100, 70, 255)", sizeW: 36, sizeH: 24, offsetX: 21, offsetY: 1 },
      { color: "rgb(40, 140, 255)", sizeW: 30, sizeH: 22, offsetX: -21, offsetY: 0 },
      { color: "rgb(240, 50, 180)", sizeW: 25, sizeH: 28, offsetX: 66, offsetY: 1 },
      { color: "rgb(30, 185, 170)", sizeW: 23, sizeH: 30, offsetX: -66, offsetY: -1 }
    ],
    light: [
      { color: "rgb(255, 50, 100)", sizeW: 45, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(40, 140, 255)", sizeW: 35, sizeH: 32, offsetX: 65, offsetY: 0 },
      { color: "rgb(50, 200, 80)", sizeW: 40, sizeH: 28, offsetX: -60, offsetY: 2 },
      { color: "rgb(180, 40, 240)", sizeW: 35, sizeH: 34, offsetX: -90, offsetY: 0 },
      { color: "rgb(30, 185, 170)", sizeW: 38, sizeH: 30, offsetX: 85, offsetY: -1 },
      { color: "rgb(100, 70, 255)", sizeW: 50, sizeH: 24, offsetX: 35, offsetY: 1 },
      { color: "rgb(40, 140, 255)", sizeW: 40, sizeH: 22, offsetX: -35, offsetY: 0 },
      { color: "rgb(255, 120, 40)", sizeW: 35, sizeH: 28, offsetX: 110, offsetY: 1 },
      { color: "rgb(240, 50, 180)", sizeW: 30, sizeH: 30, offsetX: -110, offsetY: -1 }
    ]
  },
  mono: {
    dark: [
      { color: "rgb(200, 200, 200)", sizeW: 36, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(170, 170, 170)", sizeW: 30, sizeH: 32, offsetX: 39, offsetY: 0 },
      { color: "rgb(155, 155, 155)", sizeW: 33, sizeH: 28, offsetX: -36, offsetY: 2 },
      { color: "rgb(185, 185, 185)", sizeW: 29, sizeH: 34, offsetX: -54, offsetY: 0 },
      { color: "rgb(165, 165, 165)", sizeW: 27, sizeH: 30, offsetX: 51, offsetY: -1 },
      { color: "rgb(180, 180, 180)", sizeW: 36, sizeH: 24, offsetX: 21, offsetY: 1 },
      { color: "rgb(160, 160, 160)", sizeW: 30, sizeH: 22, offsetX: -21, offsetY: 0 },
      { color: "rgb(175, 175, 175)", sizeW: 25, sizeH: 28, offsetX: 66, offsetY: 1 },
      { color: "rgb(190, 190, 190)", sizeW: 23, sizeH: 30, offsetX: -66, offsetY: -1 }
    ],
    light: [
      { color: "rgb(100, 100, 100)", sizeW: 45, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(80, 80, 80)", sizeW: 35, sizeH: 32, offsetX: 65, offsetY: 0 },
      { color: "rgb(90, 90, 90)", sizeW: 40, sizeH: 28, offsetX: -60, offsetY: 2 },
      { color: "rgb(70, 70, 70)", sizeW: 35, sizeH: 34, offsetX: -90, offsetY: 0 },
      { color: "rgb(85, 85, 85)", sizeW: 38, sizeH: 30, offsetX: 85, offsetY: -1 },
      { color: "rgb(95, 95, 95)", sizeW: 50, sizeH: 24, offsetX: 35, offsetY: 1 },
      { color: "rgb(75, 75, 75)", sizeW: 40, sizeH: 22, offsetX: -35, offsetY: 0 },
      { color: "rgb(105, 105, 105)", sizeW: 35, sizeH: 28, offsetX: 110, offsetY: 1 },
      { color: "rgb(65, 65, 65)", sizeW: 30, sizeH: 30, offsetX: -110, offsetY: -1 }
    ]
  },
  ocean: {
    dark: [
      { color: "rgb(100, 80, 220)", sizeW: 36, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(60, 120, 255)", sizeW: 30, sizeH: 32, offsetX: 39, offsetY: 0 },
      { color: "rgb(80, 100, 200)", sizeW: 33, sizeH: 28, offsetX: -36, offsetY: 2 },
      { color: "rgb(130, 70, 255)", sizeW: 29, sizeH: 34, offsetX: -54, offsetY: 0 },
      { color: "rgb(70, 130, 255)", sizeW: 27, sizeH: 30, offsetX: 51, offsetY: -1 },
      { color: "rgb(120, 80, 255)", sizeW: 36, sizeH: 24, offsetX: 21, offsetY: 1 },
      { color: "rgb(90, 110, 230)", sizeW: 30, sizeH: 22, offsetX: -21, offsetY: 0 },
      { color: "rgb(110, 90, 240)", sizeW: 25, sizeH: 28, offsetX: 66, offsetY: 1 },
      { color: "rgb(140, 100, 255)", sizeW: 23, sizeH: 30, offsetX: -66, offsetY: -1 }
    ],
    light: [
      { color: "rgb(80, 60, 200)", sizeW: 45, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(50, 100, 220)", sizeW: 35, sizeH: 32, offsetX: 65, offsetY: 0 },
      { color: "rgb(70, 90, 190)", sizeW: 40, sizeH: 28, offsetX: -60, offsetY: 2 },
      { color: "rgb(110, 60, 220)", sizeW: 35, sizeH: 34, offsetX: -90, offsetY: 0 },
      { color: "rgb(60, 110, 230)", sizeW: 38, sizeH: 30, offsetX: 85, offsetY: -1 },
      { color: "rgb(100, 70, 240)", sizeW: 50, sizeH: 24, offsetX: 35, offsetY: 1 },
      { color: "rgb(80, 100, 210)", sizeW: 40, sizeH: 22, offsetX: -35, offsetY: 0 },
      { color: "rgb(90, 80, 225)", sizeW: 35, sizeH: 28, offsetX: 110, offsetY: 1 },
      { color: "rgb(120, 90, 245)", sizeW: 30, sizeH: 30, offsetX: -110, offsetY: -1 }
    ]
  },
  sunset: {
    dark: [
      { color: "rgb(255, 100, 60)", sizeW: 36, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(255, 180, 50)", sizeW: 30, sizeH: 32, offsetX: 39, offsetY: 0 },
      { color: "rgb(255, 140, 70)", sizeW: 33, sizeH: 28, offsetX: -36, offsetY: 2 },
      { color: "rgb(255, 80, 80)", sizeW: 29, sizeH: 34, offsetX: -54, offsetY: 0 },
      { color: "rgb(255, 200, 60)", sizeW: 27, sizeH: 30, offsetX: 51, offsetY: -1 },
      { color: "rgb(255, 120, 50)", sizeW: 36, sizeH: 24, offsetX: 21, offsetY: 1 },
      { color: "rgb(255, 160, 80)", sizeW: 30, sizeH: 22, offsetX: -21, offsetY: 0 },
      { color: "rgb(255, 90, 60)", sizeW: 25, sizeH: 28, offsetX: 66, offsetY: 1 },
      { color: "rgb(255, 70, 70)", sizeW: 23, sizeH: 30, offsetX: -66, offsetY: -1 }
    ],
    light: [
      { color: "rgb(220, 80, 40)", sizeW: 45, sizeH: 36, offsetX: 0, offsetY: 2 },
      { color: "rgb(230, 150, 30)", sizeW: 35, sizeH: 32, offsetX: 65, offsetY: 0 },
      { color: "rgb(210, 110, 50)", sizeW: 40, sizeH: 28, offsetX: -60, offsetY: 2 },
      { color: "rgb(200, 60, 60)", sizeW: 35, sizeH: 34, offsetX: -90, offsetY: 0 },
      { color: "rgb(220, 170, 40)", sizeW: 38, sizeH: 30, offsetX: 85, offsetY: -1 },
      { color: "rgb(210, 100, 30)", sizeW: 50, sizeH: 24, offsetX: 35, offsetY: 1 },
      { color: "rgb(230, 130, 60)", sizeW: 40, sizeH: 22, offsetX: -35, offsetY: 0 },
      { color: "rgb(190, 70, 50)", sizeW: 35, sizeH: 28, offsetX: 110, offsetY: 1 },
      { color: "rgb(180, 50, 50)", sizeW: 30, sizeH: 30, offsetX: -110, offsetY: -1 }
    ]
  }
};
function de(r, e, a) {
  return me[r][e ? "dark" : "light"].map((o) => {
    const p = o.offsetX === 0 ? "" : o.offsetX > 0 ? ` + ${o.offsetX}px` : ` - ${Math.abs(o.offsetX)}px`, m = o.offsetY === 0 ? "" : o.offsetY > 0 ? ` + ${o.offsetY}px` : ` - ${Math.abs(o.offsetY)}px`;
    return `radial-gradient(ellipse calc(${o.sizeW}px * var(--beam-w-${a})) calc(${o.sizeH}px * var(--beam-h-${a})) at calc(var(--beam-x-${a}) * 100%${p}) calc(100%${m}), ${o.color}, transparent)`;
  }).join(`,
       `);
}
const xe = {
  colorful: [
    { color: "rgba(255, 50, 100, 0.48)", sizeW: 33, sizeH: 30, offsetX: 0, offsetY: 0 },
    { color: "rgba(40, 180, 220, 0.42)", sizeW: 24, sizeH: 26, offsetX: 39, offsetY: -3 },
    { color: "rgba(50, 200, 80, 0.48)", sizeW: 27, sizeH: 24, offsetX: -36, offsetY: 0 },
    { color: "rgba(180, 40, 240, 0.42)", sizeW: 23, sizeH: 28, offsetX: -54, offsetY: -2 },
    { color: "rgba(255, 160, 30, 0.50)", sizeW: 24, sizeH: 24, offsetX: 51, offsetY: -1 },
    { color: "rgba(100, 70, 255, 0.45)", sizeW: 30, sizeH: 20, offsetX: 21, offsetY: 0 },
    { color: "rgba(40, 140, 255, 0.40)", sizeW: 25, sizeH: 18, offsetX: -21, offsetY: -2 },
    { color: "rgba(240, 50, 180, 0.45)", sizeW: 21, sizeH: 24, offsetX: 66, offsetY: 0 },
    { color: "rgba(30, 185, 170, 0.52)", sizeW: 18, sizeH: 26, offsetX: -66, offsetY: -1 }
  ],
  mono: [
    { color: "rgba(200, 200, 200, 0.48)", sizeW: 33, sizeH: 30, offsetX: 0, offsetY: 0 },
    { color: "rgba(170, 170, 170, 0.42)", sizeW: 24, sizeH: 26, offsetX: 39, offsetY: -3 },
    { color: "rgba(155, 155, 155, 0.48)", sizeW: 27, sizeH: 24, offsetX: -36, offsetY: 0 },
    { color: "rgba(185, 185, 185, 0.42)", sizeW: 23, sizeH: 28, offsetX: -54, offsetY: -2 },
    { color: "rgba(165, 165, 165, 0.50)", sizeW: 24, sizeH: 24, offsetX: 51, offsetY: -1 },
    { color: "rgba(180, 180, 180, 0.45)", sizeW: 30, sizeH: 20, offsetX: 21, offsetY: 0 },
    { color: "rgba(160, 160, 160, 0.40)", sizeW: 25, sizeH: 18, offsetX: -21, offsetY: -2 },
    { color: "rgba(175, 175, 175, 0.45)", sizeW: 21, sizeH: 24, offsetX: 66, offsetY: 0 },
    { color: "rgba(190, 190, 190, 0.52)", sizeW: 18, sizeH: 26, offsetX: -66, offsetY: -1 }
  ],
  ocean: [
    { color: "rgba(100, 80, 220, 0.48)", sizeW: 33, sizeH: 30, offsetX: 0, offsetY: 0 },
    { color: "rgba(60, 120, 255, 0.42)", sizeW: 24, sizeH: 26, offsetX: 39, offsetY: -3 },
    { color: "rgba(80, 100, 200, 0.48)", sizeW: 27, sizeH: 24, offsetX: -36, offsetY: 0 },
    { color: "rgba(130, 70, 255, 0.42)", sizeW: 23, sizeH: 28, offsetX: -54, offsetY: -2 },
    { color: "rgba(70, 130, 255, 0.50)", sizeW: 24, sizeH: 24, offsetX: 51, offsetY: -1 },
    { color: "rgba(120, 80, 255, 0.45)", sizeW: 30, sizeH: 20, offsetX: 21, offsetY: 0 },
    { color: "rgba(90, 110, 230, 0.40)", sizeW: 25, sizeH: 18, offsetX: -21, offsetY: -2 },
    { color: "rgba(110, 90, 240, 0.45)", sizeW: 21, sizeH: 24, offsetX: 66, offsetY: 0 },
    { color: "rgba(140, 100, 255, 0.52)", sizeW: 18, sizeH: 26, offsetX: -66, offsetY: -1 }
  ],
  sunset: [
    { color: "rgba(255, 100, 60, 0.48)", sizeW: 33, sizeH: 30, offsetX: 0, offsetY: 0 },
    { color: "rgba(255, 180, 50, 0.42)", sizeW: 24, sizeH: 26, offsetX: 39, offsetY: -3 },
    { color: "rgba(255, 140, 70, 0.48)", sizeW: 27, sizeH: 24, offsetX: -36, offsetY: 0 },
    { color: "rgba(255, 80, 80, 0.42)", sizeW: 23, sizeH: 28, offsetX: -54, offsetY: -2 },
    { color: "rgba(255, 200, 60, 0.50)", sizeW: 24, sizeH: 24, offsetX: 51, offsetY: -1 },
    { color: "rgba(255, 120, 50, 0.45)", sizeW: 30, sizeH: 20, offsetX: 21, offsetY: 0 },
    { color: "rgba(255, 160, 80, 0.40)", sizeW: 25, sizeH: 18, offsetX: -21, offsetY: -2 },
    { color: "rgba(255, 90, 60, 0.45)", sizeW: 21, sizeH: 24, offsetX: 66, offsetY: 0 },
    { color: "rgba(255, 70, 70, 0.52)", sizeW: 18, sizeH: 26, offsetX: -66, offsetY: -1 }
  ]
};
function $e(r, e) {
  return xe[r].map((t) => {
    const o = t.offsetX === 0 ? "" : t.offsetX > 0 ? ` + ${t.offsetX}px` : ` - ${Math.abs(t.offsetX)}px`, p = t.offsetY === 0 ? "" : ` - ${Math.abs(t.offsetY)}px`;
    return `radial-gradient(ellipse calc(${t.sizeW}px * var(--beam-w-${e})) calc(${t.sizeH}px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%${o}) calc(100%${p}), ${t.color}, transparent)`;
  }).join(`,
    `);
}
const ze = {
  colorful: {
    dark: {
      spikes: [
        { color1: "rgb(100, 70, 255)", color2: "rgba(100, 70, 255, 1)" },
        // 36%
        { color1: "rgba(255, 170, 40, 0.59)", color2: "rgba(255, 170, 40, 0.29)" },
        // 50%
        { color1: "rgb(50, 200, 100)", color2: "rgba(50, 200, 100, 1)" },
        // 64%
        { color1: "rgba(200, 50, 240, 0.91)", color2: "rgba(200, 50, 240, 0.45)" },
        // 78%
        { color1: "rgb(40, 140, 255)", color2: "rgba(40, 140, 255, 1)" }
        // 92%
      ]
    },
    light: {
      spikes: [
        { color1: "rgb(80, 50, 200)", color2: "rgba(80, 50, 200, 0.8)" },
        // 36%
        { color1: "rgba(210, 130, 0, 0.7)", color2: "rgba(210, 130, 0, 0.46)" },
        // 50%
        { color1: "rgb(30, 160, 70)", color2: "rgba(30, 160, 70, 0.82)" },
        // 64%
        { color1: "rgb(160, 30, 190)", color2: "rgba(160, 30, 190, 0.7)" },
        // 78%
        { color1: "rgb(30, 100, 200)", color2: "rgba(30, 100, 200, 0.78)" }
        // 92%
      ]
    }
  },
  mono: {
    dark: {
      spikes: [
        { color1: "rgb(200, 200, 200)", color2: "rgba(200, 200, 200, 1)" },
        { color1: "rgba(180, 180, 180, 0.59)", color2: "rgba(180, 180, 180, 0.29)" },
        { color1: "rgb(190, 190, 190)", color2: "rgba(190, 190, 190, 1)" },
        { color1: "rgba(170, 170, 170, 0.91)", color2: "rgba(170, 170, 170, 0.45)" },
        { color1: "rgb(185, 185, 185)", color2: "rgba(185, 185, 185, 1)" }
      ]
    },
    light: {
      spikes: [
        { color1: "rgb(80, 80, 80)", color2: "rgba(80, 80, 80, 0.8)" },
        { color1: "rgba(100, 100, 100, 0.7)", color2: "rgba(100, 100, 100, 0.46)" },
        { color1: "rgb(70, 70, 70)", color2: "rgba(70, 70, 70, 0.82)" },
        { color1: "rgb(90, 90, 90)", color2: "rgba(90, 90, 90, 0.7)" },
        { color1: "rgb(85, 85, 85)", color2: "rgba(85, 85, 85, 0.78)" }
      ]
    }
  },
  ocean: {
    dark: {
      spikes: [
        { color1: "rgb(100, 80, 255)", color2: "rgb(100, 80, 255)" },
        { color1: "rgba(80, 130, 220, 0.59)", color2: "rgba(80, 130, 220, 0.29)" },
        { color1: "rgb(60, 100, 255)", color2: "rgb(60, 100, 255)" },
        { color1: "rgba(90, 120, 200, 0.91)", color2: "rgba(90, 120, 200, 0.45)" },
        { color1: "rgb(120, 90, 255)", color2: "rgb(120, 90, 255)" }
      ]
    },
    light: {
      spikes: [
        { color1: "rgb(50, 40, 180)", color2: "rgba(50, 40, 180, 0.8)" },
        { color1: "rgba(40, 80, 200, 0.7)", color2: "rgba(40, 80, 200, 0.46)" },
        { color1: "rgb(30, 50, 190)", color2: "rgba(30, 50, 190, 0.82)" },
        { color1: "rgb(60, 90, 180)", color2: "rgba(60, 90, 180, 0.7)" },
        { color1: "rgb(70, 60, 200)", color2: "rgba(70, 60, 200, 0.78)" }
      ]
    }
  },
  sunset: {
    dark: {
      spikes: [
        { color1: "rgb(255, 100, 80)", color2: "rgb(255, 100, 80)" },
        { color1: "rgba(255, 150, 80, 0.59)", color2: "rgba(255, 150, 80, 0.29)" },
        { color1: "rgb(255, 80, 60)", color2: "rgb(255, 80, 60)" },
        { color1: "rgba(255, 120, 50, 0.91)", color2: "rgba(255, 120, 50, 0.45)" },
        { color1: "rgb(255, 140, 70)", color2: "rgb(255, 140, 70)" }
      ]
    },
    light: {
      spikes: [
        { color1: "rgb(200, 60, 30)", color2: "rgba(200, 60, 30, 0.8)" },
        { color1: "rgba(220, 100, 20, 0.7)", color2: "rgba(220, 100, 20, 0.46)" },
        { color1: "rgb(180, 40, 20)", color2: "rgba(180, 40, 20, 0.82)" },
        { color1: "rgb(210, 80, 10)", color2: "rgba(210, 80, 10, 0.7)" },
        { color1: "rgb(190, 70, 30)", color2: "rgba(190, 70, 30, 0.78)" }
      ]
    }
  }
};
function G(r, e) {
  const a = r.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/);
  if (a) return `rgba(${a[1]}, ${a[2]}, ${a[3]}, ${e})`;
  const t = r.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  return t ? `rgba(${t[1]}, ${t[2]}, ${t[3]}, ${e})` : r;
}
function he(r, e, a) {
  const t = ge(r, e), o = t.primary, p = t.secondary, s = ze[r][e ? "dark" : "light"].spikes;
  if (r === "mono")
    return ue(e, a);
  if (e) {
    const c = o, f = o, i = p, n = G(p, 0.49);
    return `radial-gradient(ellipse calc(0.8px * var(--beam-spike-${a})) calc(92px * var(--beam-h-${a})) at 8% calc(100% - 2px), ${c}, ${f} 30%, transparent 88%),
       radial-gradient(ellipse calc(10px * var(--beam-spike2-${a})) calc(35px * var(--beam-h-${a})) at 22% calc(100% - 4px), ${i}, ${n} 50%, transparent 95%),
       radial-gradient(ellipse calc(2px * (2 - var(--beam-spike-${a}))) calc(72px * var(--beam-h-${a})) at 36% calc(100% - 3px), ${s[0].color1}, ${s[0].color2} 40%, transparent 90%),
       radial-gradient(ellipse calc(14px * var(--beam-spike2-${a})) calc(28px * var(--beam-h-${a})) at 50% calc(100% - 2px), ${s[1].color1}, ${s[1].color2} 55%, transparent 96%),
       radial-gradient(ellipse calc(1.2px * (2 - var(--beam-spike2-${a}))) calc(85px * var(--beam-h-${a})) at 64% calc(100% - 4px), ${s[2].color1}, ${s[2].color2} 35%, transparent 89%),
       radial-gradient(ellipse calc(7px * var(--beam-spike-${a})) calc(45px * var(--beam-h-${a})) at 78% calc(100% - 2px), ${s[3].color1}, ${s[3].color2} 48%, transparent 94%),
       radial-gradient(ellipse calc(0.6px * (2 - var(--beam-spike-${a}))) calc(60px * var(--beam-h-${a})) at 92% calc(100% - 3px), ${s[4].color1}, ${s[4].color2} 42%, transparent 91%),
       radial-gradient(ellipse calc(21px * var(--beam-spike-${a})) calc(15px * var(--beam-spike2-${a})) at calc(var(--beam-x-${a}) * 100%) calc(100% + 1px), rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.5) 50%, transparent 100%),
       radial-gradient(ellipse calc(42px * var(--beam-w-${a})) calc(40px * var(--beam-h-${a})) at calc(var(--beam-x-${a}) * 100%) 100%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.12) 25%, rgba(255, 255, 255, 0.03) 55%, transparent 80%)`;
  } else {
    const c = o, f = G(o, 0.85), i = p, n = G(p, 0.7);
    return `radial-gradient(ellipse calc(0.8px * var(--beam-spike-${a})) calc(92px * var(--beam-h-${a})) at 8% calc(100% - 2px), ${c}, ${f} 30%, transparent 88%),
       radial-gradient(ellipse calc(10px * var(--beam-spike2-${a})) calc(35px * var(--beam-h-${a})) at 22% calc(100% - 4px), ${i}, ${n} 50%, transparent 95%),
       radial-gradient(ellipse calc(2px * (2 - var(--beam-spike-${a}))) calc(72px * var(--beam-h-${a})) at 36% calc(100% - 3px), ${s[0].color1}, ${s[0].color2} 40%, transparent 90%),
       radial-gradient(ellipse calc(14px * var(--beam-spike2-${a})) calc(28px * var(--beam-h-${a})) at 50% calc(100% - 2px), ${s[1].color1}, ${s[1].color2} 55%, transparent 96%),
       radial-gradient(ellipse calc(1.2px * (2 - var(--beam-spike2-${a}))) calc(85px * var(--beam-h-${a})) at 64% calc(100% - 4px), ${s[2].color1}, ${s[2].color2} 35%, transparent 89%),
       radial-gradient(ellipse calc(7px * var(--beam-spike-${a})) calc(45px * var(--beam-h-${a})) at 78% calc(100% - 2px), ${s[3].color1}, ${s[3].color2} 48%, transparent 94%),
       radial-gradient(ellipse calc(1px * (2 - var(--beam-spike-${a}))) calc(60px * var(--beam-h-${a})) at 92% calc(100% - 3px), ${s[4].color1}, ${s[4].color2} 42%, transparent 91%),
       radial-gradient(ellipse calc(50px * var(--beam-w-${a})) calc(32px * var(--beam-h-${a})) at calc(var(--beam-x-${a}) * 100%) calc(100%), rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.18) 30%, rgba(0, 0, 0, 0.03) 60%, transparent 85%)`;
  }
}
function ue(r, e) {
  return r ? `radial-gradient(ellipse calc(18px * var(--beam-spike-${e})) calc(30px * var(--beam-h-${e})) at 8% calc(100% - 2px), rgba(200, 200, 200, 0.35), rgba(200, 200, 200, 0.12) 50%, transparent 100%),
       radial-gradient(ellipse calc(14px * var(--beam-spike2-${e})) calc(28px * var(--beam-h-${e})) at 22% calc(100% - 4px), rgba(170, 170, 170, 0.3), rgba(170, 170, 170, 0.1) 50%, transparent 100%),
       radial-gradient(ellipse calc(16px * var(--beam-spike-${e})) calc(32px * var(--beam-h-${e})) at 36% calc(100% - 3px), rgba(190, 190, 190, 0.35), rgba(190, 190, 190, 0.12) 50%, transparent 100%),
       radial-gradient(ellipse calc(20px * var(--beam-spike2-${e})) calc(25px * var(--beam-h-${e})) at 50% calc(100% - 2px), rgba(180, 180, 180, 0.25), rgba(180, 180, 180, 0.08) 55%, transparent 100%),
       radial-gradient(ellipse calc(15px * var(--beam-spike2-${e})) calc(30px * var(--beam-h-${e})) at 64% calc(100% - 4px), rgba(185, 185, 185, 0.32), rgba(185, 185, 185, 0.1) 50%, transparent 100%),
       radial-gradient(ellipse calc(12px * var(--beam-spike-${e})) calc(28px * var(--beam-h-${e})) at 78% calc(100% - 2px), rgba(175, 175, 175, 0.28), rgba(175, 175, 175, 0.09) 50%, transparent 100%),
       radial-gradient(ellipse calc(17px * var(--beam-spike-${e})) calc(26px * var(--beam-h-${e})) at 92% calc(100% - 3px), rgba(195, 195, 195, 0.3), rgba(195, 195, 195, 0.1) 50%, transparent 100%),
       radial-gradient(ellipse calc(21px * var(--beam-spike-${e})) calc(15px * var(--beam-spike2-${e})) at calc(var(--beam-x-${e}) * 100%) calc(100% + 1px), rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.5) 50%, transparent 100%),
       radial-gradient(ellipse calc(42px * var(--beam-w-${e})) calc(40px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.12) 25%, rgba(255, 255, 255, 0.03) 55%, transparent 80%)` : `radial-gradient(ellipse calc(18px * var(--beam-spike-${e})) calc(30px * var(--beam-h-${e})) at 8% calc(100% - 2px), rgba(80, 80, 80, 0.3), rgba(80, 80, 80, 0.1) 50%, transparent 100%),
       radial-gradient(ellipse calc(14px * var(--beam-spike2-${e})) calc(28px * var(--beam-h-${e})) at 22% calc(100% - 4px), rgba(100, 100, 100, 0.25), rgba(100, 100, 100, 0.08) 50%, transparent 100%),
       radial-gradient(ellipse calc(16px * var(--beam-spike-${e})) calc(32px * var(--beam-h-${e})) at 36% calc(100% - 3px), rgba(70, 70, 70, 0.3), rgba(70, 70, 70, 0.1) 50%, transparent 100%),
       radial-gradient(ellipse calc(20px * var(--beam-spike2-${e})) calc(25px * var(--beam-h-${e})) at 50% calc(100% - 2px), rgba(90, 90, 90, 0.22), rgba(90, 90, 90, 0.07) 55%, transparent 100%),
       radial-gradient(ellipse calc(15px * var(--beam-spike2-${e})) calc(30px * var(--beam-h-${e})) at 64% calc(100% - 4px), rgba(85, 85, 85, 0.28), rgba(85, 85, 85, 0.09) 50%, transparent 100%),
       radial-gradient(ellipse calc(12px * var(--beam-spike-${e})) calc(28px * var(--beam-h-${e})) at 78% calc(100% - 2px), rgba(95, 95, 95, 0.24), rgba(95, 95, 95, 0.08) 50%, transparent 100%),
       radial-gradient(ellipse calc(17px * var(--beam-spike-${e})) calc(26px * var(--beam-h-${e})) at 92% calc(100% - 3px), rgba(75, 75, 75, 0.26), rgba(75, 75, 75, 0.08) 50%, transparent 100%),
       radial-gradient(ellipse calc(50px * var(--beam-w-${e})) calc(32px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) calc(100%), rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.18) 30%, rgba(0, 0, 0, 0.03) 60%, transparent 85%)`;
}
function ke(r) {
  const { size: e } = r;
  return e === "line" ? we(r) : e === "sm" ? ve(r) : ye(r);
}
function ve(r) {
  const {
    id: e,
    borderRadius: a,
    borderWidth: t,
    duration: o,
    strokeOpacity: p,
    innerOpacity: m,
    bloomOpacity: s,
    innerShadow: $,
    colorVariant: c,
    staticColors: f,
    brightness: i,
    saturation: n,
    hueRange: l,
    theme: Y,
    beamLength,
    paletteOverride,
    glowDepth,
    whiteSheen,
    startAngle
  } = r, g = Math.max(0, a - t), b = c === "mono" ? 0.5 : 1, z = p * b, H = m * b, d = s * b, k = f ? "" : `animation: beam-hue-shift-${e} 12s ease-in-out infinite;`, v = f ? "" : `
@keyframes beam-hue-shift-${e} {
  0% { filter: hue-rotate(-${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  50% { filter: hue-rotate(${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  100% { filter: hue-rotate(-${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
}`, y = Y === "dark", angleExpr = startAngle ? `calc(var(--beam-angle-${e}) + ${startAngle}deg)` : `var(--beam-angle-${e})`, W = __strokeSheen(angleExpr, y, whiteSheen), h = pe(c, paletteOverride, glowDepth), X = le(c, paletteOverride, glowDepth), x = __bloomSheen(angleExpr, y, whiteSheen), F = __beamMask(e, beamLength, angleExpr);
  return `
@property --beam-angle-${e} {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --beam-opacity-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${e}"] {
  position: relative;
  border-radius: ${a}px;
  overflow: hidden;
}

[data-beam="${e}"][data-active] {
  animation:
    beam-spin-${e} ${o}s linear infinite,
    beam-fade-in-${e} 0.6s ease forwards;
}

[data-beam="${e}"][data-fading] {
  animation:
    beam-spin-${e} ${o}s linear infinite,
    beam-fade-out-${e} 0.5s ease forwards;
}

[data-beam="${e}"][data-active]::after,
[data-beam="${e}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${g}px;
  padding: ${t}px;
  clip-path: inset(0 round ${a}px);
  background: ${W},${h};
  -webkit-mask:
    ${F},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    ${F},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${e}) * ${z.toFixed(2)} * var(--beam-strength, 1));
  ${k}
}

[data-beam="${e}"][data-active]::before,
[data-beam="${e}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${a}px;
  clip-path: inset(0 round ${a}px);
  background: ${X};
  box-shadow: inset 0 0 5px 1px ${$};
  -webkit-mask-image: ${F};
  -webkit-mask-composite: source-over;
  mask-image: ${F};
  mask-composite: add;
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${e}) * ${H.toFixed(2)} * var(--beam-strength, 1));
  ${k}
}

[data-beam="${e}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${g}px;
  clip-path: inset(0 round ${a}px);
  background: ${x};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: ${t}px;
  filter: blur(8px) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)});
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${e}"][data-active] [data-beam-bloom],
[data-beam="${e}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${e}) * ${d.toFixed(2)} * var(--beam-strength, 1));
}

@keyframes beam-spin-${e} {
  to { --beam-angle-${e}: 360deg; }
}

@keyframes beam-fade-in-${e} {
  to { --beam-opacity-${e}: 1; }
}

@keyframes beam-fade-out-${e} {
  from { --beam-opacity-${e}: 1; }
  to { --beam-opacity-${e}: 0; }
}
${v}
`;
}
function ye(r) {
  const {
    id: e,
    borderRadius: a,
    borderWidth: t,
    duration: o,
    strokeOpacity: p,
    innerOpacity: m,
    bloomOpacity: s,
    innerShadow: $,
    colorVariant: c,
    staticColors: f,
    brightness: i,
    saturation: n,
    hueRange: l,
    theme: Y,
    beamLength,
    paletteOverride,
    glowDepth,
    whiteSheen,
    startAngle
  } = r, g = Math.max(0, a - t), b = c === "mono" ? 0.5 : 1, z = p * b, H = m * b, d = s * b, k = f ? "" : `animation: beam-hue-shift-${e} 12s ease-in-out infinite;`, v = f ? "" : `
@keyframes beam-hue-shift-${e} {
  0% { filter: hue-rotate(-${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  50% { filter: hue-rotate(${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  100% { filter: hue-rotate(-${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
}`, y = Y === "dark", angleExpr = startAngle ? `calc(var(--beam-angle-${e}) + ${startAngle}deg)` : `var(--beam-angle-${e})`, W = __strokeSheen(angleExpr, y, whiteSheen), h = be(c, paletteOverride), X = fe(c, paletteOverride, glowDepth), x = __bloomSheen(angleExpr, y, whiteSheen), F = __beamMask(e, beamLength, angleExpr);
  return `
@property --beam-angle-${e} {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --beam-opacity-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${e}"] {
  position: relative;
  border-radius: ${a}px;
  overflow: hidden;
}

[data-beam="${e}"][data-active] {
  animation:
    beam-spin-${e} ${o}s linear infinite,
    beam-fade-in-${e} 0.6s ease forwards;
}

[data-beam="${e}"][data-fading] {
  animation:
    beam-spin-${e} ${o}s linear infinite,
    beam-fade-out-${e} 0.5s ease forwards;
}

[data-beam="${e}"][data-active]::after,
[data-beam="${e}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${g}px;
  padding: ${t}px;
  clip-path: inset(0 round ${a}px);
  background: ${W},${h};
  -webkit-mask:
    ${F},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    ${F},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${e}) * ${z.toFixed(2)} * var(--beam-strength, 1));
  ${k}
}

[data-beam="${e}"][data-active]::before,
[data-beam="${e}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${a}px;
  background: ${X};
  box-shadow: inset 0 0 9px 1px ${$};
  -webkit-mask-image:
    ${F},
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  -webkit-mask-composite: source-in, source-over;
  mask-image:
    ${F},
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  mask-composite: intersect, add;
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${e}) * ${H.toFixed(2)} * var(--beam-strength, 1));
  clip-path: inset(0 round ${a}px);
  ${k}
}

[data-beam="${e}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${g}px;
  clip-path: inset(0 round ${a}px);
  background: ${x};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: ${t}px;
  filter: blur(8px) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)});
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${e}"][data-active] [data-beam-bloom],
[data-beam="${e}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${e}) * ${d.toFixed(2)} * var(--beam-strength, 1));
}

@keyframes beam-spin-${e} {
  to { --beam-angle-${e}: 360deg; }
}

@keyframes beam-fade-in-${e} {
  to { --beam-opacity-${e}: 1; }
}

@keyframes beam-fade-out-${e} {
  from { --beam-opacity-${e}: 1; }
  to { --beam-opacity-${e}: 0; }
}
${v}
`;
}
function we(r) {
  const {
    id: e,
    borderRadius: a,
    borderWidth: t,
    duration: o,
    strokeOpacity: p,
    innerOpacity: m,
    bloomOpacity: s,
    innerShadow: $,
    colorVariant: c,
    staticColors: f,
    brightness: i,
    saturation: n,
    hueRange: l,
    theme: Y
  } = r, g = Math.max(0, a - t), b = Y === "dark", z = p, H = m, d = s, k = f ? "" : `animation: beam-hue-shift-${e} 12s ease-in-out infinite;`, v = f ? "" : `animation: beam-hue-shift-bloom-${e} 8s ease-in-out infinite;`, y = f ? "" : `
@keyframes beam-hue-shift-${e} {
  0% { filter: hue-rotate(-${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  50% { filter: hue-rotate(${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  100% { filter: hue-rotate(-${l}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
}

@keyframes beam-hue-shift-bloom-${e} {
  0% { filter: blur(8px) hue-rotate(-${l + 10}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  50% { filter: blur(8px) hue-rotate(${l + 10}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
  100% { filter: blur(8px) hue-rotate(-${l + 10}deg) brightness(${i.toFixed(2)}) saturate(${n.toFixed(2)}); }
}`, W = b ? `radial-gradient(
        ellipse calc(24px * var(--beam-w-${e})) calc(28px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) calc(100% + 2px),
        rgba(255, 255, 255, 0.38) 0%,
        rgba(255, 255, 255, 0.12) 30%,
        transparent 65%
      )` : `radial-gradient(
        ellipse calc(35px * var(--beam-w-${e})) calc(28px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) calc(100% + 2px),
        rgba(0, 0, 0, 0.6) 0%,
        rgba(0, 0, 0, 0.25) 35%,
        transparent 70%
      )`, h = de(c, b, e), X = $e(c, e), x = he(c, b, e);
  return `
@property --beam-x-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

@property --beam-w-${e} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-h-${e} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-spike-${e} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-spike2-${e} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-edge-${e} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-opacity-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${e}"] {
  position: relative;
  border-radius: ${a}px;
  overflow: hidden;
}

[data-beam="${e}"][data-active] {
  animation:
    beam-travel-${e} ${o}s linear infinite,
    beam-edge-fade-${e} ${o}s linear infinite,
    beam-breathe-${e} ${(o * 1.3).toFixed(1)}s ease-in-out infinite,
    beam-spike-${e} ${(o * 1.33).toFixed(1)}s ease-in-out infinite,
    beam-spike2-${e} ${(o * 1.7).toFixed(1)}s ease-in-out infinite,
    beam-fade-in-${e} 0.6s ease forwards;
}

[data-beam="${e}"][data-fading] {
  animation:
    beam-travel-${e} ${o}s linear infinite,
    beam-edge-fade-${e} ${o}s linear infinite,
    beam-breathe-${e} ${(o * 1.3).toFixed(1)}s ease-in-out infinite,
    beam-spike-${e} ${(o * 1.33).toFixed(1)}s ease-in-out infinite,
    beam-spike2-${e} ${(o * 1.7).toFixed(1)}s ease-in-out infinite,
    beam-fade-out-${e} 0.5s ease forwards;
}

[data-beam="${e}"][data-active]::after,
[data-beam="${e}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${g}px;
  padding: ${t}px;
  clip-path: inset(0 round ${a}px);
  background: ${W}, ${h};
  -webkit-mask:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${e})) calc(60px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${e})) calc(60px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${e}) * var(--beam-edge-${e}) * ${z.toFixed(2)} * var(--beam-strength, 1));
  ${k}
}

[data-beam="${e}"][data-active]::before,
[data-beam="${e}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${a}px;
  background: ${X};
  box-shadow: inset 0 0 9px 1px ${$};
  -webkit-mask-image:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${e})) calc(60px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  -webkit-mask-composite: source-in, source-over;
  mask-image:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${e})) calc(60px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  mask-composite: intersect, add;
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${e}) * var(--beam-edge-${e}) * ${H.toFixed(2)} * var(--beam-strength, 1));
  clip-path: inset(0 round ${a}px);
  ${k}
}

[data-beam="${e}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${g}px;
  clip-path: inset(0 round ${a}px);
  padding: 0;
  -webkit-mask: radial-gradient(
    ellipse calc(84px * var(--beam-w-${e})) calc(110px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%,
    white 0%, rgba(255, 255, 255, 0.5) 35%, transparent 100%
  );
  -webkit-mask-composite: source-over;
  mask: radial-gradient(
    ellipse calc(84px * var(--beam-w-${e})) calc(110px * var(--beam-h-${e})) at calc(var(--beam-x-${e}) * 100%) 100%,
    white 0%, rgba(255, 255, 255, 0.5) 35%, transparent 100%
  );
  mask-composite: add;
  background: ${x};
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${e}"][data-active] [data-beam-bloom],
[data-beam="${e}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${e}) * var(--beam-edge-${e}) * ${d.toFixed(2)} * var(--beam-strength, 1));
  ${v}
}

@keyframes beam-travel-${e} {
  0%   { --beam-x-${e}: 0.06;  --beam-w-${e}: 0.5; }
  10%  { --beam-x-${e}: 0.15;  --beam-w-${e}: 0.8; }
  20%  { --beam-x-${e}: 0.25;  --beam-w-${e}: 1.1; }
  30%  { --beam-x-${e}: 0.35;  --beam-w-${e}: 1.3; }
  40%  { --beam-x-${e}: 0.44;  --beam-w-${e}: 1.45; }
  50%  { --beam-x-${e}: 0.5;   --beam-w-${e}: 1.5; }
  60%  { --beam-x-${e}: 0.56;  --beam-w-${e}: 1.45; }
  70%  { --beam-x-${e}: 0.65;  --beam-w-${e}: 1.3; }
  80%  { --beam-x-${e}: 0.75;  --beam-w-${e}: 1.1; }
  90%  { --beam-x-${e}: 0.85;  --beam-w-${e}: 0.8; }
  100% { --beam-x-${e}: 0.94;  --beam-w-${e}: 0.5; }
}

@keyframes beam-edge-fade-${e} {
  0%    { --beam-edge-${e}: 0; }
  12.5% { --beam-edge-${e}: 0; }
  32.5% { --beam-edge-${e}: 1; }
  67.5% { --beam-edge-${e}: 1; }
  87.5% { --beam-edge-${e}: 0; }
  100%  { --beam-edge-${e}: 0; }
}

@keyframes beam-breathe-${e} {
  0%, 100% { --beam-h-${e}: 0.8; }
  25%      { --beam-h-${e}: 1.25; }
  55%      { --beam-h-${e}: 0.85; }
  80%      { --beam-h-${e}: 1.3; }
}

@keyframes beam-spike-${e} {
  0%   { --beam-spike-${e}: 0.8; }
  25%  { --beam-spike-${e}: 1.3; }
  50%  { --beam-spike-${e}: 0.9; }
  75%  { --beam-spike-${e}: 1.4; }
  100% { --beam-spike-${e}: 0.8; }
}

@keyframes beam-spike2-${e} {
  0%   { --beam-spike2-${e}: 1.2; }
  25%  { --beam-spike2-${e}: 0.7; }
  50%  { --beam-spike2-${e}: 1.4; }
  75%  { --beam-spike2-${e}: 0.8; }
  100% { --beam-spike2-${e}: 1.2; }
}

@keyframes beam-fade-in-${e} {
  to { --beam-opacity-${e}: 1; }
}

@keyframes beam-fade-out-${e} {
  from { --beam-opacity-${e}: 1; }
  to { --beam-opacity-${e}: 0; }
}
${y}
`;
}
// React component lives in BorderBeam.tsx — exports below are the data
// tables (sizePresets, sizeThemePresets) and the CSS generator (ke).
export const sizePresets = ce
export const sizeThemePresets = I
export const generateBeamCSS = ke
// Color tables (potentially exposed for future per-color tuning UI):
export const borderColorPalettes = B
export const innerColorPalettes = A
export const lineColorPalettes = me
export const lineInnerColorPalettes = xe
export const lineSpikeColorPalettes = ze
// (The original bundled React component lived here — removed in favor
// of the cleaner BorderBeam.tsx wrapper that consumes the named exports
// above.)
