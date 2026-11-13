// Theme preference shared by both apps. The colors themselves live in
// `styles/tokens.css`; this module only decides which set applies.

import { isOneOf } from './vocab'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
/** What the user picked. 'system' follows the OS color scheme. */
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
/** The theme actually shown; the value of `<html data-theme>`. */
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'Follow system',
  light: 'Light',
  dark: 'Dark',
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return isOneOf(THEME_PREFERENCES, value)
}

/** The theme to show for a preference, given whether the OS prefers dark. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/** The preference after `current` in the system → light → dark cycle. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const i = THEME_PREFERENCES.indexOf(current)
  return THEME_PREFERENCES[(i + 1) % THEME_PREFERENCES.length] ?? DEFAULT_THEME_PREFERENCE
}
