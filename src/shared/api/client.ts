import type { z } from 'zod'
import { env } from '@/shared/config'

export type ApiErrorCode = 'HTTP_ERROR' | 'INVALID_RESPONSE' | 'NETWORK_ERROR' | 'TIMEOUT'

const REQUEST_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly mayHaveSucceeded: boolean

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number | null = null,
    mayHaveSucceeded = false,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.mayHaveSucceeded = mayHaveSucceeded
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

/** The HTTP boundary: bounded requests, cancellation and runtime response validation. */
export function createApiClient(baseUrl: string) {
  return async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const { body, ...requestOptions } = options
    const readOnly = ['GET', 'HEAD'].includes(options.method?.toUpperCase() ?? 'GET')
    const uncertainWriteMessage =
      'Your changes may have been saved. Refresh to check before trying again.'
    const serializedBody = body !== undefined ? JSON.stringify(body) : undefined
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    if (body !== undefined) headers.set('Content-Type', 'application/json')

    const controller = new AbortController()
    const cancel = () => {
      controller.abort(options.signal?.reason)
    }
    if (options.signal?.aborted) cancel()
    else options.signal?.addEventListener('abort', cancel, { once: true })

    let status: number | null = null
    const timeoutReason = new DOMException('The request timed out.', 'TimeoutError')
    const timeout = setTimeout(() => {
      controller.abort(timeoutReason)
    }, REQUEST_TIMEOUT_MS)

    try {
      let response: Response
      try {
        response = await fetch(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
          ...requestOptions,
          headers,
          signal: controller.signal,
          ...(serializedBody !== undefined ? { body: serializedBody } : {}),
        })
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw error
        }
        throw new ApiError(
          readOnly
            ? 'Unable to connect. Check your connection and try again.'
            : `Unable to confirm the request result. ${uncertainWriteMessage}`,
          'NETWORK_ERROR',
          null,
          !readOnly,
        )
      }

      status = response.status
      if (!response.ok) {
        // A server or gateway failure does not prove that a write was rolled back.
        // Preserve the HTTP status while sending uncertain writes through reconciliation.
        const mayHaveSucceeded = !readOnly && response.status >= 500
        throw new ApiError(
          mayHaveSucceeded
            ? `Unable to confirm the request result (${String(response.status)}). ${uncertainWriteMessage}`
            : response.status === 404
              ? 'This item could not be found. Refresh and try again.'
              : `The request failed (${String(response.status)}). Please try again.`,
          'HTTP_ERROR',
          response.status,
          mayHaveSucceeded,
        )
      }

      let payload: unknown
      try {
        payload = response.status === 204 ? null : await response.json()
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw error
        }
        throw new ApiError(
          readOnly
            ? 'The server returned an unreadable response.'
            : `The server returned an unreadable response. ${uncertainWriteMessage}`,
          'INVALID_RESPONSE',
          response.status,
          !readOnly,
        )
      }

      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        throw new ApiError(
          readOnly
            ? 'The server returned an unexpected response.'
            : `The server returned an unexpected response. ${uncertainWriteMessage}`,
          'INVALID_RESPONSE',
          response.status,
          !readOnly,
        )
      }

      return parsed.data
    } catch (error) {
      if (controller.signal.reason === timeoutReason) {
        throw new ApiError(
          readOnly
            ? 'The request timed out. Please try again.'
            : 'The request timed out. Your changes may have been saved. Refresh to check before trying again.',
          'TIMEOUT',
          status,
          !readOnly,
        )
      }
      throw error
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', cancel)
    }
  }
}

export const apiClient = createApiClient(env.apiBaseUrl)
