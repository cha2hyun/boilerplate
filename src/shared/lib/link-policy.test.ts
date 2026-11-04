import { describe, expect, it } from 'vitest'
import { resolveLinkPolicy } from './link-policy'

const baseUrl = 'https://app.example/workspace/current?tab=overview'

describe('text link navigation policy', () => {
  it.each([
    ['/projects', 'https://app.example/projects'],
    ['../projects?status=open#details', 'https://app.example/projects?status=open#details'],
    ['#details', `${baseUrl}#details`],
    [' https://APP.example:443/projects ', 'https://app.example/projects'],
    ['//app.example/projects', 'https://app.example/projects'],
  ])('keeps same-origin destination %s in the current tab', (href, expectedHref) => {
    const policy = resolveLinkPolicy(href, { baseUrl })

    expect(policy.href).toBe(expectedHref)
    expect(policy.target).not.toBe('_blank')
    expect(policy.opensNewTab).toBe(false)
  })

  it.each([
    'https://other.example/projects',
    '//other.example/projects',
    'http://app.example/projects',
    'https://app.example:8443/projects',
    'https://sub.app.example/projects',
    'https://app.example.evil.test/projects',
  ])('forces a new tab for another origin despite an explicit _self: %s', (href) => {
    const policy = resolveLinkPolicy(href, {
      baseUrl,
      target: '_self',
      rel: 'nofollow OPENER sponsored',
    })
    const rel = policy.rel?.toLowerCase().split(/\s+/)

    expect(policy.target).toBe('_blank')
    expect(policy.opensNewTab).toBe(true)
    expect(rel).toEqual(expect.arrayContaining(['nofollow', 'sponsored', 'noopener', 'noreferrer']))
    expect(rel).not.toContain('opener')
  })

  it('honors an explicit new tab for an internal destination and preserves additional rel tokens', () => {
    const policy = resolveLinkPolicy('/projects', {
      baseUrl,
      target: '_blank',
      rel: 'help',
    })

    expect(policy.href).toBe('https://app.example/projects')
    expect(policy.target).toBe('_blank')
    expect(policy.opensNewTab).toBe(true)
    expect(policy.rel?.split(/\s+/)).toEqual(
      expect.arrayContaining(['help', 'noopener', 'noreferrer']),
    )
  })

  it.each([
    undefined,
    '',
    '   ',
    'javascript:alert(1)',
    ' \tJaVa\nScRiPt:alert(1) ',
    'data:text/html,example',
    'file:///etc/passwd',
    'mailto:person@example.com',
    'https://person:secret@app.example/projects',
    'https://[',
  ])('does not expose an actionable destination for unsupported URL %s', (href) => {
    expect(resolveLinkPolicy(href, { baseUrl, target: '_blank', rel: 'opener' })).toEqual({
      href: undefined,
      target: undefined,
      rel: undefined,
      opensNewTab: false,
    })
  })
})
