import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { isRecord } from './data.mts'
import { firstDifference } from './diff.mts'
import { AggregateError, isMissingFile } from './errors.mts'
import { loadManifest } from './manifest.mts'
import { buildPackageJson, validatePackageJson } from './package.mts'
import { displayPath } from './paths.mts'
import { buildPlan } from './plugins.mts'
import { renderPatch } from './render.mts'
import { isExactVersion } from './specifiers.mts'
import type { AggregateManifest, AggregatePlan } from './types.mts'

interface AggregateResult {
  manifest: AggregateManifest
  plan: AggregatePlan
  packagePath: string
  patchPath: string
}

/**
 * Write `package.json` and the bundle patch from `aggregate.yml`.
 *
 * The output paths are checked before writing: the patch must live inside the
 * aggregate package and must never overwrite a plugin's own patch.
 */
export async function generate(manifestPath: string): Promise<AggregateResult> {
  const manifest = await loadManifest(manifestPath)
  const plan = await buildPlan(manifest)
  const patch = renderPatch(plan.rows)
  const packagePath = join(manifest.dir, 'package.json')
  const patchPath = resolve(manifest.dir, manifest.patch)
  assertOutputs(manifest, plan, patchPath, packagePath)

  const existing = await readJson(packagePath, true)
  const next = buildPackageJson(manifest, plan.dependencies, existing)

  await writeIfChanged(packagePath, `${JSON.stringify(next, null, 2)}\n`)
  await writeIfChanged(patchPath, patch)

  return { manifest, plan, packagePath, patchPath }
}

/** Compare the checked-in outputs with what `generate` would write. */
export async function check(manifestPath: string): Promise<AggregateResult> {
  const manifest = await loadManifest(manifestPath)
  const plan = await buildPlan(manifest)
  const expectedPatch = renderPatch(plan.rows)
  const packagePath = join(manifest.dir, 'package.json')
  const patchPath = resolve(manifest.dir, manifest.patch)
  assertOutputs(manifest, plan, patchPath, packagePath)

  const problems: string[] = []
  let actualPatch
  try {
    actualPatch = await readFile(patchPath, 'utf8')
  } catch (error) {
    if (!isMissingFile(error)) throw error
    problems.push(`missing patch: ${displayPath(patchPath, process.cwd())}`)
  }
  if (actualPatch !== undefined && actualPatch !== expectedPatch) {
    problems.push(
      `${displayPath(patchPath, process.cwd())} is out of date:\n${firstDifference(actualPatch, expectedPatch)}`,
    )
  }

  const pkg = await readJson(packagePath, true)
  if (pkg === undefined) {
    problems.push(`missing package.json: ${displayPath(packagePath, process.cwd())}`)
  } else {
    const packageProblems = validatePackageJson(pkg, manifest, plan.dependencies)
    if (packageProblems.length > 0) {
      problems.push(
        `${displayPath(packagePath, process.cwd())} is out of date:\n` +
          packageProblems.map(problem => `  - ${problem}`).join('\n'),
      )
    }
  }

  if (problems.length > 0) {
    throw new AggregateError(`${problems.join('\n')}\nrun generate to update the aggregate`)
  }
  return { manifest, plan, packagePath, patchPath }
}

/** Validate publication inputs before the lifecycle regenerates the patch. */
export async function verifyRelease(manifestPath: string): Promise<AggregatePlan> {
  const manifest = await loadManifest(manifestPath)
  for (const { name, spec } of manifest.plugins) {
    if (!isExactVersion(spec)) {
      throw new AggregateError(`plugin ${JSON.stringify(name)}: publishing requires an exact registry version, found ${JSON.stringify(spec)}`)
    }
  }

  const plan = await buildPlan(manifest)
  const nodeModules = await realpath(join(manifest.dir, 'node_modules'))
  for (const { name, dir } of plan.plugins) {
    if (!isInside(await realpath(dir), nodeModules)) {
      throw new AggregateError(
        `plugin ${JSON.stringify(name)}: publishing requires a registry install, not a local link; ` +
          'install the committed lockfile in a clean checkout',
      )
    }
  }

  const pkg = await readJson(join(manifest.dir, 'package.json'), false)
  const problems = validatePackageJson(pkg, manifest, plan.dependencies)
  if (problems.length > 0) {
    throw new AggregateError(
      ['package.json is out of date:', ...problems.map(problem => `  - ${problem}`),
        'run generate and update the lockfile before publishing'].join('\n'),
    )
  }
  return plan
}

async function writeIfChanged(path: string, value: string): Promise<void> {
  let current
  try {
    current = await readFile(path, 'utf8')
  } catch (error) {
    if (!isMissingFile(error)) throw error
  }
  if (current === value) return

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, value)
}

function assertOutputs(
  manifest: AggregateManifest,
  plan: AggregatePlan,
  patchPath: string,
  packagePath: string,
): void {
  for (const [label, path] of [
    ['patch', patchPath],
    ['package.json', packagePath],
  ]) {
    if (!isInside(path, manifest.dir)) {
      throw new AggregateError(`${label} path ${path} escapes the aggregate package ${manifest.dir}`)
    }
  }

  for (const plugin of plan.plugins) {
    if (isInside(patchPath, plugin.dir)) {
      throw new AggregateError(
        `patch path ${patchPath} is inside plugin ${plugin.name}; choose a patch path outside plugin directories`,
      )
    }
  }
}

function isInside(path: string, dir: string): boolean {
  return path === dir || path.startsWith(dir + sep)
}

async function readJson(path: string, allowMissing: false): Promise<Record<string, unknown>>
async function readJson(path: string, allowMissing: true): Promise<Record<string, unknown> | undefined>
async function readJson(path: string, allowMissing: boolean): Promise<Record<string, unknown> | undefined> {
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) {
      if (allowMissing) return undefined
      throw new AggregateError(`package.json not found: ${path}`)
    }
    throw error
  }

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AggregateError(`cannot parse ${path}: ${error.message}`)
    }
    throw error
  }
  if (!isRecord(value)) {
    throw new AggregateError(`${path} must contain a JSON object`)
  }
  return value
}
