/** Show the first differing line of two files, with a little shared context. */
export function firstDifference(actual: string, expected: string): string {
  const actualLines = actual.split('\n')
  const expectedLines = expected.split('\n')
  const limit = Math.max(actualLines.length, expectedLines.length)

  let index = 0
  while (index < limit && actualLines[index] === expectedLines[index]) index += 1
  if (index === limit) return ''

  const start = Math.max(0, index - 2)
  const lines = []
  for (let i = start; i < index; i += 1) lines.push(`  ${actualLines[i]}`)
  if (index < actualLines.length) lines.push(`- ${actualLines[index]}`)
  if (index < expectedLines.length) lines.push(`+ ${expectedLines[index]}`)
  return `line ${index + 1}:\n${lines.join('\n')}`
}
