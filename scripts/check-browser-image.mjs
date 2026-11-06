import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function checkBrowserImage(packageJson, workflow) {
  const version = packageJson.devDependencies?.['@playwright/test']
  const images = [...workflow.matchAll(/^\s+image:\s*(\S+)\s*$/gm)].map((match) => match[1])
  const expected = `mcr.microsoft.com/playwright:v${version}-noble@sha256:`
  if (
    !/^\d+\.\d+\.\d+$/.test(version ?? '') ||
    images.length !== 1 ||
    !images[0].startsWith(expected) ||
    !/^[a-f0-9]{64}$/.test(images[0].slice(expected.length))
  ) {
    return [
      'Browser CI must use one digest-pinned Playwright noble image matching the exact @playwright/test package version.',
    ]
  }
  return []
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [packageJson, workflow] = await Promise.all([
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('.github/workflows/ci.yml', 'utf8'),
  ])
  const issues = checkBrowserImage(packageJson, workflow)
  for (const issue of issues) console.error(issue)
  if (issues.length) process.exitCode = 1
  else console.log('Browser image matches the locked Playwright version and uses a fixed digest.')
}
