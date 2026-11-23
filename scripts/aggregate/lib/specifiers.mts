import { AggregateError } from './errors.mts'

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const EXACT_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?$/i
const PATH_PREFIX = /^(?:\.{1,2}[\\/]|[\\/]|~[\\/]|[a-zA-Z]:[\\/])/
const PROTOCOL_PREFIX = /^(?:file|link|portal|workspace|npm|git|https?):/

export function isExactVersion(spec: string): boolean {
  return EXACT_VERSION.test(spec)
}

/** The package part of a row name: `pkg`, `@scope/pkg`, or a subpath of either. */
export function packageNameOf(specifier: unknown): string {
  if (typeof specifier !== 'string') return ''
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

export function assertPackageName(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !PACKAGE_NAME.test(value)) {
    throw new AggregateError(`${label} must be a bare package name, got ${JSON.stringify(value)}`)
  }
}

/** True for a row `name` that names a directory or a package-manager protocol. */
export function isPathLikeRowName(name: string): boolean {
  return (
    PATH_PREFIX.test(name) ||
    name.includes('\\') ||
    PROTOCOL_PREFIX.test(name) ||
    name.split('/').some(segment => segment === '' || segment === '.' || segment === '..')
  )
}

/** Rows must resolve through a declared package, never through a relative path. */
export function assertRowName(name: unknown, pluginName: string, label: string): void {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new AggregateError(`${label}: row "name" must be a non-empty string`)
  }
  if (isPathLikeRowName(name)) {
    throw new AggregateError(
      `${label}: row name ${JSON.stringify(name)} is a filesystem path; ` +
        `aggregate rows must use the package name ${JSON.stringify(pluginName)}`,
    )
  }
  const owner = packageNameOf(name)
  if (owner !== pluginName) {
    throw new AggregateError(
      `${label}: row name ${JSON.stringify(name)} belongs to ${JSON.stringify(owner)}, ` +
        `not the declared plugin ${JSON.stringify(pluginName)}`,
    )
  }
}
