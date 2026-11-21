# 验证记录

## 2026-11-21 · 最近访问会话

DSH 0.2.2-rc.5 中，重新生成并校验聚合仍得到四个插件行。
在一次性 macOS Desktop profile 安装 Atlas 后，按 A、B、C 顺序打开三个会话。
通过 Electron 原生按键桥验证 Ctrl+Tab、Ctrl+Shift+Tab 高亮顺序，以及 Mod+K 和 Mod+Shift+K 的原有视图。
Esc 取消时保留当前会话，Enter 打开高亮会话。CDP 原生快捷键序列未稳定送达 Ctrl 抬起。
用户随后用实体键确认，原版本松开 Ctrl 后没有切换。
Workspace Switcher `f538151` 为 macOS Desktop 加入约 650 毫秒的停顿确认，33 项自动化测试及 Atlas 聚合检查通过。
新版的实体键快速点按、停顿确认及内嵌页面焦点场景仍待复测。

## 2026-11-21 · 文件目录分组

DSH 0.2.2-rc.5 中，聚合生成与漂移检查通过。
一次性 Web profile 的 `--dump-config` 解析到四个插件行。
使用无头 Chrome 打开该 profile，确认内置侧栏和切换器弹窗同时呈现。
`Mod+Shift+K` 默认打开工作区树，视图菜单包含目录树。
选择目录树后，共享目录与两个工作区按三级缩进排列。
关闭重开仍选中目录树，`Mod+K` 仍从平铺会话开始。浏览器验证使用临时工作区和测试 profile。
文件目录插件的启停及服务重新注册由 Cordis 测试覆盖。

## 2026-11-20 · 初次聚合

> 注：包名后来改为 `@miorin/dsh-workspace-*`，行 id 改为 `workspace-*`；本记录保留当时的名称。

- 日期：2026-11-20
- 包版本：`dsh-workspace-atlas` 0.1.0
- DSH：0.2.2-rc.5
- 方式：生成/漂移校验 + 一次性 `DSH_HOME` + 真实 desktop profile 迁移。

## 生成与漂移

```text
$ cd plugins/dsh-workspace-atlas
$ pnpm run check
ok: 3 plugins, 3 rows; package.json and cordis.patch.yml are current
```

生成的 `cordis.patch.yml` 包含三行，行 id 与源插件一致：`dsh-workspace-welcome-switcher`、
`dsh-workspace-title-badge`、`dsh-workspace-default-preset`。

## 一次性 profile

```text
$ tmp="$(mktemp -d)"
$ DSH_HOME="$tmp/home" dsh plugin --profile test add "$PWD/plugins/dsh-workspace-atlas"
dsh: initialized profile test at .../profiles/test
dependencies:
+ dsh-workspace-atlas 0.1.0 <- .../plugins/dsh-workspace-atlas
```

`--dump-config-schema` 退出码 0：

```text
diagnostics: []
entries:
- dsh-workspace-welcome-switcher
- dsh-workspace-title-badge
- dsh-workspace-default-preset
```

三个 entry 的 `status` 都是 `absent`，与没有配置 schema 的普通插件一致；`x-cordis.diagnostics` 为空，说明行都解析成功。

## 卡片元数据

从临时 profile 的解析基准读取聚合包：

```text
dsh-workspace-atlas/locale/en.json -> plugins/dsh-workspace-atlas/locale/en.json
dsh-workspace-atlas/locale/zh.json -> plugins/dsh-workspace-atlas/locale/zh.json
dsh-workspace-atlas/icon         -> plugins/dsh-workspace-atlas/icon.svg
```

`locale/en.json` 与 `locale/zh.json` 都有 `meta.title` 和 `meta.description`。

## 真实 profile 迁移

迁移前把真实 profile 的 `package.json`、`cordis.patch.yml`、`cordis.yml`、
`pnpm-lock.yaml` 和 `pnpm-workspace.yaml` 备份到工作区 `scratch/dsh-workspace-family-migration-2026-11-20/`。

然后通过 `plugin_manager` 依次移除三个独立 bundle：

```text
remove_bundle dsh-workspace-welcome-switcher        -> changed: true, application: applied
remove_bundle dsh-workspace-title-badge -> changed: true, application: applied
remove_bundle dsh-workspace-default-preset  -> changed: true, application: applied
```

安装聚合包：

```text
install_bundle plugins/dsh-workspace-atlas
-> dsh-workspace-atlas 0.1.0, enabled: true, application: applied
```

迁移后的 profile `package.json` 只剩一个工作区依赖和一个工作区 bundle：

```text
dependencies: dsh-workspace-atlas
bundles:      dsh-workspace-atlas
```

`list_bundles` 显示该 bundle `enabled: true`，`rows` 为三行，三个 `entryId` 都存在；
`list_plugins` 显示三行都是 `fiberPhase: active`。
用户在真实 **插件** 页确认聚合卡可用。

## 只读检查

三个源插件的独立仓库 `git status --short` 均为空，聚合生成没有改动源插件。
聚合包自身的 `node_modules` 只包含三个 `link:` 符号链接。

## 打包

`pnpm pack` 会先运行 `prepack` 的漂移校验，然后生成 tarball：

```text
$ pnpm pack --pack-destination "$tmp"
$ node ../../tools/dsh-aggregate/cli.mjs check .
ok: 3 plugins, 3 rows; package.json and cordis.patch.yml are current
package: dsh-workspace-atlas@0.1.0
```

tarball 包含 `aggregate.yml`、`cordis.patch.yml`、`package.json`、`locale/`、`icon.svg`、
两份 README 和 `docs/`；不包含 `node_modules/`。

## 未覆盖

- 没有逐行开关、关闭整卡再恢复的完整回归记录；真实页面只确认当前可用。
- 没有发布到 npm；`prepack` 仍依赖工作区的 `tools/dsh-aggregate`。
- 回滚需要还原备份并重新安装三个独立 bundle；备份在 `scratch/`，确认稳定后可删除。
