# Theme system — evolution arc

A cross-version narrative of how the theme system was conceived,
built, shipped, and is planned to grow. Source-of-truth for
"how did we get here?" questions about themes.

For the **current state** of the theme system (registry, surfaces,
mounting, schema migrations), see
[`../architecture/theme-system.md`](../architecture/theme-system.md).
This doc covers the **journey**.

---

## The vision (pre-v0.1.4)

The dev's stated vision: *"apps that work tightly and feel magical."*
Themes were the first significant step toward expressing that vision
visually. The intent was never decorative — themes are how vimyasa
shows it cares about how it looks.

**Constraint chosen early:** dark-mode-only by intent. Vimyasa is
not trying to be a system-fitting app; it's trying to be a moment
of intention in your day. Light mode was attempted in v0.1.0–v0.1.1
but produced legibility issues; v0.1.2 deliberately locked to dark
mode and the constraint stuck.

---

## v0.1.4 — Theme 1: Magic Colors ships

The headline of v0.1.4 was the in-list entry revamp, but the
**surprise visual treat** was Theme 1.

### What it actually is

A border-beam (animated gradient stroke around an element) plus a
particle layer (small drifting particles inside the highlight area)
applied to three specific surfaces:

- `quickadd-input` — the main entry-form input
- `list-item-edit` — when you're editing an existing item
- `list-add-new` — the freshly-spawned new-item row

When focus enters one of those surfaces, the beam and particles
light up. When focus leaves, they fade. Off by default; toggleable
in Settings → Themes.

### Architectural moves that landed here

Theme 1 wasn't just a coat of paint — it required real scaffolding
that future themes will reuse:

1. **Surface registry** in `src/shared/themes.ts`. Eight named
   surfaces enumerated; each gets a `SurfaceConfig` describing
   border-beam, particles, burst, and event-trigger settings.
   Theme-agnostic by design — Theme 2+ will override the same
   surfaces.
2. **`GlowSurface.tsx`** as the renderer-side mount. Two modes
   (wrap and overlay) for different "highlight space" semantics.
   Wrap is for cases where the surface IS the focus area (the
   input itself); overlay is for cases where the surface is around
   a row container.
3. **Schema migrations** in `themes-store.ts` to evolve baked
   defaults across releases without clobbering user state. Pattern:
   each `if (schemaVersion < N)` block applies only the surfaces
   the new version touches.
4. **Cross-window event triggers.** Surfaces can subscribe to events
   (`item-added`, `item-status-changed`, `item-edit-committed`,
   `manual-test`) and pulse on match. Per-row scoping via
   `eventFilter={{ itemId }}`.
5. **`border-beam-fork`** vendored MIT package (© Jakub Antalik) with
   extended knobs for the dev's specific needs. Lives in
   `src/renderer/src/lib/border-beam-fork/`.
6. **`ThemeDevPanel`** dev-only tuning UI gated by `is.dev`. Sliders
   for every per-surface knob, saved presets. The pattern is
   "iterate visually in the panel, then bake the chosen values into
   the theme override constant."
7. **`ThemesTab.tsx`** user-facing on/off toggle. Single switch for
   v0.1.4 — the theme-switching layer is *not* yet built.

### Decisions made along the way

- **Highlight-space mental model.** Surfaces mount on the row
  container, not the inner textarea. Wrap mode for the surface
  itself; overlay siblings for highlight surfaces. Discovered after
  experimenting with the alternative and finding it produced
  awkward visual artifacts.
- **PR-C rebase playbook.** When a component refactor (PR-C: in-list
  add item) landed in parallel with the theme work, the resolution
  was: take PR-C's structure, drop wrap-mode mounts, re-add as
  overlays in a new commit. Documented in memory for future cases.
- **Vibrancy + empty wrapper bug.** An always-mounted empty wrapper
  with `overflow: hidden + border-radius` inside a vibrancy
  BrowserWindow paints as opaque black. Discovered while fixing the
  QuickAdd focus regression. Fix: don't mount empty layout-affecting
  wrappers; if a wrapper must always exist, give it children that
  fill it. Documented at
  [`../architecture/vibrancy-gotcha.md`](../architecture/vibrancy-gotcha.md).

### Versioning posture

`CURRENT_SCHEMA_VERSION` bumped (to 5 as of v0.1.4) per the schema
migration pattern. Each version's migration block applies only what
that version introduced; user state for unrelated surfaces is
preserved.

### What's deliberately NOT in v0.1.4

- **Theme switching.** `ThemesState.activeTheme` exists in the
  schema but doesn't gate anything in `defaultSurfaceConfig`.
  Adding Theme 2 means building the switching layer too — see
  v0.2.0 plans below.
- **`list-window` surface mount.** The surface is registered but
  not yet mounted. Reserved for trigger-pulse experiments.
- **Trigger-vs-continuous coexistence.** Currently `triggers.enabled`
  puts the surface in trigger-only mode; the dev wants continuous
  animation AND distinct trigger pulses to coexist (layered vs.
  replacing — design discussion deferred).

---

## v0.1.5 — *(no theme work, but related)*

v0.1.5 shipped the feedback messenger. The feedback window's
textarea **deliberately ships without a `GlowSurface` wrap** — bare
textarea, no themed treatment yet.

This was an intentional features-lane scope decision (kept PR
strictly features-side, no themes coupling). Themes lane will
register a `feedback-input` surface and wrap the textarea in a
later release; the work is captured in BACKLOG as a P3 item
targeted v0.1.9.

The pattern is worth naming: **deliberate cross-lane handoffs.** A
surface gets shipped bare in one release, themed in a later one,
because the immediate need is clarity of ownership rather than
visual completeness.

---

## v0.1.9 (planned) — focus-state cues + feedback-input surface

The next theme work, scheduled for v0.1.9 alongside backup/restore.
Two related items:

1. **`feedback-input` surface registration + wrap** — small,
   mirrors `quickadd-input` pattern. Schema bump + migration. Trivial
   once the themes lane is in this code.
2. **Focus-state visual cue** — flash + steady glow on focus-level
   changes so the user always knows where their shortcut keys are
   about to land. Uses the existing magic-colors infrastructure
   (beam/particles/burst); a new `focus-changed` event added to the
   triggers system. Themes lane primary; aesthetics lane consults
   on timing/feel.

These two items pair cleanly because they're the same lane in the
same code, even though they're conceptually different (one is a
new surface mount; the other is a new trigger event).

---

## v0.2.0 (someday) — Theme 2 + theme switcher

The architectural commitment from v0.1.4 — that the surface
registry would be theme-agnostic — pays off here.

### What "Theme 2" actually means architecturally

Two paths considered (full design at
[`../architecture/theme-system.md`](../architecture/theme-system.md)):

- **Path A: Repaint Theme 1 in place** (~30 min). Edit the palette
  override constants. No new theme. Useful as a throwaway branch to
  see if a different look lands before committing to Path B.
- **Path B: Real Theme 2 with switching** (~2–3 hours of architecture,
  hours more of palette iteration). Extend `ThemeId`, add Theme 2
  override constants, refactor `defaultSurfaceConfig` to dispatch
  on `themeId`, add `setActiveTheme(themeId)` IPC, ThemesTab gains
  a switcher (segmented control or radio buttons).

Path B is the planned approach. The work is mostly mechanical once
the architecture decision is committed; the bulk of effort goes
into iterating on the palette in the dev panel until it reads
right.

### Things to watch for

- **Tuned dev state gets clobbered on switch.** Switching themes
  wipes persisted surface configs to the new theme's bake.
  Acceptable for friends-and-family ship; matters for ongoing dev
  panel iteration.
- **Surface coverage carries over.** Both themes typically cover
  the same surfaces (the three baked ones, plus any new ones added
  by then). The user's choice is "which look," not "which
  surfaces."
- **Attribution per theme.** If Theme 2 uses the same border-beam
  fork, attribution can credit Jakub Antalik again. Different
  visual technique → different attribution.

---

## Patterns observable in the arc

Reading the arc as a whole reveals a few patterns:

1. **Architecture lands quietly inside feature releases.** v0.1.4
   shipped a list-entry revamp on the surface; underneath, the
   entire theme system landed. v0.1.5 shipped a feedback feature;
   underneath, the coordination-lane planning surface landed. The
   visible release is rarely the full story.
2. **Dev-only tooling is a force multiplier.** The
   `ThemeDevPanel` made Theme 1 possible at the quality level it
   shipped; without it, palette iteration would have been too slow.
   Future visual work should consider whether a similar dev panel
   is worth building first.
3. **Memory + docs preserve gotchas across versions.** The
   vibrancy bug, the PR-C rebase playbook, the highlight-space
   mental model — each was a real moment of discovery during
   v0.1.4 work, and each got captured well enough that future
   sessions can avoid re-investigating.
4. **Cross-lane handoffs are deliberate.** The bare textarea in
   v0.1.5 isn't an oversight; it's a scope decision. The pattern
   "ship bare in release N, theme in release N+M" is a real shape,
   not a bug.
5. **Schema migrations are the load-bearing trick.** Without them,
   each baked-default change would clobber user state. With them,
   themes can evolve indefinitely without forcing testers to re-tune.

---

## What this doc tries to do

For the theme system specifically, capture the **journey** rather
than the **state**:

- *What* shipped at each version (state lives in architecture docs).
- *Why* it shipped that way (decisions and tradeoffs).
- *What it sets up* for future versions.
- *Patterns observable across the arc* — useful for the Historian
  and for the dev's own reflection.

When v0.1.6+ ships theme work, append to this doc with the same
shape: what shipped, decisions made, what it sets up next. Don't
let the arc go stale.
