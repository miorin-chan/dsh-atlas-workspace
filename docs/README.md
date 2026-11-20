# dsh-workspace-family 项目文档

## 为什么是这三个

工作区相关的插件有三类入口，正好可以收成一张卡：

| 插件 | 作用 | 行 id |
| --- | --- | --- |
| `dsh-workspace-picker` | 新会话页选择工作区 | `dsh-workspace-picker` |
| `dsh-session-workspace-label` | 会话头部显示工作区名 | `dsh-session-workspace-label` |
| `dsh-workspace-agent-preset` | 按工作区保存默认 Agent preset | `dsh-workspace-agent-preset` |

`dsh-session-sounds`、`dsh-close-shortcuts` 等只与会话或界面有关，不属于工作区范围；
`dsh-sideby-note` 是公开的侧栏笔记插件，保持独立。

## 新增工作区功能

本聚合包是工作区功能的默认落点。新增“选择、命名、组织工作区，或设置工作区默认值”一类能力时：

1. 在源插件仓库实现行为；
2. 把插件包加入 `aggregate.yml`；
3. 运行 `pnpm run aggregate` 与 `pnpm run check`；
4. 保持源插件的行 id 不变，并更新卡片描述与文档。

与工作区无关的功能仍应独立成包。

## 结构

```text
dsh-workspace-family/
├── aggregate.yml            # 唯一事实来源：三个包与 link: spec
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

检查 `schema.json` 的 `x-cordis.diagnostics` 为空，并确认三个行 id 都出现在 `x-cordis.entries`。
这一步不会碰真实 profile。

### 真实 profile

1. 逐个移除或禁用三个独立 bundle：`dsh-workspace-picker`、`dsh-session-workspace-label`、`dsh-workspace-agent-preset`。
2. 安装本包，确认 **插件** 页只剩一张 **工作区三件套** 卡。
3. 逐行开关，确认 HMR 只重组对应行；再关整张卡，确认三个行为都停止。

不要先装聚合包再移除独立 bundle，也不要让两者同时存在：相同行 id 会触发 `duplicate loader entry id`，
即使其中一行是 disabled。

## 卡片元数据

- `locale/en.json`：`Workspace family`
- `locale/zh.json`：`工作区三件套`
- `icon.svg`：三张叠放的工作区卡片

`package.json` 通过 `exports` 暴露 `./locale/*.json` 和 `./icon`，与独立插件的元数据读取方式一致。

## 已知限制

- 本包只是组合层，不提供配置页；配置入口仍由各插件自己的界面负责。
  如果以后某个插件按 `plugins.bundle.config`（key 是包名）注册配置页，聚合后 key 会变成聚合包名，
  需要改成 `plugins.row.config` 或同时注册两处。
- `pnpm run check` 依赖工作区的 `tools/dsh-aggregate`。
  发布到 npm 或从独立仓库构建前，需要把生成器构建成包内单文件脚本，否则 `prepack` 的相对路径不成立。
- 聚合包的 `engines.dsh` 取三个插件的交集；升级任一插件时要同步检查。
- 未在真实 **插件** 页验证卡片渲染；安装前先用一次性 profile 确认。

## 验证记录

生成、一次性 profile、真实 desktop profile 迁移、schema 和元数据解析的结果见 [verification.md](verification.md)。
真实 **插件** 页已确认当前可用；逐行开关回归尚未记录。
