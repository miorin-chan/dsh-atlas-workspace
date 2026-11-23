import { getField, isRecord, isStringArray } from './data.mts'
import { AggregateError } from './errors.mts'
import type { AggregateManifest, DependencyEntries } from './types.mts'

/**
 * Return the package.json that `generate` should write.
 *
 * Existing package metadata and unrelated dependencies are preserved. The
 * managed fields are the declared dependency specs, `dsh.bundle.patch`, and
 * the generated `dsh.aggregate.plugins` list, which lets a later generation
 * remove dependencies for plugins that were dropped from the manifest.
 */
export function buildPackageJson(
  manifest: AggregateManifest,
  dependencies: DependencyEntries,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const pkg =
    existing === undefined
      ? newPackageJson(manifest)
      : structuredClone(existing)

  if (existing !== undefined && pkg.name !== manifest.name) {
    throw new AggregateError(
      `package.json name ${JSON.stringify(pkg.name)} does not match aggregate.yml name ${JSON.stringify(manifest.name)}`,
    )
  }
  const dsh = pkg.dsh === undefined ? {} : pkg.dsh
  if (!isRecord(dsh)) {
    throw new AggregateError('package.json dsh must be a mapping')
  }
  pkg.dsh = dsh
  const bundle = dsh.bundle === undefined ? {} : dsh.bundle
  if (!isRecord(bundle)) {
    throw new AggregateError('package.json dsh.bundle must be a mapping')
  }
  dsh.bundle = bundle
  const declared = pkg.dependencies === undefined ? {} : pkg.dependencies
  if (!isRecord(declared)) {
    throw new AggregateError('package.json dependencies must be a mapping')
  }

  const aggregate = dsh.aggregate
  if (aggregate !== undefined && !isRecord(aggregate)) {
    throw new AggregateError('package.json dsh.aggregate must be a mapping')
  }
  const previous = aggregate?.plugins
  if (previous !== undefined && !isStringArray(previous)) {
    throw new AggregateError('package.json dsh.aggregate.plugins must be a list of package names')
  }

  bundle.patch = manifest.patch
  const names = manifest.plugins.map(plugin => plugin.name)
  const deps = { ...declared }
  for (const name of previous ?? []) {
    if (!names.includes(name)) delete deps[name]
  }
  for (const [name, spec] of dependencies) deps[name] = spec
  pkg.dependencies = deps
  dsh.aggregate = { plugins: names }
  return pkg
}

/** Return every drift problem in an existing package.json; empty means current. */
export function validatePackageJson(
  pkg: Record<string, unknown>,
  manifest: AggregateManifest,
  dependencies: DependencyEntries,
): string[] {
  const problems: string[] = []
  if (pkg.name !== manifest.name) {
    problems.push(
      `name: expected ${JSON.stringify(manifest.name)}, found ${JSON.stringify(pkg.name)}`,
    )
  }

  const actual = getField(getField(pkg.dsh, 'aggregate'), 'plugins')
  const declared = pkg.dependencies ?? {}
  if (!isRecord(declared)) {
    problems.push('dependencies: expected a mapping')
  } else {
    for (const [name, spec] of dependencies) {
      if (declared[name] !== spec) {
        problems.push(
          `dependencies.${name}: expected ${JSON.stringify(spec)}, ` +
            `found ${JSON.stringify(declared[name])}`,
        )
      }
    }
    for (const name of Array.isArray(actual) ? actual : []) {
      if (!manifest.plugins.some(plugin => plugin.name === name) && declared[String(name)] !== undefined) {
        problems.push(`dependencies.${name}: stale dependency for a plugin removed from aggregate.yml`)
      }
    }
  }

  const patch = getField(getField(pkg.dsh, 'bundle'), 'patch')
  if (patch !== manifest.patch) {
    problems.push(
      `dsh.bundle.patch: expected ${JSON.stringify(manifest.patch)}, ` +
        `found ${JSON.stringify(patch)}`,
    )
  }

  const names = manifest.plugins.map(plugin => plugin.name)
  if (!Array.isArray(actual) || actual.join('\0') !== names.join('\0')) {
    problems.push(
      `dsh.aggregate.plugins: expected ${JSON.stringify(names)}, ` +
        `found ${JSON.stringify(actual)}`,
    )
  }
  return problems
}

function newPackageJson(manifest: AggregateManifest): Record<string, unknown> {
  const pkg: Record<string, unknown> = {
    name: manifest.name,
    version: manifest.version,
    private: manifest.private,
  }
  if (manifest.description !== undefined) pkg.description = manifest.description
  if (manifest.license !== undefined) pkg.license = manifest.license
  if (manifest.keywords !== undefined) pkg.keywords = manifest.keywords
  pkg.type = 'module'
  if (manifest.engines !== undefined) pkg.engines = manifest.engines
  pkg.dependencies = {}
  return pkg
}
