import type { CSSProperties, JSX } from 'react'

interface VimyasaMarkProps {
  size?: number
  style?: CSSProperties
}

// Vimyasa V mark, lifted from resources/tray-icon.svg. Inlined so it can
// scale freely and so we don't have to wrangle asset paths between dev
// and packaged renderer bundles. Default verticalAlign nudges the glyph
// into the visual midline of surrounding text — used when the mark
// appears inline inside body copy. Flex containers ignore vertical-align,
// so this default is safe when the mark is wrapped in .onb-mark too.
export function VimyasaMark({ size = 32, style }: VimyasaMarkProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      aria-hidden="true"
      role="presentation"
      // display: inline-block overrides Tailwind's preflight svg { display: block }
      // which is what was forcing "Click the / [V] / icon..." onto three separate
      // lines. With inline-block the SVG flows as a single glyph in the text.
      style={{ display: 'inline-block', verticalAlign: '-0.18em', ...style }}
    >
      <path
        fill="#ffffff"
        d="M214.05,118.35c-.18,2.57-.55,5.5-.92,8.63v.18c-1.28,11.93-3.85,26.62-10.28,38.37-4.96,9.18-12.48,16.71-23.32,19.46-16.16,3.31-26.81-9.18-33.6-26.07-9.18,18.73-15.17,31.87-20.12,39.76-15.45,24.23-26.88,18.1-33.92-12.12-1.82-7.27-18.08-93.62-19.6-100.39-1.53-6.76-4.43-10.73-10.47-8.81-2.57.91-6.41,4.28-9.55,7.89-4.04,4.41-9.55,14.51-12.85,20.2-1.29,2.38-2.02,4.04-2.02,4.04.18-2.76.37-5.88.73-9.18,1.47-11.94,4.22-26.44,10.47-38.01,4.96-9.18,12.48-16.71,23.32-19.46,15.97-3.3,26.62,9.18,33.6,25.89,11.38,26.99,15.45,50.89,15.45,50.89,0,0,8.78-19.69,19.99-47.25,9.09-22.72,24.53-17.27,27.94,7.95,4.77,28.4,8.87,52.17,9.79,58.23,1.94,11.02,11.66,13.45,20.49,4.02,4.04-4.59,9.73-14.68,12.67-20.38,1.28-2.39,2.2-3.85,2.2-3.85Z"
      />
    </svg>
  )
}
