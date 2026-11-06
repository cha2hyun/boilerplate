import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfileAvatar } from './profile-avatar'

function trackImages() {
  const requests: HTMLImageElement[] = []
  vi.spyOn(window, 'Image').mockImplementation(function () {
    const image = document.createElement('img')
    Object.defineProperty(image, 'complete', { get: () => image.naturalWidth > 0 })
    requests.push(image)
    return image
  })
  return requests
}

function imageRequest(requests: HTMLImageElement[], src: string) {
  const image = requests.find((request) => request.getAttribute('src') === src)
  if (!image) throw new Error(`Expected an image request for ${src}`)
  return image
}

function finish(request: HTMLImageElement) {
  Object.defineProperty(request, 'naturalWidth', { value: 64 })
  act(() => {
    request.dispatchEvent(new Event('load'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('profile avatar', () => {
  it('shows an inline skeleton until the current image loads, independent of stale completions', () => {
    const requests = trackImages()
    const name = 'soohyun chae'
    const { container, rerender } = render(<ProfileAvatar name={name} src="/old.svg" />)
    const old = imageRequest(requests, '/old.svg')
    expect(container.querySelector('[data-slot="skeleton"]')?.tagName).toBe('SPAN')
    expect(container).not.toHaveTextContent('SC')
    rerender(<ProfileAvatar name={name} src="/new.svg" />)
    const current = imageRequest(requests, '/new.svg')
    expect(current).not.toBe(old)
    finish(old)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    finish(current)
    const displayed = container.querySelector('img')
    if (!displayed) throw new Error('The loaded photo must be visible')
    expect(displayed).toHaveAttribute('src', '/new.svg')
    expect(displayed).toHaveAttribute('alt', '')
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    // The displayed resource can also fail after a successful preload.
    fireEvent.error(displayed)
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('SC')
    expect(container.querySelector('img')).toBeNull()
  })

  it('finishes an errored preload and immediately uses initials for missing URLs', () => {
    const requests = trackImages()
    const { container, rerender } = render(<ProfileAvatar name="soohyun chae" pending />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    rerender(<ProfileAvatar name="soohyun chae" src="   " />)
    expect(requests).toHaveLength(0)
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('SC')
    rerender(<ProfileAvatar name="soohyun chae" initials="SH" src="/missing.svg" />)
    act(() => {
      imageRequest(requests, '/missing.svg').dispatchEvent(new Event('error'))
    })
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('SH')
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    rerender(<ProfileAvatar name="" />)
    expect(container.querySelector('[data-slot="avatar-fallback"] svg')).toBeInTheDocument()
  })
})
