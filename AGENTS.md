# @miorin/dsh-atlas-workspace

This repository is a thin aggregate bundle, not a behavior plugin.
It combines workspace plugins into one Plugins card.

- Do not add Host or Client code here.
  Each row must keep pointing at its own package.
- `aggregate.yml` is the source of truth for dependencies and row order.
- `cordis.patch.yml`, `package.json` dependencies, `dsh.bundle.patch`, and `dsh.aggregate.plugins` are generated
  by the workspace `tools/dsh-aggregate` tool.
- Keep the source plugins' row ids unchanged.
  Existing profile overrides are keyed by row id.
- Any new workspace-facing feature belongs in this aggregate.
  Add its package to `aggregate.yml`, regenerate, and keep the source row id stable.
  Its source plugin may remain independently installable, but it must not be left out of this aggregate.
- Never install this aggregate alongside any source plugin's independent bundle; duplicate row ids are fatal.
- After editing the manifest, run `pnpm run aggregate` and `pnpm run check`.
- Read [project documentation](docs/README.md) before changing install or migration behavior.
