function abortError(signal?: AbortSignal): Error {
  const reason: unknown = signal?.reason
  return reason instanceof Error
    ? reason
    : new DOMException('The request was aborted.', 'AbortError')
}

/** Simulates network latency without leaving cancelled queries running. */
export function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)

    function onAbort() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(abortError(signal))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
