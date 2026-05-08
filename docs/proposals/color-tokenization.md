# Proposal: Color tokenization + light/dark mode + cross-project shared system

**Status:** approved on shape (six load-bearing decisions locked 2026-05-08); awaiting copy + naming sign-off
**Lane:** coordination (this proposal); themes + features (implementation phases); cross-project (extracted system)
**Target version:** v0.1.7 onward, phased
**Author:** coordination lane

## What

Reshape vimyasa's interface colors into a **token-based system** that:

- Supports both **light and dark modes** with full legibility (reverses the dark-mode-only-by-intent posture set in v0.1.0)
- Is **structured for future "color modes"** — themes that auto-derive interface tokens from their primary hue (using OKLCH component-decomposition)
- **Lives in a separate private repo** so vimyasa, Writual, and future projects consume the same token taxonomy
- Excludes the **theme-specific rainbow effects** (Theme 1 Magic Colors, future themed visuals) — those stay project-specific

Plus a near-term concrete slice: **darken the current dark-mode interface backgrounds** while preserving translucency, with a temporary dev-panel slider to dial in the value before baking.

## Why

- **Light mode** has been deferred since v0.1.0 with the dark-mode-only stance; testers ask for it and macOS users expect parity. Reversing the stance now is cheaper than retrofitting later.
- **Cross-project consistency.** Writual is being prepped for Electron wrap; without a shared token system, both projects would drift on color decisions and end up with two different design vocabularies. Pay the extraction cost once, save it forever.
- **Future color modes.** Justin has flagged interest in optional color-mode themes that derive interface UI from a primary hue. OKLCH-component-referenced tokens make that derivation mechanically trivial; flat color values would require per-mode hand-tuning.
- **Concrete near-term win.** The current dark-mode background isn't dark enough — feedback acknowledged. Fixable today with a slider while the bigger work goes through phases.

## Decisions made (with rationale)

All six locked 2026-05-08 in the design conversation.

### 1. Light mode supported (reverses v0.1.0 stance)

Both light and dark are first-class going forward. The dark-mode-only memory entry in `~/.claude/projects/-Users-taesongkim-DevProjects2-vimyasa/memory/user_role.md` should be updated post-merge.

### 2. Cross-project mechanism: separate private repo

Token system lives in its own private repo (proposed name:
`design-tokens-justin` — final name your call). Mechanism:

- v1: published as a private npm package, consumed via `npm install @taesongkim/design-tokens`
- Or: linked locally via `npm link` if package publishing feels like overhead in v1
- Vimyasa pulls from the package; Writual will too once it's set up.

Fallback if you want to delay packaging: ship the tokens inline in
vimyasa as v1, extract to package after light mode lands (Phase 3
in the phasing below). Both paths reach the same destination.

### 3. Token taxonomy: three layers

```
Layer 1: Raw palette        (--gray-50 through --gray-900, --hue-blue-base, etc.)
Layer 2: Semantic tokens    (--color-bg-base, --color-bg-surface,
                             --color-text-primary, --color-border-subtle, ...)
Layer 3: Component shims    (--list-window-bg = var(--color-bg-base))
                            Optional; only when a component needs
                            divergence from semantic.
```

- **Light vs. dark** swaps Layer 2's mapping (semantic → palette).
- **Component shims** (Layer 3) stay stable; components reference
  shims OR semantic directly when no shim is needed.
- **Future color modes** swap Layer 2's hue/chroma without changing
  Layer 1 or Layer 3.

### 4. Light/dark switching: system + override

Default: follow `prefers-color-scheme` (macOS system setting).
Override: app setting (Settings → Appearance → "Theme: Auto / Light /
Dark"). Three values: `auto` (default) / `light` / `dark`.

Persistence: existing themes-store gets an `appearance` field
alongside `activeTheme`. Migrations preserve existing user state.

### 5. Token shape: OKLCH-component-referenced

Tokens decompose into OKLCH lightness, chroma, hue:

```css
:root {
  /* primary hue — modes swap this for color modes */
  --hue: 230;                 /* neutral-blue for default */

  /* per-token component vars — light/dark mode swap these */
  --bg-base-l: 0.15;          /* OKLCH lightness 0–1 */
  --bg-base-c: 0.02;          /* OKLCH chroma 0–~0.4 */

  /* assembled */
  --color-bg-base: oklch(var(--bg-base-l) var(--bg-base-c) var(--hue));
}
```

Why OKLCH over HSL: perceptual uniformity. Lightness means the same
thing across hues, so derivation rules in future color modes stay
legible without per-hue corrections.

Browser support: Chrome 111+, Safari 15.4+, Firefox 113+. Electron 33
(vimyasa) ships Chromium 130+. Fully supported.

### 6. Darker dark-mode mechanism

The existing dark-mode background overlay gets a darker base color
while keeping its current opacity / translucency. Slider in dev panel
exposes the lightness value (`--bg-base-l`) for live iteration.

Implementation: instead of changing opacity (which would lose
vibrancy character), only the OKLCH lightness component drops.
Opacity stays at current value.

The slider is `is.dev`-gated dev tooling. Once the value lands, bake
into Layer 2 default and remove the slider (or keep the dev panel
for future iteration on other tokens).

> **Amendment (2026-05-08, post-Phase 0).** During Phase 0
> implementation, themes lane found that the original "lower OKLCH
> lightness, fixed opacity" reasoning was wrong for a **pure-black**
> overlay. Black has no chroma to dominate vibrancy with, so raising
> alpha just dims the backdrop uniformly while preserving its
> color-picking character. L-tuning at fixed alpha 0.1 produced
> nearly-imperceptible changes — the original mechanism was solving a
> problem that didn't exist for neutral overlays. Phase 0 ended up
> using `rgba(0, 0, 0, var(--bg-base-a))` with alpha as the variable
> knob. Baked default: alpha `0.7`. **OKLCH-component decomposition
> (Decision 5) still applies for future color modes** where chroma
> and hue matter; dark-mode bg-base specifically is a degenerate case
> (L=0, C=0, alpha-only) where `oklch(0 0 0 / A)` and `rgba(0,0,0,A)`
> produce the same color and the simpler form is fine. Phase 1 will
> bake the alpha-driven default while structuring the Layer 2 token
> taxonomy. See [INBOX 2026-05-08 — themes](../INBOX.md) for the
> finding that drove the amendment.

## Architecture

### Token file layout (in the cross-project repo)

```
design-tokens-justin/
├── README.md
├── package.json
├── src/
│   ├── tokens/
│   │   ├── palette.css           ← Layer 1: raw OKLCH palette
│   │   ├── semantic-light.css    ← Layer 2: light mode mappings
│   │   ├── semantic-dark.css     ← Layer 2: dark mode mappings
│   │   └── components/           ← Layer 3: component shims (per consumer)
│   ├── modes/
│   │   ├── auto.css              ← media-query toggle: prefers-color-scheme
│   │   ├── light.css             ← always light
│   │   └── dark.css              ← always dark
│   └── index.css                 ← entry: imports based on mode
└── docs/
    ├── tokens-reference.md
    └── how-to-add-a-color-mode.md
```

### Switching mechanism

Renderer applies one of three strategies based on the `appearance`
setting:

- **`auto`** — `<html>` gets no class; CSS uses
  `@media (prefers-color-scheme: light)` to swap Layer 2.
- **`light`** — `<html data-appearance="light">`; CSS forces light
  Layer 2 regardless of system.
- **`dark`** — `<html data-appearance="dark">`; CSS forces dark
  Layer 2.

Settings change → renderer updates the data attribute → CSS swaps
tokens instantly. No re-render needed.

### Future color-mode derivation

A color mode is just a `--hue` override plus optional per-component
chroma tuning. Example:

```css
[data-appearance="dark"][data-color-mode="forest"] {
  --hue: 130;        /* green-ish primary */
  --bg-base-c: 0.04; /* slightly more chroma than neutral */
}
```

Layer 2's default mappings handle the rest. The interface stays
legible because OKLCH lightness is preserved across hues.

### Magic Colors are excluded

Theme 1's `MAGIC_COLORS_BEAM` / `MAGIC_COLORS_PARTICLES` constants in
`src/shared/themes.ts` stay theme-specific. They define their own
palette overrides that don't participate in the interface token
system. This means:

- Light mode + Theme 1 ON: Magic Colors render as designed; only
  the surrounding interface tokens flip.
- Future color modes don't affect Theme 1's rainbow.

## Phasing

Five phases, each shippable independently. Suggested version slots
in parentheses; can be re-slotted.

### Phase 0 (today, immediate slice)

**Darker dark-mode + dev-panel slider.** Inline in vimyasa
(no package extraction yet). Themes lane builds the slider; bakes
the chosen value once you've dialed it in. No light mode work yet,
no token-layer architecture yet — just a darker `--color-bg-base`
in dark mode, with a slider to find the right value.

This unblocks your immediate UX preference today while the bigger
phases get scheduled.

See "Slider brief" at the end of this doc — copy-paste-able for
themes lane.

### Phase 1 — Tokenize current dark mode (v0.1.7)

**Inline in vimyasa.** Restructure existing dark-mode interface
colors into Layer 1 (palette) + Layer 2 (semantic dark) + Layer 3
(component shims where needed). All existing colors preserved as
tokens. No light mode yet. No package extraction yet.

Deliverable: vimyasa renders identically to v0.1.6 + the Phase 0
darker bg, but powered by tokens. Validates the token taxonomy
without user-visible change.

### Phase 2 — Light mode (v0.1.8)

**Inline in vimyasa.** Add Layer 2 light mode mappings. Add
appearance toggle in Settings (Auto / Light / Dark). Audit every
component for legibility under light mode.

Deliverable: a working, legible light mode. Auto-switching via
`prefers-color-scheme`. App setting for override.

### Phase 3 — Cross-project extraction (v0.1.8 or v0.1.9)

**Move to private repo.** Create `design-tokens-justin` (or your
preferred name). Move Layer 1 + Layer 2 + the Mode CSS into the
package. Component shims (Layer 3) stay per-project. Vimyasa
consumes via npm.

Deliverable: vimyasa renders identically; tokens are now shared
infrastructure. Writual will consume from the same package when
its design lane starts.

### Phase 4 — Color-mode derivation prep (v0.1.9 or later)

**Set up for future color modes.** No actual color modes shipped
yet — this phase just ensures Layer 2 supports `data-color-mode`
attribute switching cleanly. Maybe one demo mode in the dev panel
to validate.

Deliverable: the token system is provably extensible to color
modes. A future v0.2.x release picks the actual modes to ship.

## User-visible copy candidates

Per the upstream-copy rule. Reply with overrides like `A2 → "..."` or
"ship as written."

### A. Settings → Appearance tab (new tab, Phase 2)

- **A1** Tab title: `"Appearance"`
- **A2** Section heading: `"Theme"`
- **A3** Option label (auto): `"Match system"`
- **A4** Option subtitle (auto): `"Light or dark, follows your macOS setting."`
- **A5** Option label (light): `"Light"`
- **A6** Option label (dark): `"Dark"`
- **A7** (After future color modes ship) section heading: `"Color mode"`

### B. Dev panel — darkness slider (Phase 0)

- **B1** Slider label: `"Background darkness"`
- **B2** Slider hint: `"Lower = darker. Bake the value into Layer 2 once it lands right."`

## Edge cases

- **Magic Colors visibility under light mode.** Theme 1 was tuned
  against dark backgrounds. Phase 2 needs to verify the rainbows
  read well over light backgrounds; if they don't, options are
  (a) tone the rainbow palette in light mode, (b) auto-disable
  Theme 1 in light mode, (c) leave it; the user can toggle.
  Decision deferred to Phase 2 design pass.
- **Translucency over light desktops.** Vibrancy under-window
  blends with whatever's behind. Light-mode bg-base on a dark
  desktop wallpaper might look strange. The vibrancy effect
  itself adapts to the system mode, so this should mostly handle
  itself, but worth verifying empirically in Phase 2.
- **Existing user state.** Users who currently have Theme 1 ON in
  v0.1.6 should keep their preference through the migration.
  Phase 1's migration must preserve `themesStore` state.
- **Cross-platform.** OKLCH support assumes Chromium 111+. If
  vimyasa ever ships on a Windows build with an older Electron,
  fallback would need raw values. Not a current concern.

## Risks

- **Phase 1 touches everywhere.** Tokenization is a search-and-
  replace pass across globals.css + every component file with
  inline color references. High change-volume PR; reviewer (you)
  needs to verify nothing visually shifts. Mitigated by Phase 1
  shipping zero user-visible changes — the test is "does it look
  identical to v0.1.6?"
- **Light-mode legibility audit is real work.** Every component
  needs a light-mode pass. Probably 2–3 hours of looking-and-
  adjusting after the mechanical token swap.
- **Cross-project package versioning.** Once vimyasa and Writual
  both consume the package, breaking changes need coordinated
  releases. v1 can avoid this by either keeping tokens inline
  (Phase 3 deferred) or by being conservative about token
  changes once published. Manageable, but worth knowing.
- **`prefers-color-scheme` and Electron.** Need to verify the
  Electron renderer respects it (it should — same Chromium).
  Quick test in Phase 2.

## Forward-looking

- **Color modes** (v0.2.x or later): pick 2–3 hue palettes that
  work under both light and dark. Ship as a Settings → Appearance
  → Color mode picker.
- **Per-list theming** (someday): each list could have its own
  color mode override. Token architecture supports it; UX/UI
  work.
- **Writual extraction** (when Writual coordinator picks up
  design lane work): consume the published package. Likely
  Writual's first design-lane milestone.

## What this proposal does NOT decide

- Final token names (the Layer 2 names like `--color-bg-base` are
  recommendations; final naming during Phase 1 implementation).
- Light-mode palette values (will be tuned during Phase 2 with the
  controls panel).
- Color-mode names / palettes (deferred to v0.2.x).
- Whether component shims (Layer 3) ship now or later — judgment
  call during Phase 1 based on actual divergence needs.
- Whether the cross-project repo is named `design-tokens-justin`,
  `tokens`, or something else (your call when Phase 3 lands).

## Next step

Two parallel tracks:

**Track A — proposal lock + Phase scheduling.** Reply to copy
candidates above + confirm cross-project repo intent. Once locked,
proposal merges and Phase 1 / 2 get version-table entries in
BACKLOG.

**Track B — Phase 0 dispatch.** The slider brief below is ready to
hand to themes lane today. They build the slider + the darker bg
mechanism inline in vimyasa. You iterate. Bake the value when it
feels right.

---

# Slider brief — dispatchable to themes lane

(Copy below into the themes lane session.)

> **Brief: dark-mode darkness slider + token plumbing for `--color-bg-base`**
>
> Themes lane. Mark the relevant entry in `BACKLOG.md` as in-flight when starting.
>
> ### What to build
>
> A dev-only slider in `ThemeDevPanel.tsx` that controls the OKLCH lightness component of vimyasa's dark-mode interface background. While dragging, the value updates live in CSS. Once the user finds the right value, they paste it back to me (coordination) to bake into Layer 2's dark-mode tokens (which will land in Phase 1 of the color tokenization proposal).
>
> ### Concretely
>
> 1. **Add a slider in `ThemeDevPanel.tsx`.**
>    - Label: `"Background darkness"` (B1 from the proposal)
>    - Hint: `"Lower = darker. Bake the value into Layer 2 once it lands right."` (B2)
>    - Slider range: 0.05 to 0.30 (OKLCH lightness; 0.0 is pure black, 1.0 is pure white)
>    - Default: current effective lightness of the existing dark-mode bg (probably ~0.15–0.18 — measure current value first; that's the starting point)
>    - Step: 0.005 (fine-grained)
>    - Display: show the current numeric value next to the slider
>    - Persist the value to the themes-store as `effects.devBgBaseL` (temporary; will retire when baked)
>
> 2. **Wire the value into CSS.**
>    - Set a CSS variable `--bg-base-l` on `<html>` from the renderer.
>    - Update the existing dark-mode background-color rule (likely in `globals.css`) to use `oklch(var(--bg-base-l) var(--bg-base-c, 0.02) var(--hue, 230) / <opacity>)` — preserving the existing opacity and translucency exactly.
>    - The `--bg-base-c` and `--hue` defaults are the proposal's defaults; you can hardcode them as fallback values for now.
>    - Keep the existing background's opacity untouched. ONLY the L component is variable.
>
> 3. **Confirm vibrancy still works.**
>    - The window has `vibrancy: 'under-window'`. The translucency comes from the opacity of the bg color. Verify the slider tunes color darkness without affecting how light passes through.
>
> 4. **No Layer 1 / Layer 2 / Layer 3 token taxonomy yet.** Phase 1 of the proposal handles that. This brief is just the slider + one CSS variable + one rule update.
>
> ### Coordination notes
>
> - Coordinate with features lane via INBOX if anyone else is touching `globals.css` (low risk; this is the only color-related CSS work in flight).
> - When the slider value lands, leave an INBOX note for coordination with the chosen value so Phase 1 can bake it.
> - This is dev-only work; no user-facing settings change yet. The Settings → Appearance tab from the proposal lands in Phase 2.
>
> ### Out of scope (don't do today)
>
> - Don't restructure other CSS variables.
> - Don't add Layer 2 / Layer 3 yet.
> - Don't add a Settings UI for this.
> - Don't touch Magic Colors or any Theme 1 surfaces.

---

After Phase 0 lands, Phase 1 begins on the same branch or a fresh one. Coordination opens BACKLOG entries for each phase with version slots once you confirm the proposal.
