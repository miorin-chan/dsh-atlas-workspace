# Workspace Modular Improvement Plan

[简体中文](README.zh.md)

Find sessions, switch workspaces, preview files, and set defaults from the DSH interface.
Each feature has its own switch.

- Press `Mod+K` to [find sessions](../dsh-workspace-switcher/README.md).
  Use `Mod+Shift+K` to browse workspaces, with [directory grouping](../dsh-workspace-file-tree/README.md) available.
  On the New Session screen, click the workspace chip to choose a workspace.
- In the left sidebar, click the workspace name below the session list
  to [browse, search, and preview files](../dsh-preview-file-navigation/README.md).
- Click the chevron beside Workspaces or Sessions to [switch list modes](../dsh-workspace-list-toggle/README.md).
  In **Needs attention**, [sessions with unsent drafts](../dsh-session-draft/README.md) stay visible.
- In the flat sidebar list, see the [workspace name beside the session title](../dsh-workspace-title-badge/README.md).
  Right-click a workspace and choose **Default**
  to [set the Agent preset for new sessions](../dsh-workspace-default-preset/README.md).

## Install

Requires the Web client on DeepSeek Harness `0.2.2-rc.5`.

1. Run `pnpm install` in this directory.
2. If any included plugin is installed separately in this profile, note its switch state
   and remove its bundle to avoid duplicate plugin IDs.
3. In **Plugins → Add plugin**, select this directory.
   Restore any saved switch states on the new card.

[Maintenance and migration](docs/README.md)
