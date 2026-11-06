export function createPageErrorTracker() {
  const allowed: { message: string | RegExp; remaining: number }[] = []
  const unexpected: string[] = []
  return {
    unexpected,
    // A recovery test may allow only its injected failure, with a bounded occurrence count.
    allow(message: string | RegExp, maxOccurrences = 1) {
      if (!Number.isInteger(maxOccurrences) || maxOccurrences < 1) {
        throw new Error('Expected page errors need a positive occurrence limit.')
      }
      allowed.push({ message, remaining: maxOccurrences })
    },
    record(error: Error) {
      const expectation = allowed.find(({ message, remaining }) => {
        if (remaining === 0) return false
        if (typeof message === 'string') return error.message === message
        message.lastIndex = 0
        return message.test(error.message)
      })
      if (expectation) expectation.remaining -= 1
      else unexpected.push(error.message)
    },
  }
}
