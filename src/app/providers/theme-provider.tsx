import { storageKeys } from '@/shared/config/product'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { ThemeContext, type ResolvedTheme, type Theme } from '@/shared/lib/theme'

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' || value === 'system' ? value : fallback
  } catch {
    return fallback
  }
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light'
}

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia(SYSTEM_THEME_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

function serverTheme(): ResolvedTheme {
  return 'light'
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/** shadcn's Vite recipe, with validated storage and a live system-theme subscription. */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = storageKeys.theme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() => readStoredTheme(storageKey, defaultTheme))
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, readSystemTheme, serverTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      try {
        localStorage.setItem(storageKey, nextTheme)
      } catch {
        // Private browsing/storage policies must not prevent an in-session theme change.
      }
    },
    [storageKey],
  )

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
