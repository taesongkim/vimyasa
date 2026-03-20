# Justin's Design System

A living document capturing the aesthetic DNA across justinjustinjustin.com projects. Use this to guide the visual style of new Claude-built projects so they feel native to the portfolio.

---

## Core Philosophy

The aesthetic is **quiet precision**. Every element earns its space through restraint — muted colors, careful opacity layering, and transitions that feel physical but never showy. The vibe is a dark workshop where tools are organized and lighting is intentional. Nothing glows unless it means something.

---

## Color System

### Backgrounds (darkest to lightest)

| Token | Hex | Usage |
|-------|-----|-------|
| bg | `#0a0a0a` / `#0d0d0d` | Page background |
| surface | `#111111` – `#161616` | Cards, inputs, panels |
| surface-hover | `#191919` – `#1a1a1a` | Hover lift on surfaces |
| border | `#1e1e1e` – `#222222` | Default borders |
| border-focus | `#333333` – `#3a3a3a` | Active/focused borders |

### Text (brightest to dimmest)

| Level | Hex | Opacity | Usage |
|-------|-----|---------|-------|
| primary | `#e0e0e0` / `#d4d4d4` | 1.0 | Headings, active text |
| secondary | `#777777` – `#888888` | ~0.7 | Supporting text, labels |
| muted | `#444444` – `#4a4a4a` | ~0.35 | Disabled, placeholder |
| ghost | `rgba(212,212,212,0.2)` | 0.2 | Ghost text, hints |

### Accent Colors (used sparingly, for semantic meaning only)

| Purpose | Color |
|---------|-------|
| Interactive/accent | `#60a5fa` (blue) |
| Success/complete | `#4ade80` (green) |
| Warning/caution | `#fb923c` (orange) |
| Error | `#f87171` (red) |
| Learned/creative | `#a78bfa` (purple) |

**Key pattern:** Accents are never used for decoration. They signal state — checked, completed, cautioned, errored. The default UI is entirely grayscale.

---

## Typography

### Font Stack

| Role | Font | CSS Variable |
|------|------|-------------|
| Body/UI | Inter | `--font-sans` / `--font-inter` |
| Display/Nav | Inter Tight | `--font-tight` / `--font-inter-tight` |
| Code/Timers | SF Mono → Fira Code → Roboto Mono | `--font-mono` |

### Size Scale

| Context | Size | Weight | Letter-spacing |
|---------|------|--------|----------------|
| Page heading | 28px | 600 | -0.02em |
| Section title | 16px | 500 | — |
| Body text | 14–16px | 400 | — |
| UI labels | 13px | 400–500 | — |
| Nav title (Inter Tight) | 14px | 500 | 0.04em |
| Small labels / uppercase | 11px | 500 | 0.04–0.06em |
| Micro labels | 10px | 500 | 0.06–0.12em |
| Monospace readouts | 12–14px | 400 | 0.04–0.05em |

### Line Heights

| Context | Value |
|---------|-------|
| Compact UI (task items) | 20px (fixed) |
| Body / editor text | 1.6–1.8 |
| Headings | 1.2–1.4 |
| Monospace/timer | 1.0 |

**Key pattern:** Uppercase labels always pair with wide letter-spacing (0.04em+). Body text uses negative tracking on headings (-0.02em) to feel tighter and more intentional. Inter Tight is reserved for display moments (nav titles, stopwatch, session headers) — never for body.

---

## Spacing & Padding

### Consistent Values

The designer gravitates toward specific spacing values. These are not a strict 4px/8px grid but a repeating vocabulary:

| Value | Usage |
|-------|-------|
| 2px | Gap between tightly packed buttons, line spacing |
| 4px | Inner padding (checkboxes, control rows), small gaps |
| 6px | Gap between flex items (buttons, labels), field label-to-input |
| 8px | Notification feed gap, compact stack gaps, button padding vertical |
| 10–12px | Input padding, dropdown item padding, card grid gap, section gaps |
| 14–16px | Input horizontal padding, card internal padding, section separation |
| 20px | Card padding, editor padding, section margins |
| 24px | Shell padding horizontal, modal padding, nav gap |
| 48px | Shell padding vertical, nav margin-bottom, major section breaks |
| 64px | Content column gap (desktop) |

### Alignment Preferences

**Left-alignment is king.** Content always aligns left. No centered layouts except modals (which use `translate(-50%, -50%)`). The welcome text on the homepage uses `clamp(24px, 25%, 360px)` left padding — pushed in from the edge but never centered.

**Vertical centering** is done via flexbox `justify-content: center` on columns, not magic numbers. Items in rows use `align-items: flex-start` (not center) — text baselines matter more than geometric centering. Checkboxes get a manual `paddingTop: 5px` to align with the first text line.

**Feed/list items** always have consistent vertical rhythm: `gap: 8px` between cards, `gap: 2px` between compact rows.

---

## Borders & Radius

| Context | Radius |
|---------|--------|
| Checkboxes | 3px |
| Small buttons, inputs, badges | 4px |
| Tooltips, item rows | 5–6px |
| Cards, editors | 8px |
| Modals, major panels, highlight modals | 8–12px |
| Pill shapes (toggles, sliders) | 10px / 100px |

**Key pattern:** Borders are always 1px, always `var(--border)` color. They brighten on focus/hover to `var(--border-focus)`. No thick borders, no colored borders except for semantic left-edge indicators (active tab: `2px solid accent`). Box shadows are rare and always subtle.

---

## Opacity as a Design Language

This is the most distinctive pattern. Instead of changing colors or hiding elements, the designer **layers opacity** to create hierarchy:

### Text/Item State Opacity

| State | Opacity |
|-------|---------|
| Active/normal | 1.0 |
| Secondary (checked) | 0.6 |
| Waiting/pending | 0.7 |
| Put-aside/disabled | 0.35 |
| Inactive UI controls | 0.35 |
| Hidden (drag handle, edit button) | 0.0 → appears on hover |

### Surface Opacity

| Element | Value |
|---------|-------|
| Card background | `rgba(255,255,255, 0.03–0.04)` |
| Card border | `rgba(255,255,255, 0.07–0.08)` |
| Hover highlight on items | `rgba(255,255,255, 0.015)` |
| Active tab/button | `rgba(255,255,255, 0.04–0.1)` |
| Modal backdrop | `rgba(0,0,0, 0.15–0.5)` |
| Selection highlight | `rgba(255,255,255, 0.15)` |

**Key pattern:** Elements appear and disappear through opacity transitions rather than display toggling. Drag handles, edit buttons, and start-session arrows are `opacity: 0` by default and fade in on hover. This keeps the interface clean but discoverable.

---

## Transitions & Motion

### Standard Durations

| Duration | Usage |
|----------|-------|
| 0.1s | Dropdown show/hide, fast micro-feedback |
| 0.15s | **Default** — color, opacity, background, border, transform |
| 0.2s | Panel slide, privacy slider, slightly heavier interactions |
| 0.25s | Hover background fade-in, start-session arrow reveal |
| 0.3s | Page transitions, slide panel navigation |
| 0.35s | Notification card entrance |
| 0.5s | Hero text entrance |

### Easing

| Curve | Usage |
|-------|-------|
| `ease` / `easeOut` | Default for most transitions |
| `cubic-bezier(0.25, 0.1, 0.25, 1)` | Writual panel slides, privacy animations — slightly snappier than ease |
| `easeInOut` | Page transitions |

### Framer Motion Patterns

Entrances always follow: `opacity: 0, y: 6–12` → `opacity: 1, y: 0`. The Y offset is small (6–12px), never dramatic. Stagger delay between list items is `0.05s` (50ms).

Exits mirror entrances but slide in the opposite Y direction.

**Key pattern:** Motion is always subtle and directional (vertical). No horizontal slides on content, no scale bounces, no rotation. The only scale animation is modal entry (`0.95 → 1.0`), and even that is barely perceptible.

---

## Glass & Texture

### Glassmorphism

Two tiers of glass effect:

| Tier | Blur | Background | Usage |
|------|------|------------|-------|
| Heavy | `blur(7–18px) saturate(160%)` | `rgba(255,255,255, 0.04)` | Notification cards, modals |
| Light | `blur(2–4px)` | `rgba(255,255,255, 0.012–0.03)` | Info panels, material cards |

Always include `-webkit-backdrop-filter` alongside `backdrop-filter` for Safari.

### Dust Texture (Writual-specific)

Writual layers a dust/grain texture image over surfaces via `mix-blend-mode: screen` at low opacity (0.15–0.35). This adds analog warmth to the digital dark theme. Other projects don't use this — it's specific to writual's contemplative mood.

---

## Shadows

Shadows are used sparingly. When they appear, they're always black/dark, never colored (except for semantic glow):

| Context | Shadow |
|---------|--------|
| Tooltip | `0 2px 8px rgba(0,0,0, 0.4)` |
| Panel/directory | `0 16px 48px rgba(0,0,0, 0.3)` |
| Caution glow | `0 0 8px rgba(251,146,60, 0.3)` — pulsing |
| Card hover glow | `0 0 4px rgba(255,255,255, 0.25)` — via `--card-glow` |
| Favorite indicator | `0 0 6px currentColor` — colored per-card |

---

## Scrollbar Styling

Always custom-styled. Thin, unobtrusive:

| Property | Value |
|----------|-------|
| Width | 4–6px |
| Track | transparent |
| Thumb | `#222222` – `#2a2a2a`, border-radius 2–3px |
| Thumb hover | `#2e2e2e` – `#3a3a3a` |
| Firefox | `scrollbar-width: thin; scrollbar-color: #222 transparent` |

---

## Z-Index Layering

| Layer | Z-Index | Content |
|-------|---------|---------|
| Background | -1 to 1 | DottedSurface, texture overlays |
| Base content | 10 | Main content, feeds |
| Navigation | 20 | Top bar, dropdowns |
| Dropdown menus | 50 | Within nav stacking context |
| Tooltips | 100 | Floating labels |
| Modals/overlays | 1000–1001 | Backdrops and panels |

---

## Blind Spots & Inefficiencies

### What could be tightened

1. **No shared design tokens file.** Nested-tasks uses `--nt-*` variables, writual uses `--w-*` variables, and the homepage uses hardcoded hex values. A shared `tokens.css` with the base palette would reduce drift between projects.

2. **Inline styles vs CSS.** The homepage (`page.tsx`) uses almost entirely inline styles, while nested-tasks and writual use CSS classes. This makes the homepage harder to maintain and theme. A `home.css` file would be more consistent.

3. **Inconsistent border-radius.** Nested-tasks uses 3–6px, writual uses 4–8px, homepage dropdown uses 5–8px. These are close but not identical. Standardizing on 4px (small) / 8px (medium) / 12px (large) would unify things.

4. **Hover state inconsistency.** Some hover states use background color changes, others use opacity changes, others use border color changes. The best pattern (used in nested-tasks) is opacity-based — it's the most visually consistent with the overall aesthetic.

5. **Transition timing.** Both projects converge on 150ms as the default, but the homepage uses `0.1s` and `0.15s` interchangeably. Standardize on `150ms ease` everywhere.

6. **Scrollbar duplication.** The scrollbar styles are copy-pasted across globals.css and each project's CSS. Extract to a shared utility class.

7. **Font size gaps.** There's no 15px in nested-tasks but writual uses it for highlights. The scale jumps from 14 → 16 in nested-tasks. Pick lanes: 11, 13, 14, 16 for consistency, with 10px as the floor.

---

## Electron App Considerations

If porting this aesthetic to an Electron desktop app:

### What changes

1. **No `backdrop-filter` reliability.** Electron's Chromium supports it, but performance varies by OS and GPU. On Windows with certain GPUs, `backdrop-filter: blur()` can cause frame drops. Test early. Fallback: use solid semi-transparent backgrounds (`rgba(20,20,20,0.85)`) instead of glass.

2. **`position: fixed` behaves differently.** In Electron, the entire window is your viewport — there's no browser chrome. `position: fixed` works but be aware there's no URL bar eating space. Your `100vh` is truly 100% of the window.

3. **Scrollbar styling.** Webkit scrollbar pseudo-elements work in Electron (it's Chromium), but you may want to implement custom scrollbar components for smoother behavior and consistent cross-platform look. macOS overlays scrollbars by default; Windows shows them persistently.

4. **Window dragging.** You'll need a `-webkit-app-region: drag` zone for the title bar. The current nav bar (`padding: 22px 32px`) is a natural candidate but you need to make buttons within it `-webkit-app-region: no-drag` so they remain clickable.

5. **Font rendering.** Inter renders slightly differently across macOS (Core Text) and Windows (DirectWrite). On Windows, light-weight text on dark backgrounds can look thinner/fainter. Consider bumping `font-weight` by one step on Windows, or using `-webkit-font-smoothing: antialiased` (macOS) and `font-smooth: always` carefully.

6. **DPI/scaling.** Electron handles `devicePixelRatio` natively, but your Three.js `DottedSurface` already reads it. No change needed there. However, test on 125% and 150% Windows scaling — padding and font sizes may need adjustment.

7. **Performance.** The Three.js particle animation runs a full render loop at 60fps. In a browser tab, the OS throttles background tabs. In Electron, a hidden window might still consume GPU. Add `document.hidden` detection to pause the animation when the app is not visible.

8. **Native context menus.** Right-click behavior differs. The browser swallows right-clicks on custom UI. In Electron, you'll get native OS context menus unless you explicitly prevent them (`e.preventDefault()` on `contextmenu`).

9. **CSS `env(safe-area-inset-*)`.** Not relevant in Electron on desktop, but if you ever target Electron on a device with a notch or rounded corners, you'd need these. Safe to ignore for now.

10. **File system access.** If the app reads/writes local files (unlike the web version), you gain native file dialogs and drag-and-drop from Finder/Explorer. Style the drop zones to match the card hover glow pattern (`0 0 4px rgba(255,255,255,0.25)`).

### What stays the same

The entire color system, typography, spacing, opacity language, transition timing, and motion patterns transfer directly. The aesthetic is CSS-first and doesn't depend on any web-specific APIs. The dark theme works naturally in a frameless Electron window — it'll feel like a native dark-mode app.
