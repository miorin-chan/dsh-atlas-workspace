import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { bundleAggregate } from './bundle.mts'
import { isMissingFile } from './lib/errors.mts'

const output = fileURLToPath(new URL('../dsh-aggregate.mjs', import.meta.url))
const expected = await bundleAggregate()
let current
try {
  current = await readFile(output, 'utf8')
} catch (error) {
  if (!isMissingFile(error)) throw error
}

if (current !== expected) {
  if (process.argv.includes('--check')) {
    console.error('scripts/dsh-aggregate.mjs is missing or stale. Run npm run build.')
    process.exitCode = 1
  } else {
    const temporary = `${output}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, expected)
      await rename(temporary, output)
    } catch (error) {
      await rm(temporary, { force: true })
      throw error
    }
  }
}
