const settingsKey = 'tanstack_devtools_settings'

/** Move the previous fixed default without resetting the developer's other panel settings. */
export function migrateDevtoolsPosition() {
  try {
    const stored = localStorage.getItem(settingsKey)
    if (!stored) return
    const settings: unknown = JSON.parse(stored)
    if (
      typeof settings !== 'object' ||
      settings === null ||
      !('position' in settings) ||
      settings.position !== 'middle-right' ||
      !('triggerMode' in settings) ||
      settings.triggerMode !== 'fixed'
    ) {
      return
    }
    localStorage.setItem(settingsKey, JSON.stringify({ ...settings, position: 'bottom-right' }))
  } catch {
    // Unavailable storage or malformed developer preferences must not break the app.
  }
}
