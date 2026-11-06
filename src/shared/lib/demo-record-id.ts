/** Demo record IDs remain usable on plain HTTP LAN origins, where randomUUID is unavailable. */
export function createDemoRecordId(prefix: string): string {
  if (typeof crypto.randomUUID === 'function') return prefix + crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return prefix + suffix
}
