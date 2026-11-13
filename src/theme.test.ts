import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_PREFERENCE, THEME_PREFERENCES, THEME_PREFERENCE_LABELS,
  isThemePreference, nextThemePreference, resolveTheme,
} from './theme'

describe('theme preference', () => {
  it('follows the OS only for the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('validates stored values', () => {
    for (const p of THEME_PREFERENCES) expect(isThemePreference(p)).toBe(true)
    expect(isThemePreference('solarized')).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
    expect(isThemePreference(1)).toBe(false)
  })

  it('cycles through every preference and back', () => {
    let p = DEFAULT_THEME_PREFERENCE
    const seen = new Set([p])
    for (let i = 0; i < THEME_PREFERENCES.length - 1; i++) {
      p = nextThemePreference(p)
      seen.add(p)
    }
    expect(seen.size).toBe(THEME_PREFERENCES.length)
    expect(nextThemePreference(p)).toBe(DEFAULT_THEME_PREFERENCE)
  })

  it('has a label for every preference', () => {
    expect(Object.keys(THEME_PREFERENCE_LABELS).sort()).toEqual([...THEME_PREFERENCES].sort())
  })
})
