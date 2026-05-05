# Coordination inbox

Async, durable communication channel from feature lanes to the
coordination lane. Append entries at the **top** (newest first).
Coordination lane sweeps this on next session, addresses each open
entry, marks resolved.

## When to write here

- **Question** — about lane boundaries, procedure, BACKLOG priority,
  or anything in `docs/` that's unclear or contradicts what you see in
  code.
- **Note** — architectural surprise, pattern observed, gotcha
  discovered. Things that future sessions would benefit from knowing
  but don't fit memory or architecture docs yet.
- **Blocker** — your work is stuck on a coordination decision (e.g.
  two lanes both need to touch a shared abstraction; cross-lane
  schema migration sequencing).
- **Rule disagreement** — a `WORKFLOW.md` rule didn't work for you,
  produced a bad outcome, or felt arbitrary in a specific case. Worth
  feeding back so the rule can be refined.

## When NOT to write here

- A bug you found → goes in `BACKLOG.md` directly.
- A question about how a piece of code works → grep / read it.
- A real-time blocker that needs an immediate decision → tell the
  human directly, the inbox is async.
- A long-form design discussion → file as a proposal in
  `docs/proposals/<topic>.md` instead.

## Format

```
## YYYY-MM-DD — <lane>
**Type:** question | note | blocker | rule-disagreement
**Body:** <one paragraph; concrete>
**Status:** open
```

Coordination lane resolves by appending a `**Resolved:**` line:

```
**Resolved:** <one sentence + pointer to where the answer landed>
```

Resolved entries get archived to `docs/notes/inbox-archive.md`
periodically so this file stays short and scannable.

## Heads-up to the human

Adding an entry here does NOT auto-notify the coordination lane. The
human is the routing layer: when a session writes to the inbox, it
should also surface that to the human ("I left a coordination note
about X") so the human knows to bring it up the next time they're
talking to coordination.

---

## Open entries

## 2026-05-05 — themes
**Type:** note
**Body:** Two doc-rot items found while auditing `docs/architecture/theme-system.md` against fresh context after shipping PR #26 (feedback-input surface): (1) line 10 says "v0.1.4 ships Theme 1" and line 140 says "Live release: v0.1.4" — actual live is v0.1.5 per BACKLOG. Already stale before my PR. (2) The clock-out prompt pointed me at `docs/evolution/theme-system.md` but no such file exists; only `docs/architecture/theme-system.md` is present. Either the path was a typo or `docs/evolution/` is planned but not yet created. Separately: once PR #26 merges, the arch doc's surface count (8 → 9), `SURFACE_IDS` list, baked-surface list (3 → 4), and per-surface mount-points table will need a `feedback-input` row — flagging here so coordination doesn't miss it on the post-merge doc sweep.
**Status:** open

*(Add new entries above this line, newest first.)*

---

## Resolved entries

## 2026-05-04 — features
**Type:** note
**Body:** Feedback messenger PR 2 ships the textarea bare (no GlowSurface
wrap). If themes lane wants the feedback window to participate in Theme
1 (or a future themed treatment), register a new `feedback-input`
surface and wrap the `<textarea>` in
`src/renderer/src/components/Feedback/FeedbackWindow.tsx`. Same pattern
as `quickadd-input` on QuickAddFixed. Skipped here intentionally to
keep PR 2 strictly features-lane.
**Status:** resolved
**Resolved (2026-05-04 — coordination):** captured as a BACKLOG entry
("Feedback window — themed input surface", P3, themes lane, v0.1.9).
Themes lane will pick it up when they're in this code for focus-state
cues anyway.
