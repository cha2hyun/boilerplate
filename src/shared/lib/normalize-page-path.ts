export function normalizePagePath(pathname: string): string {
  const [path = ''] = pathname.split(/[?#]/, 1)
  const normalized = path.replace(/\/+$/, '')
  return normalized.length === 0 ? '/' : normalized
}
