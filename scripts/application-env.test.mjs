import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { resolveConfig } from 'vite'
import { parseEnv } from '../src/shared/config/parse-env.ts'
import { applicationEnvPlugin } from './application-env.ts'

async function fixture(t, files = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'blueprint-env-'))
  const envDir = path.join(root, 'environments')
  const keys = ['VITE_DATA_SOURCE', 'VITE_API_BASE_URL', 'NODE_ENV', 'VITE_USER_NODE_ENV']
  const originalEnv = new Map(keys.map((key) => [key, process.env[key]]))
  for (const key of keys) delete process.env[key]
  t.after(async () => {
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await rm(root, { recursive: true, force: true })
  })
  await mkdir(envDir)
  // Loading the root instead of the selected envDir must fail these fixtures.
  await writeFile(path.join(root, '.env'), 'VITE_DATA_SOURCE=wrong-root\n')
  await Promise.all(
    Object.entries(files).map(([name, content]) => writeFile(path.join(envDir, name), content)),
  )

  return (command, options = {}) => {
    const defaultMode = command === 'build' ? 'production' : 'development'
    return resolveConfig(
      {
        configFile: false,
        root,
        envDir: 'environments',
        plugins: [applicationEnvPlugin()],
        ...options,
      },
      command,
      defaultMode,
      defaultMode,
    )
  }
}

for (const command of ['serve', 'build']) {
  test(`${command}: accepts an unconfigured self-contained demo`, async (t) => {
    const resolve = await fixture(t)
    const config = await resolve(command)
    assert.deepEqual(parseEnv(config.env), { dataSource: 'demo', apiBaseUrl: '/api' })
  })

  for (const [key, value] of [
    ['VITE_DATA_SOURCE', 'production'],
    ['VITE_API_BASE_URL', '//untrusted.example/api'],
  ]) {
    test(`${command}: rejects invalid ${key} during config resolution`, async (t) => {
      const resolve = await fixture(t, { '.env': `${key}=${value}\n` })
      await assert.rejects(resolve(command), new RegExp(`Invalid application environment.*${key}`))
    })
  }
}

test('validates the selected mode and envDir after local file overrides', async (t) => {
  const resolve = await fixture(t, {
    '.env': 'VITE_DATA_SOURCE=invalid-base\nVITE_API_BASE_URL=invalid-base\n',
    '.env.local': 'VITE_DATA_SOURCE=invalid-local\nVITE_API_BASE_URL=invalid-local\n',
    '.env.staging': 'VITE_DATA_SOURCE=api\nVITE_API_BASE_URL=invalid-mode\n',
    '.env.staging.local': 'VITE_API_BASE_URL=https://api.example.com/v1/\n',
    '.env.production': 'VITE_DATA_SOURCE=invalid-other-mode\n',
  })
  const config = await resolve('build', { mode: 'staging' })
  assert.equal(config.mode, 'staging')
  assert.deepEqual(parseEnv(config.env), {
    dataSource: 'api',
    apiBaseUrl: 'https://api.example.com/v1',
  })
})

test('valid process values override invalid mode files', async (t) => {
  const resolve = await fixture(t, {
    '.env.production.local': 'VITE_DATA_SOURCE=invalid\nVITE_API_BASE_URL=invalid\n',
  })
  process.env.VITE_DATA_SOURCE = 'api'
  process.env.VITE_API_BASE_URL = '/backend/'
  const config = await resolve('build')
  assert.deepEqual(parseEnv(config.env), { dataSource: 'api', apiBaseUrl: '/backend' })
})

test('rejects invalid process values even when the selected mode file is valid', async (t) => {
  const resolve = await fixture(t, {
    '.env.development': 'VITE_DATA_SOURCE=demo\nVITE_API_BASE_URL=/api\n',
  })
  process.env.VITE_API_BASE_URL = 'javascript:alert(1)'
  await assert.rejects(resolve('serve'), /Invalid application environment.*VITE_API_BASE_URL/)
})
