import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  INTRO_FAILSAFE_MS,
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

interface Timer {
  delay: number
  fire: () => void
}

interface Run {
  dataset: Record<string, string>
  timers: Timer[]
}

/**
 * Runs the head script the way the browser does — in its own context, against a
 * document, a storage and a `setTimeout` that are the only three globals it
 * touches. Reading the source for substrings would only prove that the source
 * says what it says.
 */
function runScript(options: { stored?: string; throws?: boolean; page?: string } = {}): Run {
  const dataset: Record<string, string> = {}
  if (options.page !== undefined) dataset.page = options.page
  const timers: Timer[] = []
  const sandbox = {
    document: { documentElement: { dataset } },
    localStorage: {
      getItem(key: string): string | null {
        // A private window does not return null here, it throws.
        if (options.throws === true) throw new Error('storage is disabled')
        return key === THEME_STORAGE_KEY ? (options.stored ?? null) : null
      },
    },
    setTimeout(fire: () => void, delay: number): number {
      timers.push({ delay, fire })
      return timers.length
    },
  }
  vm.runInNewContext(THEME_INIT_SCRIPT, sandbox)
  return { dataset, timers }
}

describe('THEME_INIT_SCRIPT', () => {
  // It is inlined into <head> as an IIFE; a stray `</script>` or a line break
  // would end the tag or the statement early.
  it('is a single-line, self-contained expression', () => {
    expect(THEME_INIT_SCRIPT).not.toContain('\n')
    expect(THEME_INIT_SCRIPT.toLowerCase()).not.toContain('</script')
    expect(THEME_INIT_SCRIPT.startsWith('(function()')).toBe(true)
  })

  it('applies a stored theme and shows no intro', () => {
    for (const theme of THEMES) {
      const { dataset, timers } = runScript({ stored: theme, page: 'home' })
      expect(dataset.theme).toBe(theme)
      expect(dataset.intro).toBeUndefined()
      expect(timers).toHaveLength(0)
    }
  })

  it('ignores a stored value that is not a theme', () => {
    const { dataset } = runScript({ stored: 'sepia', page: 'home' })
    expect(dataset.theme).toBeUndefined()
    expect(dataset.intro).toBe('pending')
  })

  it('sets no theme at all when nothing is stored', () => {
    // The palette then follows `prefers-color-scheme`, which is CSS and needs
    // no attribute; writing the default here would defeat that.
    expect(runScript({ page: 'home' }).dataset.theme).toBeUndefined()
  })

  it('marks the intro on the home page and nowhere else', () => {
    expect(runScript({ page: 'home' }).dataset.intro).toBe('pending')
    expect(runScript().dataset.intro).toBeUndefined()
    expect(runScript({ page: 'gallery' }).dataset.intro).toBeUndefined()
  })

  it('survives a storage that throws, and still marks the intro', () => {
    const { dataset } = runScript({ throws: true, page: 'home' })
    expect(dataset.theme).toBeUndefined()
    expect(dataset.intro).toBe('pending')
  })

  it('arms the failsafe, which lifts an intro that never started', () => {
    const { dataset, timers } = runScript({ page: 'home' })
    expect(timers).toHaveLength(1)
    expect(timers[0]?.delay).toBe(INTRO_FAILSAFE_MS)
    timers[0]?.fire()
    expect(dataset.intro).toBeUndefined()
  })

  it('leaves an intro that did start alone', () => {
    const { dataset, timers } = runScript({ page: 'home' })
    dataset.intro = 'running'
    timers[0]?.fire()
    expect(dataset.intro).toBe('running')
  })
})
