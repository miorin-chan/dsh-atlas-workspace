import { relative } from 'node:path'

/** Shortest stable path for messages: relative inside the aggregate, absolute outside it. */
export function displayPath(path: string, base: string): string {
  const rel = relative(base, path)
  return rel === '' ? '.' : rel.startsWith('..') ? path : rel
}
