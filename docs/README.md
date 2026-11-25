# @miorin/dsh-atlas-workspace 项目文档

## 使用

- 按 `Mod+K` [找会话](../../dsh-workspace-switcher/README.zh.md)，按 `Mod+Shift+K` 浏览工作区。
  在新会话页点击工作区标签即可切换。
- 点击左侧会话列表下方的工作区名称，即可[浏览、搜索和预览文件](../../dsh-preview-file-navigation/README.zh.md)。
- 侧栏使用单列表时，[在会话标题旁查看工作区名](../../dsh-workspace-title-badge/README.zh.md)。
  右键侧栏工作区，在 **默认** 菜单里[为新会话设置 Agent preset](../../dsh-workspace-default-preset/README.zh.md)。

## 兼容条件

需要 DeepSeek Harness `0.2.2-rc.5` 的 Web 客户端。

## 聚合的插件

聚合包把这些工作区功能放在一张卡里。

| 插件 | 作用 | 行 id |
| --- | --- | --- |
| `@miorin/dsh-workspace-switcher` | 会话检索、最近会话切换、工作区树与新会话工作区选择 | `workspace-switcher` |
| `@miorin/dsh-preview-file-navigation` | 浏览和搜索当前工作目录，在右侧栏打开内置预览 | `dsh-preview-file-navigation` |
| `@miorin/dsh-workspace-title-badge` | 会话标题旁的工作区标题标签 | `workspace-title-badge` |
| `@miorin/dsh-workspace-default-preset` | 每个工作区一个默认 Agent preset | `workspace-default-preset` |

`dsh-session-sounds`、`dsh-close-shortcuts` 等只与会话或界面有关，不属于工作区范围；
`dsh-sideby-note` 是公开的侧栏笔记插件，保持独立。

## 新增工作区功能

本聚合包是工作区功能的默认落点。新增“选择、命名、组织工作区，或设置工作区默认值”一类能力时：

1. 在源插件仓库实现行为并发布，保持源插件的行 id 不变。
2. 在 `aggregate.yml` 添加插件包和固定版本。
3. 依照下文安装依赖，生成并校验 patch。
4. 更新 locale 标题、描述与文档。

卡片标题不枚举具体插件；新增插件时只需更新效果列表与描述。
源插件仍可独立安装，但必须同时登记进聚合包，不能只保留独立 bundle。
与工作区无关的功能仍应独立成包。

## 结构

```text
dsh-atlas-workspace/
├── aggregate.yml            # 源插件包与固定的 npm 版本
├── package.json             # 依赖、dsh.bundle、卡片元数据入口
├── cordis.patch.yml         # 由 dsh-aggregate 生成
├── scripts/aggregate/       # 生成器的 TypeScript 源码
├── scripts/dsh-aggregate.mjs # 构建并随 npm 包发布的单文件生成器
├── locale/*.json            # 聚合卡标题与描述
├── icon.svg                 # 聚合卡图标
├── README.md / README.zh.md
├── AGENTS.md / AGENTS.local.md
└── docs/README.md
```

`cordis.patch.yml` 和 `package.json` 里的 `dependencies`、`dsh.bundle.patch`、
`dsh.aggregate.plugins` 都由工作区的 `tools/dsh-aggregate` 生成。
不要手改 `cordis.patch.yml`；需要改行内容时改源插件的 patch，再重新生成。

## 生成与校验

在 Node.js 22.18 或更新版本运行 `pnpm install`，
安装固定版本并从 `scripts/aggregate/` 的 TypeScript 源码构建 `scripts/dsh-aggregate.mjs`，再更新入库的 patch。
手动生成用 `npm run build`，原有的 `pnpm run aggregate` 仍可用。
`npm test` 重新生成并校验，`npm run check` 只读检查生成器和聚合字段是否有漂移。
发布包中的 `scripts/dsh-aggregate.mjs` 包含 YAML 解析器。
装好成员依赖后，可用 `node scripts/dsh-aggregate.mjs check .` 校验。

新增或升级成员时，先更新[聚合清单](../aggregate.yml)，
用 `pnpm add --save-exact --ignore-scripts <包名>@<版本>` 装齐新版本，
再执行 `npm run build` 与 `pnpm install`，同步提交依赖清单、锁文件和 patch。
联调本地成员时，先在各成员的检出目录构建，再用聚合包 `node_modules` 里的本地链接，成员版本须匹配固定版本。

工具会拒绝重复行 id、相对路径行、`override` patch，以及包名或固定版本不匹配。
生成的 patch 沿用源插件的行 id 和 `name`，因此迁移后 profile 里已有的逐行覆盖继续生效。

`npm pack --dry-run --json` 会重新生成 patch 并列出包内文件，可使用版本匹配的本地链接。
发布从独立干净检出执行 `pnpm install --frozen-lockfile`，检查生成的改动并运行 `npm test`。
发布检查要求成员来自该检出的注册表依赖树。

## 安装与迁移

### 一次性 profile

先在本包目录执行一次 `pnpm install`，再在临时 `DSH_HOME` 中验证：

```sh
tmp="$(mktemp -d)"
DSH_HOME="$tmp" dsh plugin --profile test add "$PWD"
DSH_HOME="$tmp" dsh --profile test --dump-config-schema > "$tmp/schema.json"
```

检查 `schema.json` 的 `x-cordis.diagnostics` 为空，并确认上表的四个行 id 都出现在 `x-cordis.entries`。
这一步使用独立于真实 profile 的临时目录。

### 真实 profile

1. 在聚合包目录运行 `pnpm install`。
2. 如果目标 profile 已单独安装任何成员，记下开关状态，再移除独立安装的包，避免行 ID 重复。
3. 在 **插件 → 添加插件** 选择聚合包目录，然后在新卡片恢复各成员的开关状态。

在插件页确认聚合卡显示四个成员。已有本地链接安装时，重新启用聚合包以应用成员变更。

不要先装聚合包再移除独立 bundle，也不要让两者同时存在：相同行 id 会触发 `duplicate loader entry id`，
即使其中一行是 disabled。

### 从旧版工作区 Atlas 迁移

侧栏列表模式（现为 `dsh-session-list-toggle`，原为 `dsh-workspace-list-toggle`）和会话草稿提示
（`dsh-session-draft`）已迁入 [列表模块化改良计划](../../dsh-atlas-list/README.zh.md)。
先更新工作区 Atlas，并确认工作区卡已移除这两个成员，再启用列表 Atlas。
会话草稿保留原行 ID。列表三态开关改名后，如果已有旧行 ID 的覆盖，请同步改成 `dsh-session-list-toggle`。

## 卡片元数据

聚合卡的标题和描述维护八种语言（`en zh ja de es fr pt ru`）。

- `locale/en.json`：`Workspace Modular Improvement Plan`
- `locale/zh.json`：`工作区模块化改良计划`
- `icon.svg`：文件夹主体，右下角是 atlas 系列共用的罗盘徽记

`package.json` 通过 `exports` 暴露 `./locale/*.json` 和 `./icon`，与独立插件的元数据读取方式一致。

## 已知限制

- 本包只是组合层，不提供配置页；配置入口仍由各插件自己的界面负责。
  如果以后某个插件按 `plugins.bundle.config`（key 是包名）注册配置页，聚合后 key 会变成聚合包名，
  需要改成 `plugins.row.config` 或同时注册两处。
- 聚合包的 `engines.dsh` 取所有源插件的交集；升级任一插件时要同步检查。

## 验证记录

生成、一次性 profile、真实 Desktop profile 迁移、schema 和元数据解析的结果见 [verification.md](verification.md)。
「工作区文件」加入时，曾在一次性 Web profile 的 **插件** 页确认聚合卡显示当时的七行。
关闭并重开「工作区文件」后，侧栏入口相应消失和恢复，其余六行保持开启。

## Usage

- Press `Mod+K` to [find sessions](../../dsh-workspace-switcher/README.md).
  Use `Mod+Shift+K` to browse workspaces.
  On the New Session screen, click the workspace chip to choose a workspace.
- In the left sidebar, click the workspace name below the session list
  to [browse, search, and preview files](../../dsh-preview-file-navigation/README.md).
- In the flat sidebar list,
  see the [workspace name beside the session title](../../dsh-workspace-title-badge/README.md).
  Right-click a workspace and choose **Default**
  to [set the Agent preset for new sessions](../../dsh-workspace-default-preset/README.md).

## Compatibility

Requires the Web client on DeepSeek Harness `0.2.2-rc.5`.

## Install

1. Run `pnpm install` from the bundle directory.
2. If any member is installed separately in the target profile, note its switch state and remove its bundle
   to avoid duplicate row IDs.
3. In **Plugins → Add plugin**, select the bundle directory.
   Restore the saved switch states on the new card.

Sidebar list modes and draft indicators moved to the [List Modular Improvement Plan](../../dsh-atlas-list/README.md).
Update Workspace Atlas and confirm that both rows have left its card before enabling List Atlas.
Both rows keep their original IDs, so existing row overrides still match.
