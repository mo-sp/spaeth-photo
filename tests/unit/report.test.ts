import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createReporter, formatBytes, formatDuration } from '../../scripts/lib/report.ts'

// The reporter decides whether a build counts as failed: a `finish()` that does
// not set the exit code turns every CI gate into a dummy.

let log: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  log = vi.spyOn(console, 'log').mockImplementation(() => {})
  process.exitCode = 0
})

afterEach(() => {
  log.mockRestore()
  // Otherwise the test run itself would carry the exit code away with it.
  process.exitCode = 0
})

// styleText only colours when the target stream can — compare without control
// characters either way.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
const stripAnsi = (text: string) => text.replace(ANSI, '')
const output = (): string =>
  log.mock.calls.map((call: unknown[]) => stripAnsi(String(call[0] ?? ''))).join('\n')

describe('finish', () => {
  it('lets a run without messages succeed', () => {
    const reporter = createReporter()
    reporter.finish()
    expect(process.exitCode).toBe(0)
    expect(log).not.toHaveBeenCalled()
  })

  it('lets a run without messages succeed with --strict too', () => {
    const reporter = createReporter()
    reporter.finish({ strict: true })
    expect(process.exitCode).toBe(0)
  })

  it('reports warnings but lets the run succeed', () => {
    const reporter = createReporter()
    reporter.warn('harbour', 'metadata without a source image')
    reporter.finish()
    expect(process.exitCode).toBe(0)
    expect(output()).toContain('metadata without a source image')
    expect(output()).toContain('WARN')
  })

  it('turns warnings into errors with --strict', () => {
    const reporter = createReporter()
    reporter.warn('harbour', 'metadata without a source image')
    reporter.finish({ strict: true })
    expect(process.exitCode).toBe(1)
    expect(output()).toContain('--strict')
    expect(output()).toContain('1 warning(s)')
  })

  it('always fails a run with errors', () => {
    const reporter = createReporter()
    reporter.error('harbour', 'Metadaten fehlen')
    reporter.finish()
    expect(process.exitCode).toBe(1)
    expect(output()).toContain('ERROR')
    expect(output()).toContain('Metadaten fehlen')
  })

  it('fails on errors with --strict too, without repeating the warning notice', () => {
    const reporter = createReporter()
    reporter.error('harbour', 'Metadaten fehlen')
    reporter.warn('harbour', 'nebenbei')
    reporter.finish({ strict: true })
    expect(process.exitCode).toBe(1)
    expect(output()).not.toContain('--strict:')
  })

  it('counts errors and warnings separately', () => {
    const reporter = createReporter()
    reporter.warn('a', 'eins')
    reporter.warn('b', 'zwei')
    reporter.error('c', 'drei')
    expect(reporter.counts()).toEqual({ errors: 1, warnings: 2 })
    expect(reporter.issues).toHaveLength(3)
    reporter.finish()
  })

  it('aligns the table on the longest scope', () => {
    const reporter = createReporter()
    reporter.warn('kurz', 'eins')
    reporter.error('ein-sehr-langer-slug', 'zwei')
    reporter.finish()
    const lines = output()
      .split('\n')
      .filter((line) => line.includes('eins') || line.includes('zwei'))
    expect(lines).toHaveLength(2)
    expect(lines[0]!.indexOf('eins')).toBe(lines[1]!.indexOf('zwei'))
  })
})

describe('step and info', () => {
  it('writes steps and free lines to stdout', () => {
    const reporter = createReporter()
    reporter.info('Quelle  content')
    reporter.step('gerendert', 'harbour', '4 Breiten')
    expect(output()).toContain('Quelle  content')
    expect(output()).toContain('harbour')
    expect(reporter.counts()).toEqual({ errors: 0, warnings: 0 })
  })
})

describe('formatBytes', () => {
  it('writes sizes with a decimal point and the fitting unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 100)).toBe('100 KB')
    expect(formatBytes(1024 * 1536)).toBe('1.5 MB')
  })
})

describe('formatDuration', () => {
  it('switches the unit at one second', () => {
    expect(formatDuration(940)).toBe('940 ms')
    expect(formatDuration(2345)).toBe('2.3 s')
  })
})
