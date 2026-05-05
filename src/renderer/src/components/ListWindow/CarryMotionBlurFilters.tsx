// SVG filter defs for the carry-mode tier-3 trailing motion blur.
// Mounted inside the list window's render tree so the filter and the
// row it filters live in the same document (filter URLs are document-
// scoped). Two separate filters because feOffset has a fixed direction
// per filter — a left-trail and a right-trail.
//
// JS (playBlurRamp in useCarryAnimation) ramps each filter's
// feGaussianBlur stdDeviation X attribute AND the feColorMatrix alpha
// (4th row, 4th column) over the first ~CARRY_BLUR_RAMP_FRACTION of
// the send duration. Both start at 0:
//   - stdDeviation 0 = no blur (trail would be sharp duplicate)
//   - alpha matrix multiplier 0 = trail invisible
// Ramping both together hides the "sharp-duplicate" frames while the
// blur is still building. By the time the trail is visible (alpha > 0),
// it's also blurred enough to read as motion smear rather than ghost.
//
// Filter region (x/y/width/height) is enlarged so the offset trail
// doesn't get clipped against the element's natural bounds. The
// element's CSS box still clips the original via the parent's
// overflow-x: hidden — the trail extends INTO the row's already-
// translated position, not past the scroll container's edges.
const ALPHA_MATRIX_INVISIBLE =
  '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 0'

export function CarryMotionBlurFilters(): JSX.Element {
  return (
    <svg
      width={0}
      height={0}
      style={{ position: 'absolute', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        {/* Trail extends LEFT — for a row moving RIGHT (target ranks higher) */}
        <filter
          id="carry-trail-right"
          x="-50%"
          y="-25%"
          width="200%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0 0" result="blur" />
          <feOffset in="blur" dx={-14} dy={0} result="offset" />
          <feColorMatrix
            in="offset"
            type="matrix"
            values={ALPHA_MATRIX_INVISIBLE}
            result="trail"
          />
          <feMerge>
            <feMergeNode in="trail" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Trail extends RIGHT — for a row moving LEFT (target ranks lower) */}
        <filter
          id="carry-trail-left"
          x="-50%"
          y="-25%"
          width="200%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0 0" result="blur" />
          <feOffset in="blur" dx={14} dy={0} result="offset" />
          <feColorMatrix
            in="offset"
            type="matrix"
            values={ALPHA_MATRIX_INVISIBLE}
            result="trail"
          />
          <feMerge>
            <feMergeNode in="trail" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
