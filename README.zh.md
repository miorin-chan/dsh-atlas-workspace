# dsh-workspace-family

[English](README.md)

把与工作区有关的插件收成一个薄聚合 bundle：

- [`dsh-workspace-picker`](../dsh-workspace-picker/README.zh.md) — 新会话页的工作区选择器增强。
- [`dsh-session-workspace-label`](../dsh-session-workspace-label/README.zh.md) — 会话标题旁的工作区名。
- [`dsh-workspace-agent-preset`](../dsh-workspace-agent-preset/README.zh.md) — 按工作区保存的默认 Agent preset。

这个包本身没有 Host 或 Client 行为。它把工作区插件声明为依赖，并把它们原来的 loader 行复制进同一份 bundle patch，
因此 **插件** 页只显示一张 **工作区三件套** 卡，卡内每个插件一行，仍各有自己的开关。

需要 DeepSeek Harness 0.2.2-rc.3 或更新版本。

## 范围

任何主要面向工作区的功能——选择、命名、组织工作区，或设置工作区默认值——都应加入本聚合包：
把包写进 `aggregate.yml`，运行 `pnpm run aggregate`，并保持源插件的行 id 稳定。
源插件仍可独立安装，但必须同时列在这里。
与工作区无关的功能仍应独立成包。

## 安装

1. 在本目录执行 `pnpm install`。它会生成 bundle 运行时需要的 `node_modules` 链接。
2. 从 profile 中禁用或移除对应的独立 bundle。
   聚合包与独立 bundle 会插入相同的行 id，同时存在是启动级错误。
3. 在 **插件** > **添加插件** 中选择本目录，或通过 `plugin_manager` 安装。
4. 确认卡片为每个插件显示一行，并逐行开关一次。

不要把这个聚合包和任一源插件的独立 bundle 同时安装。

## 开发

`aggregate.yml` 是唯一事实来源。`cordis.patch.yml`、依赖列表和生成元数据都由工作区工具写入：

```sh
pnpm run aggregate
pnpm run check
```

脚本调用本工作区的 `../../tools/dsh-aggregate`。
发布副本需要把生成器一起打包；见[项目文档](docs/README.md)。

## 文件

- `aggregate.yml` — 依赖声明与 bundle 顺序。
- `cordis.patch.yml` — 生成的 loader 行，不要手改。
- `locale/`、`icon.svg` — 聚合卡的标题、描述和图标。
- `docs/README.md` — 安装、迁移与验证细节。
