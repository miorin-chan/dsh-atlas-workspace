# @miorin/dsh-atlas-workspace 项目文档

## 使用

- 按 `Mod+K` [找会话](../../dsh-workspace-switcher/README.zh.md)，按 `Mod+Shift+K` 浏览工作区，
  可[按目录分组](../../dsh-workspace-file-tree/README.zh.md)。
  在新会话页点击工作区标签即可切换。
- 点击左侧会话列表下方的工作区名称，即可[浏览、搜索和预览文件](../../dsh-preview-file-navigation/README.zh.md)。
- 点击「工作区」或「会话」旁的小箭头[切换列表模式](../../dsh-workspace-list-toggle/README.zh.md)。
  「需关注」会保留[有未发送草稿的会话](../../dsh-session-draft/README.zh.md)。
- 侧栏使用单列表时，[在会话标题旁查看工作区名](../../dsh-workspace-title-badge/README.zh.md)。
  右键侧栏工作区，在 **默认** 菜单里[为新会话设置 Agent preset](../../dsh-workspace-default-preset/README.zh.md)。

## 兼容条件

需要 DeepSeek Harness `0.2.2-rc.5` 的 Web 客户端。

## 聚合的插件

聚合包把这些工作区功能放在一张卡里。

| 插件 | 作用 | 行 id |
| --- | --- | --- |
| `@miorin/dsh-workspace-switcher` | 会话检索、最近会话切换、工作区树与新会话工作区选择 | `workspace-switcher` |
| `@miorin/dsh-workspace-file-tree` | 切换器的文件目录分组，需启用切换器 | `dsh-workspace-file-tree` |
| `@miorin/dsh-preview-file-navigation` | 浏览和搜索当前工作目录，在右侧栏打开内置预览 | `dsh-preview-file-navigation` |
| `@miorin/dsh-workspace-list-toggle` | 左侧栏列表按「全部 → 收起 → 需关注」循环切换 | `dsh-workspace-list-toggle` |
| `@miorin/dsh-session-draft` | 标记有未发送草稿的会话，并让「需关注」保留它们 | `dsh-session-draft` |
| `@miorin/dsh-workspace-title-badge` | 会话标题旁的工作区标题标签 | `workspace-title-badge` |
| `@miorin/dsh-workspace-default-preset` | 每个工作区一个默认 Agent preset | `workspace-default-preset` |

`dsh-session-sounds`、`dsh-close-shortcuts` 等只与会话或界面有关，不属于工作区范围；
`dsh-sideby-note` 是公开的侧栏笔记插件，保持独立。

## 新增工作区功能

本聚合包是工作区功能的默认落点。新增“选择、命名、组织工作区，或设置工作区默认值”一类能力时：

1. 在源插件仓库实现行为；
2. 把插件包加入 `aggregate.yml`；
3. 运行 `pnpm run aggregate` 与 `pnpm run check`；
4. 保持源插件的行 id 不变，并更新 locale 标题、描述与文档。

卡片标题不枚举具体插件；新增插件时只需更新效果列表与描述。
源插件仍可独立安装，但必须同时登记进聚合包，不能只保留独立 bundle。
与工作区无关的功能仍应独立成包。

## 结构

```text
dsh-atlas-workspace/
├── aggregate.yml            # 源插件包与 link: spec
├── package.json             # 依赖、dsh.bundle、卡片元数据入口
├── cordis.patch.yml         # 由 dsh-aggregate 生成
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

在包目录执行：

```sh
pnpm run aggregate
pnpm run check
```

等价命令：

```sh
node ../../tools/dsh-aggregate/cli.mjs generate .
node ../../tools/dsh-aggregate/cli.mjs check .
```

工具会拒绝重复行 id、相对路径行、`override` patch 和包名不匹配。
生成的 patch 沿用源插件的行 id 和 `name`，因此迁移后 profile 里已有的逐行覆盖继续生效。

## 安装与迁移

### 一次性 profile

先在本包目录执行一次 `pnpm install`，再在临时 `DSH_HOME` 中验证：

```sh
tmp="$(mktemp -d)"
DSH_HOME="$tmp" dsh plugin --profile test add "$PWD"
DSH_HOME="$tmp" dsh --profile test --dump-config-schema > "$tmp/schema.json"
```

检查 `schema.json` 的 `x-cordis.diagnostics` 为空，并确认上表的七个行 id 都出现在 `x-cordis.entries`。
这一步使用独立于真实 profile 的临时目录。

### 真实 profile

1. 在聚合包目录运行 `pnpm install`。
2. 如果目标 profile 已单独安装任何成员，记下开关状态，再移除独立安装的包，避免行 ID 重复。
3. 在 **插件 → 添加插件** 选择聚合包目录，然后在新卡片恢复各成员的开关状态。

在插件页确认聚合卡显示七个成员。已有本地链接安装时，重新启用聚合包以载入新成员。

不要先装聚合包再移除独立 bundle，也不要让两者同时存在：相同行 id 会触发 `duplicate loader entry id`，
即使其中一行是 disabled。

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
- `pnpm run check` 依赖工作区的 `tools/dsh-aggregate`。
  发布到 npm 或从独立仓库构建前，需要把生成器构建成包内单文件脚本，否则 `prepack` 的相对路径不成立。
- 聚合包的 `engines.dsh` 取所有源插件的交集；升级任一插件时要同步检查。

## 验证记录

生成、一次性 profile、真实 Desktop profile 迁移、schema 和元数据解析的结果见 [verification.md](verification.md)。
一次性 Web profile 的 **插件** 页已确认聚合卡显示七行，关闭和重开「工作区文件」后，
侧栏入口相应消失和恢复，其余六行保持开启。

## Usage

- Press `Mod+K` to [find sessions](../../dsh-workspace-switcher/README.md).
  Use `Mod+Shift+K` to browse workspaces, with [directory grouping](../../dsh-workspace-file-tree/README.md) available.
  On the New Session screen, click the workspace chip to choose a workspace.
- In the left sidebar, click the workspace name below the session list
  to [browse, search, and preview files](../../dsh-preview-file-navigation/README.md).
- Click the chevron beside Workspaces or Sessions to [switch list modes](../../dsh-workspace-list-toggle/README.md).
  In **Needs attention**, [sessions with unsent drafts](../../dsh-session-draft/README.md) stay visible.
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
