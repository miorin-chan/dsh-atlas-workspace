# dsh-workspace-family

[简体中文](README.zh.md)

A thin aggregate bundle for three workspace plugins:

- [`dsh-workspace-picker`](../dsh-workspace-picker/README.md) — refined workspace picker on the New Session screen.
- [`dsh-session-workspace-label`](../dsh-session-workspace-label/README.md) — workspace name beside the session title.
- [`dsh-workspace-agent-preset`](../dsh-workspace-agent-preset/README.md) — a default agent preset stored per workspace.

The package has no Host or Client behavior of its own.
It declares the three packages as dependencies and copies their existing loader rows into one bundle patch,
so **Plugins** shows one **Workspace family** card with three rows that keep their own switches.

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Install

1. Run `pnpm install` in this directory.
   This creates the `node_modules` links that the bundle relies on at runtime.
2. Disable or remove the three independent bundles from the profile.
   The aggregate and an independent bundle would insert the same row id, which is a startup error.
3. In **Plugins** > **Add plugin**, choose this directory, or install it with `plugin_manager`.
4. Confirm the card shows three rows and toggle each row once.

Do not install the aggregate alongside any of the three independent bundles.

## Development

`aggregate.yml` is the source of truth.
`cordis.patch.yml`, the dependency list, and the generated metadata are written by the workspace tool:

```sh
pnpm run aggregate
pnpm run check
```

The scripts call `../../tools/dsh-aggregate` from this workspace.
A published copy needs a vendored generator; see [project documentation](docs/README.md).

## Files

- `aggregate.yml` — declared dependencies and bundle order.
- `cordis.patch.yml` — generated loader rows; do not edit by hand.
- `locale/`, `icon.svg` — the aggregate card's title, description, and icon.
- `docs/README.md` — install, migration, and verification details.
