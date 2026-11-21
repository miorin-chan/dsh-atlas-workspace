# AGENTS.local

本文件补充 [AGENTS.md](AGENTS.md)，记录本聚合包的局部约定。

## 定位

- 这是工作区插件的组合层，不是行为插件。
- 行仍然指向各源插件（当前是 `@miorin/dsh-workspace-welcome-switcher`、`dsh-workspace-file-tree`、
  `@miorin/dsh-workspace-title-badge`、`@miorin/dsh-workspace-default-preset`），
  不在这里复制它们的 Host 或 Client 代码。
- 独立 bundle 与聚合包互斥；重复行 id 是 DSH 启动级错误。

## 新增工作区功能

任何新的、主要面向工作区的功能都应加入本聚合包：更新 `aggregate.yml`，重新生成并校验，
保持源插件的行 id 稳定，并同步更新 locale 标题、描述与文档；源插件仍可独立安装，但必须同时加入本聚合包。
与工作区无关的功能仍独立成包。

## 命令

```sh
pnpm install
pnpm run aggregate
pnpm run check
```

`pnpm run aggregate` 依赖工作区的 `../../tools/dsh-aggregate`。
发布或迁移到独立环境前，先把生成器做成包内单文件脚本；当前 `prepack` 只适用于本工作区布局。

## 文档

- 设计与安装细节写在 [docs/README.md](docs/README.md)，用中文。
- 面向读者的安装说明维护在 `README.md` 与 `README.zh.md`。
- Markdown 用 `docs/scripts/reflow` 重排；`prek install` 后可交给本地钩子。

## 变更

- 增删插件先改 `aggregate.yml`，再生成并检查漂移。
- 不改源插件的行 id；不改生成的 `cordis.patch.yml`。
- 卡片标题、描述和图标分别改 `locale/` 与 `icon.svg`。
