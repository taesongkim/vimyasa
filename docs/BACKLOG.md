# Backlog

Triaged ideas, features, and bugs across vimyasa. Each item has a lane,
a priority, a version target (where assigned), and (where applicable) a
pointer to its design doc.

**For lane sessions:** read this at startup. Mark items `in-flight` when
you start. Don't pick up items already `in-flight` in another lane.

**Status legend:** `idea` → `proposed` (has design doc) → `in-flight`
(branch open) → `merged` → archived out.

**Priority:** `P1` ship-blocker for current iteration · `P2` next
iteration · `P3` someday/maybe.

---

## Versioning roadmap

Live release: **v0.1.5**. Planned next sequence:

| Version | Theme | Primary contents |
|---|---|---|
| ~~**v0.1.5**~~ | ~~Feedback messenger~~ | ✅ Shipped — Cmd+Shift+\\ feedback window, Cloudflare Worker → Resend → email pipeline. |
| **v0.1.6** | Hot list — Phase 1 (visible) + release-notes-in-update | Hot-list PR-1 schema, PR-2 shortcut + window + slide animation, PR-3 number-0 wiring. Plus: surface GitHub release notes in the auto-update prompt window. |
| **v0.1.7** | Hot list polish + Undo | Hot list PR-4 (prewarm). Undo with 3–5 step in-memory ring buffer. `Cmd+Z` / `Cmd+Shift+Z`, in-session only, single-list scope. |
| **v0.1.8** | Move-item flow + small wins | Carry mode (`m` enter / 0–9 send / j/k reorder / Esc land). Auto-scroll to entry-form-added item. Deselect prior item on new-item init. |
| **v0.1.9** | Focus-state cues + backup | Themes lane: focus-changed event + flash/glow via existing magic-colors infra. Features lane: discover existing export, ship tested import. |
| **v0.1.10** | Polish + bug bash + audit | Mystery flicker root-cause hunt. Onboarding dim z-order. Scrollbar lag. Coordination: auto-update integrity audit. |
| **v0.2.0** (someday) | Real Theme 2 + switcher | Path B from theme-system docs, or first significant new surface area. Reserved for genuinely big change. |

### On flexibility

Versions are **coherence guesses, not contracts.** Lanes that finish a
version's items early route through coordination (via `INBOX.md` or
directly to the human) to decide between:

- **Ship now** — default. Smaller releases mean tighter feedback loops
  and easier bug attribution.
- **Pull forward** — only if the new item *belongs with* the version's
  theme. Heuristic: if a tester would have to read release notes to
  understand "what changed," the version is too noisy.
- **Skip ahead** — start the next version's primary item, leave the
  partial release uncut.

Coordination updates BACKLOG version tags when an item moves. Lanes do
not silently grab next-priority items.

---

## Features

### Hot list — `Cmd+Shift+H`, holds 0, slides from right
- **Lane:** features (with theme + aesthetics consultations later)
- **Priority:** P1
- **Version:** v0.1.6 (Phase 1: PR-1, PR-2, PR-3) + v0.1.7 (PR-4 prewarm)
- **Status:** proposed → Option A + phasing approved → see [proposals/hot-list.md](./proposals/hot-list.md)
- **Notes:** Phasing is defined in the proposal. PR-1 is schema-only,
  ships invisibly — safe to pull into v0.1.5 if features lane has slack.

### Backup / restore user data
- **Lane:** features
- **Priority:** P1
- **Version:** v0.1.9
- **Status:** idea — needs investigation
- **Notes:** User believes a JSON export exists but is untested.
  **First step:** discover what's actually wired (scan `ipc.ts` and any
  Settings tab); document current state; then propose a tested
  export+import flow. Must include `kind: 'hot'` in the export schema
  by v0.1.9 (hot list lands in v0.1.6).

### Undo / redo
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.7
- **Status:** scoped → 3–5 step in-memory ring buffer, in-session only,
  single-list scope. `Cmd+Z` / `Cmd+Shift+Z`. Covers add / edit /
  archive / delete (and reorder if cheap).
- **Notes:** No persistence across summons. No cross-list undo (deferred
  to v0.1.10+ if ever). Estimate: 2–3 active hours.

### Move-item flow — "carry mode"
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8
- **Status:** idea — naming + ENTER conflict to resolve
- **Notes:** `m` toggles carry mode on focused item. Inside carry mode:
  number key → send to that list (incl. `0` → hot list — depends on
  hot list shipping in v0.1.6); `j`/`k` → reorder in current list;
  `Esc` lands. **Open:** `Enter` already archives — needs a different
  commit key, or carry-mode reuses Esc exclusively. Suggest "carry
  mode" as the name (or "pickup mode"); user to confirm.

### Focus-state visual cue (flash + glow)
- **Lane:** themes (primary), aesthetics (timing/feel)
- **Priority:** P2
- **Version:** v0.1.9
- **Status:** idea
- **Notes:** Wants a flash + steady glow on focus-level changes so users
  always know where shortcuts will land. **Use the existing magic-colors
  infrastructure** (beam/particles/burst); do not build a parallel
  visual layer. The `triggers` system already supports
  focus-change-style events — a new event name like `'focus-changed'`
  may be all that's needed. Pairs cleanly with backup work in v0.1.9
  (different lanes, no overlap).

### Release notes in auto-update prompt
- **Lane:** features (primary), aesthetics (visual treatment)
- **Priority:** P2
- **Version:** v0.1.6
- **Status:** idea — quick scope only, not yet a proposal
- **Notes:** When the auto-update flow shows the "update available"
  message, include the GitHub release notes (markdown body of the
  release) as a tab or expanded section. `electron-updater` already
  exposes `releaseNotes` on the `update-downloaded` event. Likely
  ~half a day if the current update UI is a custom in-app window,
  +1–2 hours if it's a native dialog (would need migration). Open
  questions before building:
  1. Current update UI shape (custom vs. native).
  2. electron-updater concatenates skipped versions' notes —
     decide: show all, or just latest?
  3. Markdown renderer choice (`marked` is ~5kb, plenty).
  Coordination writes a proper proposal when v0.1.6 is closer.

### Feedback window — themed input surface
- **Lane:** themes
- **Priority:** P3
- **Version:** v0.1.9 (with focus-state cues — same lane, same release)
- **Status:** in-flight (themes lane, branch `claude/condescending-leakey-9dec29`, 2026-05-05)
- **Notes:** Feedback window's `<textarea>` shipped bare in v0.1.5
  (no `GlowSurface` wrap). To make it participate in Theme 1 (or future
  themed treatments), register a new `feedback-input` surface in
  `src/shared/themes.ts` and wrap the textarea in
  `src/renderer/src/components/Feedback/FeedbackWindow.tsx` — mirror
  of `quickadd-input` on QuickAddFixed. Schema bump + migration (per
  the established pattern). Trivial once you're already in the themes
  code.

### In-app feedback messenger to dev
- **Lane:** features (built); coordination (Worker)
- **Priority:** P1
- **Version:** v0.1.5 — **shipped**
- **Status:** ✅ merged → PR #18. All three proposed PRs (settings +
  clientId, window + send, prewarm) shipped in one delivery. Worker
  live at `https://vimyasa-feedback.taesongkim.workers.dev`.
  See [proposals/feedback-messenger.md](./proposals/feedback-messenger.md)
  for the design and [`infra/feedback-worker/`](../infra/feedback-worker/)
  for the deployed Worker source.
- **Follow-ups in BACKLOG:** see "Feedback window — themed input
  surface" under Themes (v0.1.9), spawned from features lane's INBOX
  note that the textarea ships bare without a `GlowSurface` wrap.

---

## Usability tweaks

### Auto-scroll to new item added via entry form
- **Lane:** features
- **Priority:** P2
- **Version:** v0.1.8
- **Status:** idea — small win
- **Notes:** Mechanic exists for `n` in-list (auto-scrolls focused
  item into view). Reuse it when entry form adds an item to the
  currently-open list whose visible area doesn't contain the new item.
  Likely a one-IPC-event addition: `quickadd` triggers `item-added`,
  list windows that contain that item scroll to it.

### Deselect prior item when new item is initiated
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.8
- **Status:** idea — tiny
- **Notes:** When `n` (or shortcut, or anything else) starts a new
  item draft, the previously-highlighted item should lose its selection
  state. Trivial — likely a single state-clear in the new-item handler.

### Scrollbar tracking lag
- **Lane:** features (or aesthetics, dealer's choice)
- **Priority:** P3
- **Version:** v0.1.10
- **Status:** idea
- **Notes:** Custom scrollbar in `ListWindow.tsx` lags slightly behind
  scroll position — likely a CSS smooth-scroll, transform-on-spring, or
  a debounced position-update. Should be one transition or
  request-animation-frame fix. Minor visual polish.

---

## Bugs

### Mystery flicker on first entry-form launch — even without parallel instances
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.10 (bug bash)
- **Status:** open — diagnosis revisited
- **Notes:** See [architecture/parallel-instance-flicker.md](./architecture/parallel-instance-flicker.md).
  Original diagnosis (second vimyasa process running) doesn't fully
  account for the user's recent observation. Needs a focused diagnostic
  session: kill all instances, reproduce, read `window-logging` output,
  identify what fired. May be tray icon repaint, dim overlay
  pre-warm, or OS-level animation. Not blocking ship but ruins the
  vibe.

### Onboarding tour: dim background sometimes lets non-vimyasa windows show through
- **Lane:** features
- **Priority:** P3
- **Version:** v0.1.10 (bug bash)
- **Status:** open
- **Notes:** Observed once on a tester's first entry-form launch.
  Likely an Electron `alwaysOnTop` level mismatch — the dim overlay's
  z-level may need to be `'screen-saver'` or `'pop-up-menu'` to clear
  user windows reliably (especially full-screen apps). Investigation:
  check `dim-overlay.ts` for the `setAlwaysOnTop(true, level)` call.

---

## Coordination / infrastructure

### Reference docs (maintained ongoing)

- **[`docs/reference/popular-shortcuts.md`](./reference/popular-shortcuts.md)** —
  shortcuts used by apps in vimyasa's target demographic. Check before
  picking a new global hotkey. Update when new conflicts surface in
  testing or new vimyasa shortcuts ship. Last verified: 2026-05-04.
- **[`docs/reference/voice.md`](./reference/voice.md)** — vimyasa's
  voice and tone for user-visible copy. Two registers (in-app vs.
  release notes), patterns to use, things to avoid. Update when voice
  evolves (likely v0.2.0+).
- **[`CHANGELOG.md`](../CHANGELOG.md)** — narrative version history.
  Append a new section at top for each release that ships. The story
  per release, not just the bullets — those live on GitHub Releases.
- **[`docs/evolution/`](./evolution/)** — cross-version narrative arcs
  for long-running systems. First entry: theme system. Add a new arc
  when a system has spanned 2+ versions and is likely to keep growing.

### Future Historian agent (cross-project)
- **Lane:** coordination (preparing the supporting docs); the agent itself lives outside this repo
- **Priority:** P3 — exploratory
- **Version:** N/A (cross-project, lives outside vimyasa)
- **Status:** idea — supporting docs landing in vimyasa now (CHANGELOG,
  voice.md, evolution arcs); the agent itself is a future tooling
  project
- **Notes:** The dev wants a "Historian" agent that builds an animated
  / interactive virtual museum of project evolution across all his
  projects. Lives in a separate private repo with read access to project
  repos, ingests git history + docs + visual artifacts, produces a
  reflective / shareable timeline view. Vimyasa's contribution is to
  document deliberately enough that the Historian can reconstruct the
  story retroactively. Specifically:
  - CHANGELOG.md (narrative, not just bullets) — landed.
  - docs/reference/voice.md (so AI-generated copy stays on-voice as
    the project ages) — landed.
  - docs/evolution/ (cross-version narrative arcs) — first arc landed
    for the theme system; add more as systems mature.
  - **Visual artifacts** (screenshots, GIFs at each release) — NOT yet
    landed. Worth a small `scripts/capture-release-snapshots.sh` that
    runs at release time. Future work.
  - **Rejected-alternatives explicitness** in proposals — going forward,
    every proposal has an "Alternatives considered" section that names
    what was rejected and why.
  When the dev is ready to build the Historian itself, they'll find
  ~75–80% of vimyasa's story already reconstructable from current
  artifacts. The remaining gap is mostly visual + a couple of
  retroactive narrative arcs.

### Electron major-version upgrade
- **Lane:** features (build); coordination (proposal first)
- **Priority:** P2
- **Version:** unassigned — deserves its own dedicated effort, not bundled with feature work
- **Status:** idea — surfaced during 2026-05-05 npm audit triage
- **Notes:** Electron 33 is now ~8 majors behind (current is 41). The
  npm audit lists 18 CVEs against electron <=39.8.4, none of which apply
  to vimyasa's actual API usage (no `window.open`, `setAsDefaultProtocolClient`,
  `requestSingleInstanceLock`, `commandLineSwitches`, USB, offscreen
  rendering, service workers, iframes). Risk for shipped binary is low.
  But the upgrade itself is worthwhile — security posture and access to
  newer Electron features. **Do NOT use `npm audit fix --force`** (would
  jump to 41 and likely break things). Instead: coordination writes an
  upgrade proposal; features steps through 33 → 34 → ... → current with
  test verification at each major.

### npm audit: uuid v3/v5/v6 advisory
- **Lane:** coordination (tracking only)
- **Priority:** P3 — won't-fix unless usage changes
- **Version:** N/A (tracking)
- **Status:** assessed → no action needed
- **Notes:** Triaged during 2026-05-05 npm audit. uuid <14.0.0 has a
  buf-bounds-check issue in v3/v5/v6. vimyasa only imports `v4 as uuid`
  and uses random UUIDs; v3/v5/v6 (namespace UUIDs) are not used.
  Tracked here so a future audit triage doesn't re-investigate. If
  vimyasa ever starts using v3/v5/v6, revisit.

### Auto-update integrity audit
- **Lane:** coordination
- **Priority:** P1 (one-time, then quiet for a long time)
- **Version:** v0.1.10 (bug bash + audit window)
- **Status:** idea
- **Notes:** Highest-blast-radius surface. Verify code signing chain,
  electron-updater config, GitHub Releases trust model, what happens
  with a malformed/spoofed release. Probably a half-day audit ending in
  an `audits/auto-update.md`. Could pull forward into any earlier
  version's coordination slack — doesn't conflict with feature work.

### IPC surface inventory
- **Lane:** coordination
- **Priority:** P2
- **Version:** unassigned — pull into any version with coordination slack
- **Status:** idea
- **Notes:** Every `ipcMain.handle` is an API. Enumerate, document
  expected callers, flag any that take untrusted input. Output:
  `architecture/ipc-surface.md`.

### Smoke tests for core flows
- **Lane:** coordination → features (build), coordination (maintain)
- **Priority:** P2
- **Version:** start in v0.1.5 (alongside feedback build), grow per release
- **Status:** idea
- **Notes:** Not coverage. Just: QuickAdd opens, item saves, list
  renders, prewarm doesn't regress, hot list opens (once shipped). Run
  before each release. Probably Playwright. ~30 min initial setup, then
  add tests as features ship.

### ADRs for load-bearing decisions
- **Lane:** coordination
- **Priority:** P3
- **Version:** unassigned — write opportunistically when slack appears
- **Status:** idea
- **Notes:** 3–5 short ADRs for decisions you'd hate to re-litigate:
  theme system shape, prewarm vs. lazy, vibrancy choice, distribution
  model. One page each.

### Memory consolidation pass
- **Lane:** coordination
- **Priority:** ongoing
- **Version:** ongoing — run when memory feels noisy or before major releases
- **Status:** idea
- **Notes:** Run periodically (skill: `consolidate-memory`). Especially
  important once three lanes are writing to memory in parallel.
