import { beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateDevtoolsPosition } from './devtools-settings'

const settingsKey = 'tanstack_devtools_settings'

beforeEach(() => {
  localStorage.clear()
})

describe('devtools position migration', () => {
  it('moves the previous fixed default while preserving panel and application preferences', () => {
    const settings = {
      position: 'middle-right',
      triggerMode: 'fixed',
      theme: 'light',
      panelLocation: 'top',
      openHotkey: ['Alt', 'm'],
    }
    localStorage.setItem(settingsKey, JSON.stringify(settings))
    localStorage.setItem('tanstack_devtools_state', '{"height":420}')
    localStorage.setItem('blueprint-theme', 'dark')

    migrateDevtoolsPosition()

    expect(JSON.parse(localStorage.getItem(settingsKey) ?? 'null')).toEqual({
      ...settings,
      position: 'bottom-right',
    })
    expect(localStorage.getItem('tanstack_devtools_state')).toBe('{"height":420}')
    expect(localStorage.getItem('blueprint-theme')).toBe('dark')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    migrateDevtoolsPosition()
    expect(write).not.toHaveBeenCalled()
  })

  it('preserves explicitly different positions and floating placement', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem')
    for (const settings of [
      { position: 'top-left', triggerMode: 'fixed' },
      { position: 'bottom-right', triggerMode: 'fixed' },
      { position: 'middle-right', triggerMode: 'floating', triggerCoords: { x: 25, y: 40 } },
    ]) {
      const saved = JSON.stringify(settings)
      localStorage.setItem(settingsKey, saved)
      write.mockClear()
      migrateDevtoolsPosition()
      expect(write).not.toHaveBeenCalled()
      expect(localStorage.getItem(settingsKey)).toBe(saved)
    }
  })

  it('leaves missing, malformed, or unfamiliar settings untouched', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem')
    migrateDevtoolsPosition()
    expect(write).not.toHaveBeenCalled()
    for (const saved of ['{broken', 'null', '[]', '"fixed"', '{"position":"middle-right"}']) {
      localStorage.setItem(settingsKey, saved)
      write.mockClear()
      expect(() => {
        migrateDevtoolsPosition()
      }).not.toThrow()
      expect(write).not.toHaveBeenCalled()
      expect(localStorage.getItem(settingsKey)).toBe(saved)
    }
  })

  it('does not interrupt initialization when storage access is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })
    expect(() => {
      migrateDevtoolsPosition()
    }).not.toThrow()
  })

  it('preserves saved settings when a migration write is denied', () => {
    const saved = '{"position":"middle-right","triggerMode":"fixed","theme":"light"}'
    localStorage.setItem(settingsKey, saved)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    expect(() => {
      migrateDevtoolsPosition()
    }).not.toThrow()
    expect(localStorage.getItem(settingsKey)).toBe(saved)
  })
})
