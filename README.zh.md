# @miorin/dsh-workspace-atlas

[English](README.md)

**工作区模块化改良计划。**

用模块化的方式围绕工作区使用体验提供可微的持续改进。
一张卡，一行一个增强，每行独立开关。

- [`@miorin/dsh-workspace-switcher`](../dsh-workspace-switcher/README.zh.md) — 会话检索、
  工作区树快捷键和新会话工作区选择。
- [`dsh-workspace-file-tree`](../dsh-workspace-file-tree/README.zh.md) 在切换器中按文件目录组织工作区。
- [`@miorin/dsh-workspace-title-badge`](../dsh-workspace-title-badge/README.zh.md) — 会话标题旁的工作区名。
- [`@miorin/dsh-workspace-default-preset`](../dsh-workspace-default-preset/README.zh.md) — 每个工作
  区一个默认 Agent preset。

需要 DeepSeek Harness 0.2.2-rc.3 或更新版本。

## 安装

1. 在本目录执行 `pnpm install`；bundle 通过生成的链接解析各行。
2. 移除对应的独立 bundle；聚合包与源 bundle 会插入同一个行 id。
3. 在 **插件** > **添加插件** 中选择本目录，或通过 `plugin_manager` 安装。

## 范围

新的工作区功能都应加入本聚合包：把包写进 `aggregate.yml`，运行 `pnpm run aggregate`，并保持行 id 稳定。
源插件仍可独立安装。

## 开发

`aggregate.yml` 是唯一事实来源；`pnpm run check` 校验生成的 patch 与依赖。
发布副本需要把生成器一起打包。

[项目文档](docs/README.md)
