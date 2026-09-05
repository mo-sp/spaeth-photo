import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  THEMES,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  parseTheme,
} from '../theme.ts'

describe('parseTheme', () => {
  it('accepts the two themes', () => {
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('light')).toBe('light')
  })

  it('rejects anything else', () => {
    for (const value of ['', 'DARK', 'sepia', null, undefined, 1, {}]) {
      expect(parseTheme(value)).toBeNull()
    }
  })

  it('covers every theme in the list', () => {
    for (const theme of THEMES) expect(parseTheme(theme)).toBe(theme)
    expect(THEMES).toContain(DEFAULT_THEME)
  })
})

describe('THEME_INIT_SCRIPT', () => {
  it('reads the same storage key the composable writes', () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY))
  })

  // It is inlined into <head> as an IIFE; a stray `</script>` or a line break
  // would end the tag or the statement early.
  it('is a single-line, self-contained expression', () => {
    expect(THEME_INIT_SCRIPT).not.toContain('\n')
    expect(THEME_INIT_SCRIPT.toLowerCase()).not.toContain('</script')
    expect(THEME_INIT_SCRIPT.startsWith('(function()')).toBe(true)
  })

  it('shows the intro only on the home page, and only without a stored choice', () => {
    expect(THEME_INIT_SCRIPT).toContain("d.dataset.page==='home'")
    expect(THEME_INIT_SCRIPT).toContain("d.dataset.intro='pending'")
  })
})
