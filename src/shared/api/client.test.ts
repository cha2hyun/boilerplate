import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, createApiClient } from './client'

const schema = z.object({ id: z.string(), count: z.number().nonnegative() })
const request = createApiClient('/api/')

function pendingResponse(signal?: AbortSignal | null): Promise<Response> {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => {
      const reason: unknown = signal.reason
      reject(
        reason instanceof Error || reason instanceof DOMException
          ? reason
          : new DOMException('Request aborted.', 'AbortError'),
      )
    })
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('HTTP client', () => {
  it('sends JSON with cancellation support and validates its response', async () => {
    const controller = new AbortController()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: 'project-1', count: 2 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      request('/projects', schema, {
        method: 'POST',
        body: { name: 'Website' },
        signal: controller.signal,
      }),
    ).resolves.toEqual({ id: 'project-1', count: 2 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Website' }),
      }),
    )
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('rejects a successful HTTP response with an invalid payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 123, count: -1 })))
    await expect(request('/projects', schema)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INVALID_RESPONSE',
      status: 200,
    })
  })

  it('rejects malformed JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Oops</html>')))
    await expect(request('/projects', schema)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it.each([401, 403, 404, 500])(
    'preserves an HTTP %s error independently of body format',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('Internal details', { status })),
      )
      await expect(request('/projects', schema)).rejects.toMatchObject({
        name: 'ApiError',
        code: 'HTTP_ERROR',
        status,
      })
    },
  )

  it('supports a bodyless 204 deletion response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(request('/projects/id', z.null(), { method: 'DELETE' })).resolves.toBeNull()
  })

  it('normalizes a transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(request('/projects', schema)).rejects.toBeInstanceOf(ApiError)
    await expect(request('/projects', schema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: null,
    })
  })

  it('preserves cancellation rather than reporting a network failure', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(controller.signal.reason))
    await expect(request('/projects', schema, { signal: controller.signal })).rejects.toBe(
      controller.signal.reason,
    )
  })

  it('times out stalled response headers and warns that a mutation may have completed', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) => pendingResponse(options?.signal)),
    )

    const pending = request('/projects', schema, { method: 'POST', body: { name: 'Website' } })
    const rejected = expect(pending).rejects.toMatchObject({
      code: 'TIMEOUT',
      status: null,
    })
    await vi.advanceTimersByTimeAsync(15_000)
    await rejected
    await expect(pending).rejects.toThrow('may have been saved')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the deadline active while reading a stalled response body', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) => {
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"id":'))
            options?.signal?.addEventListener('abort', () => {
              controller.error(options.signal?.reason)
            })
          },
        })
        return Promise.resolve(new Response(body, { status: 200 }))
      }),
    )

    const pending = request('/projects', schema)
    const rejected = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT', status: 200 })
    await vi.advanceTimersByTimeAsync(15_000)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })

  it('forwards in-flight caller cancellation and clears the deadline', async () => {
    vi.useFakeTimers()
    const caller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) => pendingResponse(options?.signal)),
    )

    const pending = request('/projects', schema, { signal: caller.signal })
    const reason = new DOMException('Navigation cancelled the request.', 'AbortError')
    const rejected = expect(pending).rejects.toBe(reason)
    caller.abort(reason)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })
})
