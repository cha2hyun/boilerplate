import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('runtime configuration', () => {
  it('defaults to a self-contained demo', () => {
    expect(parseEnv({})).toEqual({ dataSource: 'demo', apiBaseUrl: '/api' })
  })

  it('accepts an explicit HTTP backend and normalizes its trailing slash', () => {
    expect(
      parseEnv({ VITE_DATA_SOURCE: 'api', VITE_API_BASE_URL: '  https://api.example.com/v1/  ' }),
    ).toEqual({ dataSource: 'api', apiBaseUrl: 'https://api.example.com/v1' })
  })

  it.each(['prod', '', 'local'])('rejects the unsupported data source %j', (value) => {
    expect(() => parseEnv({ VITE_DATA_SOURCE: value })).toThrow('VITE_DATA_SOURCE')
  })

  it.each(['api', '//example.com', 'javascript:alert(1)', 'https://', '/api?token=secret'])(
    'rejects the invalid API URL %j',
    (value) => {
      expect(() => parseEnv({ VITE_API_BASE_URL: value })).toThrow('VITE_API_BASE_URL')
    },
  )

  it.each([
    '/\\example.com/api',
    'https:api.example.com/v1',
    'https:/api.example.com/v1',
    'https://api.example.com/v1?',
    'https://api.example.com/v1#',
    'https://api.exa\nmple.com/v1',
  ])('rejects ambiguous API destinations %j', (value) => {
    expect(() => parseEnv({ VITE_API_BASE_URL: value })).toThrow('VITE_API_BASE_URL')
  })

  it.each([
    ['/api', 'https://app.example.com/api/projects'],
    ['/', 'https://app.example.com/projects'],
    ['https://api.example.com/v1/', 'https://api.example.com/v1/projects'],
  ])('keeps accepted API destination %j when resolving a request', (value, destination) => {
    const { apiBaseUrl } = parseEnv({ VITE_API_BASE_URL: value })
    expect(new URL(`${apiBaseUrl}/projects`, 'https://app.example.com/projects').href).toBe(
      destination,
    )
  })
})
