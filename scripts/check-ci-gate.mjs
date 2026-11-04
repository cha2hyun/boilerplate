import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** A skipped dependency is valid only for a positively identified documentation-only run. */
export function checkCIGate(needs) {
  const issues = []
  if (needs?.changes?.result !== 'success') issues.push('Change classification did not succeed.')
  const full = needs?.changes?.outputs?.full
  if (!['true', 'false'].includes(full)) issues.push('Change scope is missing or invalid.')
  const expected = full === 'false' ? 'skipped' : 'success'
  for (const job of ['quality', 'browser']) {
    if (needs?.[job]?.result !== expected) {
      issues.push(`${job}: expected ${expected}, received ${needs?.[job]?.result ?? 'missing'}.`)
    }
  }
  return issues
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = checkCIGate(JSON.parse(process.env.CI_NEEDS ?? '{}'))
  if (issues.length) {
    for (const issue of issues) console.error(issue)
    process.exitCode = 1
  } else {
    console.log('CI Gate passed: all jobs required for this change succeeded.')
  }
}
