import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { getField, isRecord } from './data.mts'
import { AggregateError } from './errors.mts'
import { displayPath } from './paths.mts'
import { assertRowName, isExactVersion } from './specifiers.mts'
import type {
  AggregateManifest,
  AggregatePlan,
  AggregateRow,
  ManifestPlugin,
  PatchRow,
  ResolvedPlugin,
} from './types.mts'

type RowLocation = Omit<AggregateRow, 'row'>

/**
 * Resolve every declared plugin, read its bundle patch, and collect the rows
 * that the aggregate patch will insert.
 *
 * This function is deliberately read-only: it never installs packages and
 * never writes to a plugin directory.
 */
export async function buildPlan(manifest: AggregateManifest): Promise<AggregatePlan> {
  const plugins: ResolvedPlugin[] = []
  const rows: AggregateRow[] = []
  const firstById = new Map<string, RowLocation>()
  const duplicates = new Map<string, RowLocation[]>()

  for (const entry of manifest.plugins) {
    const dir = sourceDir(entry, manifest)
    const pkg = await readPackage(dir, entry)
    const patchFiles = patchFilesOf(pkg, dir, entry)
    const pluginRows: PatchRow[] = []

    for (const file of patchFiles) {
      pluginRows.push(...(await readPatch(file, manifest.dir)))
    }

    for (const { row, file } of pluginRows) {
      const id = row.get('id')
      const label = `${displayPath(file, manifest.dir)}: row ${JSON.stringify(id ?? '?')}`
      if (typeof id !== 'string' || id.trim() === '') {
        throw new AggregateError(`${label}: row "id" must be a non-empty string`)
      }
      assertRowName(row.get('name'), entry.name, label)

      const location = { plugin: entry.name, file, id }
      const first = firstById.get(id)
      if (first) {
        const repeated = duplicates.get(id)
        if (repeated) repeated.push(location)
        else duplicates.set(id, [first, location])
      } else {
        firstById.set(id, location)
      }
      rows.push({ row, ...location })
    }

    plugins.push({ ...entry, dir, pkg, patchFiles, rows: pluginRows })
  }

  if (duplicates.size > 0) {
    const lines = [...duplicates].map(([id, locations]) => {
      const sources = locations
        .map(location => `  - ${location.plugin} (${displayPath(location.file, manifest.dir)})`)
        .join('\n')
      return `duplicate loader row id ${JSON.stringify(id)}:\n${sources}`
    })
    throw new AggregateError(lines.join('\n'))
  }

  return {
    plugins,
    rows,
    dependencies: manifest.plugins.map(plugin => [plugin.name, plugin.spec]),
  }
}

function sourceDir(entry: ManifestPlugin, manifest: AggregateManifest): string {
  if (entry.spec.startsWith('link:') || entry.spec.startsWith('file:')) {
    const target = entry.spec.slice(entry.spec.indexOf(':') + 1)
    const dir = resolve(manifest.dir, target)
    if (!existsSync(join(dir, 'package.json'))) {
      throw new AggregateError(
        `plugin ${JSON.stringify(entry.name)}: ${dir} has no package.json (from ${entry.spec})`,
      )
    }
    return dir
  }

  const dir = join(manifest.dir, 'node_modules', ...entry.name.split('/'))
  if (!existsSync(join(dir, 'package.json'))) {
    throw new AggregateError(
      `plugin ${JSON.stringify(entry.name)}: not found under ${join(manifest.dir, 'node_modules')}; ` +
        `run pnpm install in ${manifest.dir}`,
    )
  }
  return dir
}

async function readPackage(dir: string, entry: ManifestPlugin): Promise<Record<string, unknown>> {
  const file = join(dir, 'package.json')
  let pkg: unknown
  try {
    pkg = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AggregateError(`plugin ${JSON.stringify(entry.name)}: cannot parse ${file}: ${error.message}`)
    }
    throw error
  }
  if (!isRecord(pkg)) {
    throw new AggregateError(`plugin ${JSON.stringify(entry.name)}: ${file} must contain a JSON object`)
  }
  if (pkg.name !== entry.name) {
    throw new AggregateError(
      `plugin ${JSON.stringify(entry.name)}: ${file} declares package ${JSON.stringify(pkg.name)}`,
    )
  }
  if (isExactVersion(entry.spec) && pkg.version !== entry.spec) {
    throw new AggregateError(
      `plugin ${JSON.stringify(entry.name)}: expected version ${entry.spec}, found ${JSON.stringify(pkg.version)} in ${file}`,
    )
  }
  return pkg
}

function patchFilesOf(pkg: Record<string, unknown>, dir: string, entry: ManifestPlugin): string[] {
  const field = getField(getField(pkg.dsh, 'bundle'), 'patch')
  if (field === undefined) {
    throw new AggregateError(
      `plugin ${JSON.stringify(entry.name)}: package.json has no dsh.bundle.patch; it is not a bundle`,
    )
  }
  const values: unknown[] = Array.isArray(field) ? field : [field]
  if (values.length === 0) {
    throw new AggregateError(`plugin ${JSON.stringify(entry.name)}: dsh.bundle.patch is empty`)
  }

  return values.map(value => {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new AggregateError(`plugin ${JSON.stringify(entry.name)}: dsh.bundle.patch must name a file`)
    }
    if (isAbsolute(value) || value.includes('\\')) {
      throw new AggregateError(
        `plugin ${JSON.stringify(entry.name)}: dsh.bundle.patch ${JSON.stringify(value)} must be a relative forward-slash path`,
      )
    }
    const file = resolve(dir, value)
    if (!file.startsWith(dir + sep)) {
      throw new AggregateError(
        `plugin ${JSON.stringify(entry.name)}: patch ${JSON.stringify(value)} escapes the plugin directory`,
      )
    }
    if (!existsSync(file)) {
      throw new AggregateError(`plugin ${JSON.stringify(entry.name)}: patch not found: ${file}`)
    }
    return file
  })
}

async function readPatch(file: string, base: string): Promise<PatchRow[]> {
  const text = await readFile(file, 'utf8')
  const doc = parseDocument(text, { keepSourceTokens: true })
  if (doc.errors.length > 0) {
    throw new AggregateError(
      `${displayPath(file, base)}: cannot parse patch:\n` +
        doc.errors.map(error => `  ${error.message}`).join('\n'),
    )
  }

  const warnings = doc.warnings.filter(warning => !warning.message.includes('tag:yaml.org,2002:js'))
  if (warnings.length > 0) {
    throw new AggregateError(
      `${displayPath(file, base)}: patch warnings:\n` +
        warnings.map(warning => `  ${warning.message}`).join('\n'),
    )
  }

  if (!isSeq(doc.contents)) {
    throw new AggregateError(`${displayPath(file, base)}: patch must be a top-level YAML list`)
  }

  const rows: PatchRow[] = []
  for (const [index, item] of doc.contents.items.entries()) {
    if (!isMap(item)) {
      throw new AggregateError(`${displayPath(file, base)}: patch item ${index + 1} must be a mapping`)
    }
    const extra = item.items
      .map(({ key }) => String(isScalar(key) ? key.value ?? key : key))
      .filter(key => key !== 'insert')
    if (extra.length > 0) {
      throw new AggregateError(
        `${displayPath(file, base)}: top-level key ${JSON.stringify(extra[0])} is not supported; ` +
          'an aggregate plugin may only insert rows',
      )
    }
    const insert = item.get('insert', true)
    if (!isSeq(insert)) {
      throw new AggregateError(
        `${displayPath(file, base)}: patch item ${index + 1} must declare an insert list`,
      )
    }
    for (const row of insert.items) {
      if (!isMap(row)) {
        throw new AggregateError(`${displayPath(file, base)}: insert rows must be mappings`)
      }
      if (!row.has('id')) throw new AggregateError(`${displayPath(file, base)}: insert row has no id`)
      if (!row.has('name')) throw new AggregateError(`${displayPath(file, base)}: insert row has no name`)
      rows.push({ row, file })
    }
  }

  if (rows.length === 0) {
    throw new AggregateError(`${displayPath(file, base)}: patch inserts no rows`)
  }
  return rows
}
