# @miorin/dsh-workspace-atlas 项目文档

## 聚合的插件

聚合包把这些工作区功能放在一张卡里。

| 插件 | 作用 | 行 id |
| --- | --- | --- |
| `@miorin/dsh-workspace-switcher` | 会话检索、最近会话切换、工作区树与新会话工作区选择 | `workspace-switcher` |
| `dsh-workspace-file-tree` | 切换器的文件目录分组，需启用切换器 | `dsh-workspace-file-tree` |
| `dsh-workspace-list-toggle` | 左侧栏列表按「全部 → 收起 → 需关注」循环切换 | `dsh-workspace-list-toggle` |
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
dsh-workspace-atlas/
├── aggregate.yml            # 源插件包与 link: spec
├── package.json             # 依赖、dsh.bundle、卡片元数据入口
├── cordis.patch.yml         # 由 dsh-aggregate 生成
├── locale/{en,zh}.json      # 聚合卡标题与描述
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

检查 `schema.json` 的 `x-cordis.diagnostics` 为空，并确认上表的五个行 id 都出现在 `x-cordis.entries`。
这一步使用独立于真实 profile 的临时目录。

### 真实 profile

1. 记录已有成员的开关状态，移除目标 profile 中已独立安装的成员 bundle。
2. 安装本包，确认 **插件** 页的 **工作区模块化改良计划** 卡按上表顺序显示五个成员。
3. 恢复各行的开关状态。验证启停时检查 HMR 是否只重组对应行，并在整卡关闭后确认五项功能都停止。

不要先装聚合包再移除独立 bundle，也不要让两者同时存在：相同行 id 会触发 `duplicate loader entry id`，
即使其中一行是 disabled。

## 卡片元数据

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
- 未在真实 **插件** 页验证卡片渲染；安装前先用一次性 profile 确认。

## 验证记录

生成、一次性 profile、真实 desktop profile 迁移、schema 和元数据解析的结果见 [verification.md](verification.md)。
真实 **插件** 页已确认当前可用；逐行开关回归尚未记录。
