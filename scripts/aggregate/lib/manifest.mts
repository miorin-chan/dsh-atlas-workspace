import { readFile } from 'node:fs/promises'
import { dirname, posix, resolve } from 'node:path'
import { parseDocument } from 'yaml'
import { isRecord, isStringArray } from './data.mts'
import { AggregateError, isMissingFile } from './errors.mts'
import { assertPackageName } from './specifiers.mts'
import type { AggregateManifest, ManifestPlugin } from './types.mts'

const KEYS = new Set([
  'name',
  'version',
  'private',
  'description',
  'license',
  'keywords',
  'engines',
  'patch',
  'plugins',
])

const PLUGIN_KEYS = new Set(['name', 'spec'])
const DEFAULT_PATCH = './cordis.patch.yml'

/**
 * Read and validate `aggregate.yml`.
 *
 * The manifest owns the package's declared dependencies and the generated
 * patch path. Package metadata is used only when `package.json` does not exist
 * yet; an existing manifest is never rewritten by this loader.
 */
export async function loadManifest(manifestPath: string): Promise<AggregateManifest> {
  const absolute = resolve(manifestPath)
  let text
  try {
    text = await readFile(absolute, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) throw new AggregateError(`manifest not found: ${manifestPath}`)
    throw error
  }

  const doc = parseDocument(text, { keepSourceTokens: true })
  if (doc.errors.length > 0) {
    throw new AggregateError(
      `cannot parse ${manifestPath}:\n${doc.errors.map(error => `  ${error.message}`).join('\n')}`,
    )
  }
  if (doc.contents === null) throw new AggregateError(`${manifestPath} is empty`)

  const data: unknown = doc.toJS()
  if (!isRecord(data)) {
    throw new AggregateError(`${manifestPath} must be a YAML mapping`)
  }

  const unknown = Object.keys(data).filter(key => !KEYS.has(key))
  if (unknown.length > 0) {
    throw new AggregateError(`${manifestPath}: unknown key ${unknown.join(', ')}`)
  }

  assertPackageName(data.name, `${manifestPath}: name`)
  const version = optionalString(data.version, `${manifestPath}: version`) ?? '0.1.0'
  const privatePackage = data.private ?? true
  if (typeof privatePackage !== 'boolean') {
    throw new AggregateError(`${manifestPath}: private must be true or false`)
  }
  const description = optionalString(data.description, `${manifestPath}: description`)
  const license = optionalString(data.license, `${manifestPath}: license`)
  const keywords = optionalStringList(data.keywords, `${manifestPath}: keywords`)
  const engines = optionalStringMap(data.engines, `${manifestPath}: engines`)
  const patch = normalizePatch(data.patch, manifestPath)

  if (!Array.isArray(data.plugins) || data.plugins.length === 0) {
    throw new AggregateError(`${manifestPath}: plugins must be a non-empty list`)
  }
  const plugins = data.plugins.map((entry, index) =>
    normalizePlugin(entry, `${manifestPath}: plugins[${index}]`),
  )
  const seen = new Set<string>()
  for (const plugin of plugins) {
    if (seen.has(plugin.name)) {
      throw new AggregateError(`${manifestPath}: plugin ${JSON.stringify(plugin.name)} is listed twice`)
    }
    seen.add(plugin.name)
  }

  return {
    path: absolute,
    dir: dirname(absolute),
    name: data.name,
    version,
    private: privatePackage,
    description,
    license,
    keywords,
    engines,
    patch,
    plugins,
  }
}

function normalizePlugin(entry: unknown, label: string): ManifestPlugin {
  let name: unknown
  let spec: unknown
  if (typeof entry === 'string') {
    name = entry
    spec = `link:../${entry}`
  } else if (isRecord(entry)) {
    const unknown = Object.keys(entry).filter(key => !PLUGIN_KEYS.has(key))
    if (unknown.length > 0) {
      throw new AggregateError(`${label}: unknown key ${unknown.join(', ')}`)
    }
    name = entry.name
    spec = entry.spec ?? `link:../${entry.name}`
  } else {
    throw new AggregateError(`${label}: expected a package name or an object with name and spec`)
  }

  assertPackageName(name, `${label}.name`)
  validateSpec(spec, `${label}.spec`)
  return { name, spec }
}

function normalizePatch(value: unknown, manifestPath: string): string {
  const patch = value ?? DEFAULT_PATCH
  if (typeof patch !== 'string' || patch.trim() === '') {
    throw new AggregateError(`${manifestPath}: patch must be a non-empty path`)
  }
  if (patch.includes('\\')) {
    throw new AggregateError(`${manifestPath}: patch must use forward slashes`)
  }
  if (posix.isAbsolute(patch)) {
    throw new AggregateError(`${manifestPath}: patch must be relative to the aggregate package`)
  }
  const normalized = posix.normalize(patch)
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new AggregateError(`${manifestPath}: patch must stay inside the aggregate package`)
  }
  return normalized.startsWith('./') ? normalized : `./${normalized}`
}

function validateSpec(spec: unknown, label: string): asserts spec is string {
  if (typeof spec !== 'string' || spec.trim() === '') {
    throw new AggregateError(`${label} must be a non-empty dependency spec`)
  }
  if (/^workspace:/.test(spec)) {
    throw new AggregateError(
      `${label}: workspace: specs are not portable; use link:<path> for local plugins or an exact version`,
    )
  }
  if (/^(?:portal|npm|git|https?):/.test(spec)) {
    throw new AggregateError(`${label}: ${spec} is not supported; use link:<path> or an exact version`)
  }
  if (/^(?:link|file):/.test(spec)) {
    const target = spec.slice(spec.indexOf(':') + 1)
    if (target === '') throw new AggregateError(`${label}: ${spec} has no path`)
    return
  }
  if (/^(?:\.{1,2}[\\/]|[\\/]|~[\\/])/.test(spec)) {
    throw new AggregateError(`${label}: use link:<path> or file:<path> instead of a bare path`)
  }
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AggregateError(`${label} must be a non-empty string`)
  }
  return value
}

function optionalStringList(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined
  if (!isStringArray(value) || value.some(item => item.trim() === '')) {
    throw new AggregateError(`${label} must be a list of non-empty strings`)
  }
  return value
}

function optionalStringMap(value: unknown, label: string): Record<string, string> | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    throw new AggregateError(`${label} must be a mapping of strings`)
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new AggregateError(`${label}.${key} must be a non-empty string`)
    }
  }
  return value as Record<string, string>
}
