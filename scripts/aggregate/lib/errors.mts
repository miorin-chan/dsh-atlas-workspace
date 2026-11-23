/** A validation or drift failure that the CLI can report without a stack trace. */
export class AggregateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AggregateError'
  }
}

export function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
