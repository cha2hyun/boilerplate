import { expect, it } from 'vitest'
import { avatarUrlSchema } from './avatar-url'

it('retains usable local assets and HTTPS avatar URLs', () => {
  for (const value of ['/avatars/soohyun-chae.svg', 'https://images.example.com/profile.jpg?v=1']) {
    expect(avatarUrlSchema.parse(` ${value} `)).toBe(value)
  }
})

it('treats missing or invalid optional photos as unavailable', () => {
  for (const value of [
    undefined,
    null,
    '',
    {},
    'photo.png',
    '//external.example/avatar',
    '/\\external.example/avatar',
    'https://',
    'https://user:password@example.com/photo',
    'http://images.example.com/photo',
    'data:image/svg+xml,...',
    'javascript:alert(1)',
  ]) {
    expect(avatarUrlSchema.parse(value)).toBeUndefined()
  }
})
