# Architecture docs

Load-bearing context for working in this codebase. Lifted from
auto-memory so it survives memory resets and onboards humans.

| Doc | What it covers |
|---|---|
| [theme-system.md](./theme-system.md) | Surface registry, baked overrides, schema migrations, what it takes to add Theme 2. |
| [quickadd-prewarm.md](./quickadd-prewarm.md) | The always-alive QuickAdd renderer, sync theme hydration, IPC flicker contract. Pattern to copy for list prewarming. |
| [vibrancy-gotcha.md](./vibrancy-gotcha.md) | macOS Electron quirk: empty wrappers in vibrancy windows paint black. Avoid empty layout wrappers. |
| [parallel-instance-flicker.md](./parallel-instance-flicker.md) | Brief unrecognized window-shape near QuickAdd on summon. Likely a second vimyasa process. Diagnosis open. |

Companion docs:

- [../WORKFLOW.md](../WORKFLOW.md) — three-lane Claude Code workflow.
- [../BACKLOG.md](../BACKLOG.md) — triaged feature/bug list with lane assignments.
- [../proposals/](../proposals/) — design proposals for in-flight features.
- [../groups.md](../groups.md) — the dormant Groups stub feature.
