#!/usr/bin/env node
/**
 * dsh-aggregate — generate, or check, an aggregate DSH bundle.
 *
 * The aggregate package stays a thin distribution layer: this tool reads its
 * `aggregate.yml`, resolves each declared plugin bundle, copies the plugin's
 * own insert rows into `cordis.patch.yml`, and writes the matching
 * `package.json` dependencies. It never installs packages or touches a DSH
 * profile.
 *
 * Usage:
 *   node tools/dsh-aggregate/src/cli.mts generate [dir] [--manifest <path>]
 *   node tools/dsh-aggregate/src/cli.mts check [dir] [--manifest <path>]
 *   node tools/dsh-aggregate/src/cli.mts verify-release [dir] [--manifest <path>]
 *
 * `generate` writes `package.json` and the patch. `check` detects drift.
 * `verify-release` checks the installed dependency tree and declared pins
 * for publishing.
 */
import { resolve, join } from 'node:path'
import { AggregateError } from './lib/errors.mts'
import { displayPath } from './lib/paths.mts'
import { check, generate, verifyRelease } from './lib/run.mts'

const USAGE = [
  'Usage:',
  '  dsh-aggregate generate [dir] [--manifest <path>]',
  '  dsh-aggregate check [dir] [--manifest <path>]',
  '  dsh-aggregate verify-release [dir] [--manifest <path>]',
  '',
  'Options:',
  '  --manifest <path>  Manifest file (default: <dir>/aggregate.yml)',
  '  --help',
].join('\n')

interface CliOptions {
  positional: string[]
  manifest?: string
  help: boolean
}

async function main(argv: string[]): Promise<void> {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    console.log(USAGE)
    return
  }

  const command = argv[0]
  if (command !== 'generate' && command !== 'check' && command !== 'verify-release') {
    throw new AggregateError(`unknown command ${JSON.stringify(command)}\n${USAGE}`)
  }

  const options = parseArgs(argv.slice(1))
  if (options.help) {
    console.log(USAGE)
    return
  }
  if (options.positional.length > 1) {
    throw new AggregateError(`expected one aggregate directory, got ${options.positional.length}`)
  }

  const dir = resolve(options.positional[0] ?? '.')
  const manifestPath = options.manifest
    ? resolve(options.manifest)
    : join(dir, 'aggregate.yml')

  if (command === 'generate') {
    const result = await generate(manifestPath)
    console.log(`${result.manifest.plugins.length} plugins, ${result.plan.rows.length} rows`)
    console.log(`generated ${displayPath(result.packagePath, process.cwd())} and ${displayPath(result.patchPath, process.cwd())}`)
    return
  }
  if (command === 'verify-release') {
    const plan = await verifyRelease(manifestPath)
    console.log(`ok: ${plan.plugins.length} published member versions match their registry pins`)
    return
  }

  const result = await check(manifestPath)
  console.log(
    `ok: ${result.manifest.plugins.length} plugins, ${result.plan.rows.length} rows; ` +
      'package.json and cordis.patch.yml are current',
  )
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { positional: [], help: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--manifest') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('-')) {
        throw new AggregateError('--manifest requires a path')
      }
      options.manifest = value
      index += 1
      continue
    }
    if (arg.startsWith('--manifest=')) {
      options.manifest = arg.slice('--manifest='.length)
      if (options.manifest === '') throw new AggregateError('--manifest requires a path')
      continue
    }
    if (arg.startsWith('-')) throw new AggregateError(`unknown option ${JSON.stringify(arg)}`)
    options.positional.push(arg)
  }
  return options
}

main(process.argv.slice(2)).catch(error => {
  if (error instanceof AggregateError) {
    console.error(`error: ${error.message}`)
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
