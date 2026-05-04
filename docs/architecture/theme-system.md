# Theme system architecture

How vimyasa's theme system is wired: surface registry, baked overrides,
schema migrations, cross-window event triggers, and what it takes to add
a second theme.

**One-paragraph summary.** Vimyasa has eight named "surfaces" defined in
[src/shared/themes.ts](../../src/shared/themes.ts). Each surface gets a
`SurfaceConfig` describing whether it's enabled and how its border-beam,
particles, burst, and event-triggered pulses behave. v0.1.4 ships **Theme
1 ("Magic Colors")** baked on three of those surfaces (`quickadd-input`,
`list-item-edit`, `list-add-new`). The currently-running theme is whatever
sits in the persisted store; theme switching is **not** wired —
`ThemesState.activeTheme` exists in the schema but doesn't gate anything
in `defaultSurfaceConfig`. Adding Theme 2 means building the switching
layer too.

## Files to know

- **`src/shared/themes.ts`** — surface registry, types, defaults, baked
  overrides, attributions. The single source of truth for what each theme
  looks like.
  - `SURFACE_IDS` (8 surfaces): `quickadd-window`, `quickadd-input`,
    `list-window`, `list-item`, `list-item-edit`, `list-add-new`,
    `welcome-callout-window`, `welcome-callout-start-button`.
  - `MAGIC_COLORS_BEAM` + `MAGIC_COLORS_PARTICLES` — shared `Partial<…>`
    constants. Each Theme 1 surface entry spreads these and overrides
    only what differs (e.g. `borderRadius` per surface).
  - `THEME_1_SURFACE_OVERRIDES` — sparse map. Only surfaces that should
    be ON in the bake have entries; others stay at the default-off
    baseline.
  - `defaultSurfaceConfig(id?)` — merges global defaults with the
    override entry for `id`. Currently has Theme 1 hardcoded; for Theme
    2 it'd need to take a `themeId` param and dispatch.
  - `THEME_ATTRIBUTIONS` — display name + author + description per
    theme.
  - `CURRENT_SCHEMA_VERSION` — bumped on each baked-default change.
- **`src/main/themes-store.ts`** — persistence + incremental schema
  migrations. Each `if (schemaVersion < N)` block applies only the
  surfaces or values that version introduced; preserves user state for
  unrelated surfaces.
- **`src/renderer/src/components/shared/GlowSurface.tsx`** — the React
  component that mounts the beam + particles for a surface. Has `wrap`
  and `overlay` modes; the highlight-space mental model means most
  surfaces use overlay siblings on row containers rather than wrapping
  content (see [theme merge plan with PR-C](./theme-merge-plan.md) when
  that doc exists).
- **`src/renderer/src/lib/border-beam-fork/`** — vendored `border-beam`
  package (MIT, © Jakub Antalik) with extended knobs. `source.js` is the
  verbatim package output (effectively read-only — `@ts-nocheck`);
  `BorderBeam.tsx` is the React wrapper.
- **`src/renderer/src/components/Settings/ThemesTab.tsx`** — user-facing
  UI. Currently a single on/off toggle for "Theme 1: Magic Colors". No
  theme switcher.
- **`src/renderer/src/components/ThemeDevPanel/ThemeDevPanel.tsx`** —
  dev-only tuning panel (gated by `is.dev` in tray.ts). Has sliders for
  every per-surface knob and a saved-preset library. Use this to iterate
  on values, then bake the chosen values into the theme override
  constant.

## How surfaces mount

Each component that hosts a surface mounts a
`<GlowSurface surface="…" mode="…" />`. Per-surface mount points:

| Surface | Component | Mount mode | Notes |
|---|---|---|---|
| `quickadd-window` | QuickAddFixed root | wrap | not currently in the bake |
| `quickadd-input` | QuickAddFixed input wrapper | wrap | **baked** in Theme 1 |
| `list-window` | ListWindow | not yet mounted | candidate for trigger pulses |
| `list-item` | ItemRow's outer motion.div | overlay | `eventFilter={{itemId}}` for per-row scoping |
| `list-item-edit` | ItemRow's outer motion.div | overlay (gated on `editing`) | **baked** in Theme 1 |
| `list-add-new` | DraftItemRow's outer motion.div | overlay | **baked** in Theme 1 |
| `welcome-callout-*` | CalloutWindow | wrap | not currently in the bake |

The "highlight space" rule: surfaces mount on the row CONTAINER (whole
highlight area), not the inner textarea/input. Wrap-mode is for cases
where the surface IS the focus area (e.g. quickadd-input).

## Cross-window event triggers

`themeEvents` (renderer-side) + IPC broadcast lets surfaces fire trigger
pulses on app events. Event names: `'item-added' |
'item-status-changed' | 'item-edit-committed' | 'manual-test'`. Payload:
`{ name, itemId? }`. A surface with `triggers: { enabled: true,
events: [...], durationMs: N }` stays dormant and pulses on matching
events; `eventFilter={{ itemId }}` prop on the GlowSurface scopes
per-row.

**Open design discussion:** currently `triggers.enabled` puts the surface
in trigger-only mode; the desired behavior is a continuous animation AND
distinct trigger pulses coexisting (layered vs. replacing — TBD).

## Adding a second theme — what it takes

Two paths to consider:

**A. Repaint Theme 1 in place (~30 min, no new theme).** Edit
`MAGIC_COLORS_BEAM.paletteOverride` (and `hueRange`) to the new palette.
Bump schema, migration re-bakes the three Theme 1 surfaces. Throw-away
branch to *see* if the colors land before committing to building B. No
switching, no new theme.

**B. Real Theme 2 with switching (~2–3 hours).** What "Theme 2" actually
means architecturally:

1. Extend `ThemeId` (e.g. `'border-beam' | 'border-beam-pink-violet'`).
2. Add `MAGIC_COLORS_BEAM_PV` + `MAGIC_COLORS_PARTICLES_PV` (or
   whatever) constants.
3. Add `THEME_2_SURFACE_OVERRIDES` map — typically same surface coverage
   as Theme 1, different palette spread in.
4. Add `THEME_ATTRIBUTIONS` entry for Theme 2 (displayName,
   description, attribution).
5. Refactor `defaultSurfaceConfig(id, themeId?)` to dispatch on
   `themeId` to the right overrides map.
6. Add `setActiveTheme(themeId)` action in the themes store that re-bakes
   all surfaces to the new theme's defaults. Wire IPC.
7. ThemesTab gains a switcher (radio buttons or segmented control) for
   picking theme.
8. Schema bump declares the new `ThemeId` value. No automatic re-bake —
   user picks via UI.
9. Iterate on the palette in the dev panel until it reads right (this
   is usually the bulk of the time).

**Things to watch for in path B:**

- **Tuned dev state gets clobbered on switch.** Switching themes wipes
  persisted surface configs to the new theme's bake. Acceptable for
  friends-and-family ship (no end-user tuning UI); matters for ongoing
  dev panel iteration.
- **Surface coverage carries over.** Both themes should typically cover
  the same surfaces (currently the three baked ones) — the user's choice
  is "which look," not "which surfaces."
- **The save-flash on items is colorless** (`.item-row-save-flash` in
  globals.css uses white box-shadow). Doesn't depend on theme palette;
  same look across themes.

## Versioning posture

Live release: v0.1.4. Treat any next theme work as targeting v0.1.5 or
later — do NOT propose a v0.2.0 bump unless the user explicitly approves.
Schema migration story (per-version diff, preserve user state for
unrelated surfaces) is the established pattern.

## Things you can derive yourself

- Whether to use overlay vs wrap mode (overlay for highlight-space
  surfaces, wrap for the surface itself).
- Whether to use shared constants vs duplicated per-surface configs
  (shared, by the established pattern).
- Whether to build a migration step (yes, every time the bake changes;
  preserve unrelated surface state).

## Things to ask the user about before building

- Path A (repaint) vs path B (real switching).
- Specific palette values (let them pick or iterate visually in the dev
  panel).
- Whether a Theme 2 should cover additional surfaces beyond Theme 1's
  three.
- Theme name + description text.
