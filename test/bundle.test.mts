import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFile(new URL(path, root), 'utf8')

function parseInsertRows(patch: string) {
  const rows: Array<{ id: string; name: string }> = []
  let current: { id?: string; name?: string } | undefined
  for (const rawLine of patch.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#') || line === '- insert:') continue
    const idMatch = line.match(/^- id:\s*(.+)$/u)
    if (idMatch) {
      if (current !== undefined) rows.push({ id: current.id ?? '', name: current.name ?? '' })
      current = { id: idMatch[1].replace(/^['"]|['"]$/gu, '') }
      continue
    }
    const nameMatch = line.match(/^name:\s*(.+)$/u)
    if (nameMatch && current !== undefined) {
      current.name = nameMatch[1].replace(/^['"]|['"]$/gu, '')
    }
  }
  if (current !== undefined) rows.push({ id: current.id ?? '', name: current.name ?? '' })
  return rows
}

test('declares member plugin rows in order plus the aggregate runtime row', async () => {
  const manifest = JSON.parse(await read('package.json'))
  assert.equal(manifest.name, '@miorin/dsh-atlas-workspace')
  assert.notEqual(manifest.private, true)
  assert.equal(manifest.exports['.'], './index.js')
  assert.equal(manifest.exports['./client'], './client.js')
  assert.deepEqual(manifest.dsh.bundle, { patch: './cordis.patch.yml' })
  assert.equal(manifest.dsh.aggregate.version, 1)
  assert.equal(manifest.dsh.aggregate.runtimeRowId, 'dsh-atlas-workspace')

  const rows = parseInsertRows(await read(manifest.dsh.bundle.patch))
  assert.ok(rows.length >= manifest.dsh.aggregate.plugins.length + 1)
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length)
  assert.deepEqual(rows.at(-1), { id: 'dsh-atlas-workspace', name: '@miorin/dsh-atlas-workspace' })
  const memberNames = rows.slice(0, -1).map(row => row.name.split('/').slice(0, 2).join('/'))
  const deduped = memberNames.filter((name, index) => index === 0 || memberNames[index - 1] !== name)
  assert.deepEqual(deduped, manifest.dsh.aggregate.plugins)
})

test('loads built index.js and client.js via ModuleLoader envelope', async () => {
  const hostMod = await import(new URL('index.js', root).href) as { name?: unknown; apply?: unknown }
  assert.equal(hostMod.name, '@miorin/dsh-atlas-workspace')
  assert.equal(typeof hostMod.apply, 'function')

  const clientCode = await read('client.js')
  let loaded: { id: string; factory: (req: (id: string) => unknown) => Record<string, unknown> } | undefined
  vm.runInNewContext(clientCode, {
    window: { __ModuleLoader__: { load(payload: typeof loaded) { loaded = payload } } },
  })
  assert.equal(loaded?.id, '@miorin/dsh-atlas-workspace')
  const mod = loaded!.factory(id => {
    if (id === 'react') {
      return {
        Fragment: Symbol('Fragment'),
        createElement: () => null,
        useEffect: () => {},
        useId: () => 'id',
        useRef: (v: unknown) => ({ current: v }),
        useState: (v: unknown) => [v, () => {}],
        useSyncExternalStore: (_sub: unknown, get: () => unknown) => get(),
      }
    }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      return {
        Button: () => null,
        IconChevronRightOutlineRegular: () => null,
        IconChevronsUpDownOutlineMedium: () => null,
        Modal: () => null,
        PluginArtworkSubagent: () => null,
        Switch: () => null,
        Tooltip: ({ children }: { children: unknown }) => children,
      }
    }
    throw new Error(`unexpected require: ${id}`)
  }) as { inject: readonly string[]; apply: (ctx: unknown) => void }
  assert.deepEqual([...mod.inject], ['locale', 'slots', 'remote', 'remote.pluginManager'])
  assert.equal(typeof mod.apply, 'function')
})
