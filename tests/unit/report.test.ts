import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createReporter, formatBytes, formatDuration } from '../../scripts/lib/report.ts'

/**
 * Der Reporter entscheidet, ob ein Build als gescheitert gilt. Die CI hängt
 * genau an dieser Stelle: ein `finish()`, das den Exit-Code nicht setzt, macht
 * jedes Tor zur Attrappe.
 */

let log: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  log = vi.spyOn(console, 'log').mockImplementation(() => {})
  process.exitCode = 0
})

afterEach(() => {
  log.mockRestore()
  // Sonst nähme der Testlauf selbst den Exit-Code mit.
  process.exitCode = 0
})

// styleText färbt nur, wenn der Zielstream es kann — im Zweifel wird die
// Ausgabe hier ohne Steuerzeichen verglichen.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
const stripAnsi = (text: string) => text.replace(ANSI, '')
const output = (): string =>
  log.mock.calls.map((call: unknown[]) => stripAnsi(String(call[0] ?? ''))).join('\n')

describe('finish', () => {
  it('lässt einen Lauf ohne Meldungen erfolgreich sein', () => {
    const reporter = createReporter()
    reporter.finish()
    expect(process.exitCode).toBe(0)
    expect(log).not.toHaveBeenCalled()
  })

  it('lässt einen Lauf ohne Meldungen auch mit --strict erfolgreich sein', () => {
    const reporter = createReporter()
    reporter.finish({ strict: true })
    expect(process.exitCode).toBe(0)
  })

  it('meldet Warnungen, lässt den Lauf aber gelingen', () => {
    const reporter = createReporter()
    reporter.warn('hafen', 'Metadaten ohne Quellbild')
    reporter.finish()
    expect(process.exitCode).toBe(0)
    expect(output()).toContain('Metadaten ohne Quellbild')
    expect(output()).toContain('WARN')
  })

  it('macht Warnungen mit --strict zu Fehlern', () => {
    const reporter = createReporter()
    reporter.warn('hafen', 'Metadaten ohne Quellbild')
    reporter.finish({ strict: true })
    expect(process.exitCode).toBe(1)
    expect(output()).toContain('--strict')
    expect(output()).toContain('1 Warnung(en)')
  })

  it('lässt einen Lauf mit Fehlern immer scheitern', () => {
    const reporter = createReporter()
    reporter.error('hafen', 'Metadaten fehlen')
    reporter.finish()
    expect(process.exitCode).toBe(1)
    expect(output()).toContain('ERROR')
    expect(output()).toContain('Metadaten fehlen')
  })

  it('scheitert bei Fehlern auch mit --strict, ohne den Warnhinweis zu wiederholen', () => {
    const reporter = createReporter()
    reporter.error('hafen', 'Metadaten fehlen')
    reporter.warn('hafen', 'nebenbei')
    reporter.finish({ strict: true })
    expect(process.exitCode).toBe(1)
    expect(output()).not.toContain('--strict:')
  })

  it('zählt Fehler und Warnungen getrennt', () => {
    const reporter = createReporter()
    reporter.warn('a', 'eins')
    reporter.warn('b', 'zwei')
    reporter.error('c', 'drei')
    expect(reporter.counts()).toEqual({ errors: 1, warnings: 2 })
    expect(reporter.issues).toHaveLength(3)
    reporter.finish()
  })

  it('richtet die Tabelle am längsten Bezugspunkt aus', () => {
    const reporter = createReporter()
    reporter.warn('kurz', 'eins')
    reporter.error('ein-sehr-langer-slug', 'zwei')
    reporter.finish()
    const zeilen = output()
      .split('\n')
      .filter((line) => line.includes('eins') || line.includes('zwei'))
    expect(zeilen).toHaveLength(2)
    expect(zeilen[0]!.indexOf('eins')).toBe(zeilen[1]!.indexOf('zwei'))
  })
})

describe('step und info', () => {
  it('schreibt Schritte und freie Zeilen nach stdout', () => {
    const reporter = createReporter()
    reporter.info('Quelle  content')
    reporter.step('gerendert', 'hafen', '4 Breiten')
    expect(output()).toContain('Quelle  content')
    expect(output()).toContain('hafen')
    expect(reporter.counts()).toEqual({ errors: 0, warnings: 0 })
  })
})

describe('formatBytes', () => {
  it('schreibt Größen deutsch und stufengerecht', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(1024 * 100)).toBe('100 KB')
    expect(formatBytes(1024 * 1536)).toBe('1,5 MB')
  })
})

describe('formatDuration', () => {
  it('wechselt bei einer Sekunde die Einheit', () => {
    expect(formatDuration(940)).toBe('940 ms')
    expect(formatDuration(2345)).toBe('2,3 s')
  })
})
