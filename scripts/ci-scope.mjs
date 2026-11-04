import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDocuments = new Set([
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'THIRD_PARTY_NOTICES.md',
])
const shaPattern = /^[a-f0-9]{40}$/i

/** Only known documentation paths can skip the expensive jobs. New paths fail closed. */
export function requiresFullCI(files) {
  return (
    !files?.length ||
    files.some(
      (file) => !rootDocuments.has(file) && !(file.startsWith('docs/') && file.endsWith('.md')),
    )
  )
}

export function changedFiles(eventName, event, cwd = process.cwd()) {
  if (eventName === 'workflow_dispatch') return null
  const base = eventName === 'pull_request' ? event.pull_request?.base?.sha : event.before
  const head = eventName === 'pull_request' ? event.pull_request?.head?.sha : event.after
  if (
    !['pull_request', 'push'].includes(eventName) ||
    !shaPattern.test(base ?? '') ||
    !shaPattern.test(head ?? '') ||
    /^0+$/.test(base)
  ) {
    return null
  }
  try {
    const revisions = eventName === 'pull_request' ? [`${base}...${head}`] : [base, head]
    // Disabling rename detection includes both old and new paths; a source-to-doc rename
    // must still run code checks. NUL separation preserves whitespace in filenames.
    return execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', ...revisions, '--'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\0')
      .filter(Boolean)
  } catch {
    // Missing history must never be mistaken for a documentation-only change.
    return null
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const files = changedFiles(process.env.GITHUB_EVENT_NAME, event)
  const full = requiresFullCI(files)
  appendFileSync(process.env.GITHUB_OUTPUT, `full=${full}\n`)
  console.log(full ? 'Code or unknown scope: run full CI.' : 'Documentation only: run CI Gate.')
}
