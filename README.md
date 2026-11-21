# @miorin/dsh-workspace-atlas

[简体中文](README.zh.md)

**Workspace Modular Improvement Plan.**

A modular program for differentiable, continuous improvement of the workspace experience.
One card, one row per enhancement; each row keeps its own switch.

- [`@miorin/dsh-workspace-switcher`](../dsh-workspace-switcher/README.md) — session search and workspace tree shortcuts,
  plus the New Session workspace chooser.
- [`dsh-workspace-file-tree`](../dsh-workspace-file-tree/README.md) groups workspaces by directory in the switcher.
- [`@miorin/dsh-workspace-title-badge`](../dsh-workspace-title-badge/README.md) —
  the Workspace's name beside the session title.
- [`@miorin/dsh-workspace-default-preset`](../dsh-workspace-default-preset/README.md) —
  one default Agent preset per Workspace.

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Install

1. Run `pnpm install` here; the bundle resolves its rows through the created links.
2. Remove the independent bundles; the aggregate and a source bundle insert the same row id.
3. In **Plugins** > **Add plugin**, choose this directory, or install it with `plugin_manager`.

## Scope

New workspace-facing features belong here.
Add the package to `aggregate.yml`, run `pnpm run aggregate`, and keep its row id stable.
The source plugin may stay independently installable.

## Development

`aggregate.yml` is the source of truth; `pnpm run check` verifies the generated patch and dependencies.
A published copy needs a vendored generator.

[Project documentation](docs/README.md)
