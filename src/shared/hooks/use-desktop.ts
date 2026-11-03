import { useSyncExternalStore } from 'react'

const DESKTOP_QUERY = '(min-width: 1280px)'
function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}
function snapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches
}
function serverSnapshot() {
  return false
}

/** Mobile uses Sidebar's drawer; tablets start compact, desktops start expanded. */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
