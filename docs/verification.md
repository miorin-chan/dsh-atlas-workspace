# 验证记录

- 日期：2026-11-20
- 包版本：`@local/dsh-workspace-family` 0.1.0
- DSH：0.2.2-rc.5
- 方式：生成/漂移校验 + 一次性 `DSH_HOME` profile；未改真实 profile。

## 生成与漂移

```text
$ cd plugins/dsh-workspace-family
$ pnpm run check
ok: 3 plugins, 3 rows; package.json and cordis.patch.yml are current
```

生成的 `cordis.patch.yml` 包含三行，行 id 与源插件一致：`dsh-workspace-picker`、`dsh-session-workspace-label`、
`dsh-workspace-agent-preset`。

## 一次性 profile

```text
$ tmp="$(mktemp -d)"
$ DSH_HOME="$tmp/home" dsh plugin --profile test add "$PWD/plugins/dsh-workspace-family"
dsh: initialized profile test at .../profiles/test
dependencies:
+ @local/dsh-workspace-family 0.1.0 <- .../plugins/dsh-workspace-family
```

`--dump-config-schema` 退出码 0：

```text
diagnostics: []
entries:
- dsh-workspace-picker
- dsh-session-workspace-label
- dsh-workspace-agent-preset
```

三个 entry 的 `status` 都是 `absent`，与没有配置 schema 的普通插件一致；`x-cordis.diagnostics` 为空，说明行都解析成功。

## 卡片元数据

从临时 profile 的解析基准读取聚合包：

```text
@local/dsh-workspace-family/locale/en.json -> plugins/dsh-workspace-family/locale/en.json
@local/dsh-workspace-family/locale/zh.json -> plugins/dsh-workspace-family/locale/zh.json
@local/dsh-workspace-family/icon         -> plugins/dsh-workspace-family/icon.svg
```

`locale/en.json` 与 `locale/zh.json` 都有 `meta.title` 和 `meta.description`。

## 只读检查

三个源插件的独立仓库 `git status --short` 均为空，聚合生成没有改动源插件。
聚合包自身的 `node_modules` 只包含三个 `link:` 符号链接。

## 打包

`pnpm pack` 会先运行 `prepack` 的漂移校验，然后生成 tarball：

```text
$ pnpm pack --pack-destination "$tmp"
$ node ../../tools/dsh-aggregate/cli.mjs check .
ok: 3 plugins, 3 rows; package.json and cordis.patch.yml are current
package: @local/dsh-workspace-family@0.1.0
```

tarball 包含 `aggregate.yml`、`cordis.patch.yml`、`package.json`、`locale/`、`icon.svg`、
两份 README 和 `docs/`；不包含 `node_modules/`。

## 未验证

没有在真实 **插件** 页看这张卡的渲染，也没有在真实 profile 执行迁移。
安装前应先用一次性 profile 的页面确认，再按 [README](README.md) 的步骤移除独立 bundle。
