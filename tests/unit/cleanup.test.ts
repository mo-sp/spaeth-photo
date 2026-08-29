import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanupOrphans } from '../../scripts/lib/cleanup.ts'
import type { Issue, Reporter } from '../../scripts/lib/report.ts'

/**
 * Der einzige Code des Projekts, der löscht. Getestet wird deshalb nicht nur,
 * dass er aufräumt, sondern vor allem, wann er es unterlässt: bei einem
 * Teillauf, nach einem Fehler, ohne Quellbilder — und bei allem, was nicht
 * eindeutig eine erzeugte Variante ist.
 */

interface Recorder {
  reporter: Reporter
  issues: Issue[]
  steps: string[]
  infos: string[]
}

function recorder(): Recorder {
  const issues: Issue[] = []
  const steps: string[] = []
  const infos: string[] = []
  const reporter: Reporter = {
    issues,
    info(message) {
      infos.push(message)
    },
    step(label, subject, detail) {
      steps.push(`${label} ${subject}${detail ? ` ${detail}` : ''}`)
    },
    warn(scope, message) {
      issues.push({ level: 'warn', scope, message })
    },
    error(scope, message) {
      issues.push({ level: 'error', scope, message })
    },
    counts() {
      return {
        errors: issues.filter((issue) => issue.level === 'error').length,
        warnings: issues.filter((issue) => issue.level === 'warn').length,
      }
    },
    finish() {},
  }
  return { reporter, issues, steps, infos }
}

let dir: string

/**
 * Ein Ausgabeverzeichnis mit zwei Fotos: `hafen` ist der Sollzustand,
 * `verwaist` hat keine Quelle mehr, und `hafen/2560.avif` ist eine Variante,
 * die es in der aktuellen Konfiguration nicht mehr gibt.
 */
function makeTree(): void {
  mkdirSync(path.join(dir, 'hafen'), { recursive: true })
  for (const name of ['480.avif', '960.avif', '960.jpg', 'og.jpg', '2560.avif']) {
    writeFileSync(path.join(dir, 'hafen', name), name)
  }
  mkdirSync(path.join(dir, 'verwaist'), { recursive: true })
  writeFileSync(path.join(dir, 'verwaist', '480.avif'), 'x')
  writeFileSync(path.join(dir, 'verwaist', 'og.jpg'), 'x')
}

const keep = () => new Map([['hafen', new Set(['480.avif', '960.avif', '960.jpg', 'og.jpg'])]])

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'spaeth-cleanup-'))
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('cleanupOrphans', () => {
  it('entfernt verwaiste Slug-Ordner und Varianten, die es nicht mehr gibt', () => {
    makeTree()
    const { reporter, steps } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter })

    expect(removed).toEqual({ files: 1, dirs: 1, skipped: null })
    expect(existsSync(path.join(dir, 'verwaist'))).toBe(false)
    expect(existsSync(path.join(dir, 'hafen', '2560.avif'))).toBe(false)
    expect(existsSync(path.join(dir, 'hafen', '960.avif'))).toBe(true)
    expect(existsSync(path.join(dir, 'hafen', 'og.jpg'))).toBe(true)
    expect(steps.join('\n')).toContain('entfernt verwaist')
  })

  it('lässt alles liegen, was keine erzeugte Variante ist', () => {
    makeTree()
    writeFileSync(path.join(dir, 'README.md'), '# Ausgabe')
    writeFileSync(path.join(dir, 'hafen', '.gitkeep'), '')
    writeFileSync(path.join(dir, 'hafen', 'notiz.txt'), 'von Hand')
    writeFileSync(path.join(dir, 'hafen', '960.avif.bak'), 'von Hand')
    mkdirSync(path.join(dir, 'Kein Slug'))
    writeFileSync(path.join(dir, 'Kein Slug', 'egal.avif'), 'x')

    const { reporter, issues } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter })

    expect(removed.dirs).toBe(1)
    expect(removed.files).toBe(1)
    for (const survivor of [
      'README.md',
      path.join('hafen', '.gitkeep'),
      path.join('hafen', 'notiz.txt'),
      path.join('hafen', '960.avif.bak'),
      path.join('Kein Slug', 'egal.avif'),
    ]) {
      expect(existsSync(path.join(dir, survivor)), survivor).toBe(true)
    }
    // Liegengelassenes wird gemeldet, nicht verschwiegen.
    expect(issues.filter((issue) => issue.scope === 'cleanup').length).toBe(5)
  })

  it('räumt ohne Quellbilder gar nicht auf', () => {
    makeTree()
    const { reporter, issues } = recorder()
    const removed = cleanupOrphans({ dir, keep: new Map(), reporter })

    expect(removed).toEqual({ files: 0, dirs: 0, skipped: 'leer' })
    expect(existsSync(path.join(dir, 'verwaist'))).toBe(true)
    expect(issues[0]?.message).toContain('keine Quellbilder')
  })

  it('fasst einen Symlink nicht an — er zeigt aus dem Ausgabeverzeichnis heraus', () => {
    makeTree()
    const fremd = mkdtempSync(path.join(tmpdir(), 'spaeth-fremd-'))
    writeFileSync(path.join(fremd, 'wichtig.txt'), 'nicht löschen')
    symlinkSync(fremd, path.join(dir, 'anderswo'))
    try {
      const { reporter, issues } = recorder()
      const removed = cleanupOrphans({ dir, keep: keep(), reporter })

      expect(removed.dirs).toBe(1)
      expect(existsSync(path.join(fremd, 'wichtig.txt'))).toBe(true)
      expect(issues.some((issue) => issue.message.includes('Symlink'))).toBe(true)
    } finally {
      rmSync(fremd, { recursive: true, force: true })
    }
  })

  it('löscht bei einem Teillauf (--only) überhaupt nichts', () => {
    makeTree()
    const { reporter, infos } = recorder()
    // Genau der gefährliche Fall: kalter Cache, --only, alle anderen Slugs
    // fehlen im Sollzustand — ihre Ausgaben sind trotzdem gültig.
    const removed = cleanupOrphans({ dir, keep: keep(), reporter, partial: true })

    expect(removed).toEqual({ files: 0, dirs: 0, skipped: 'partial' })
    expect(existsSync(path.join(dir, 'verwaist'))).toBe(true)
    expect(existsSync(path.join(dir, 'hafen', '2560.avif'))).toBe(true)
    expect(infos.join('\n')).toContain('--only')
  })

  it('löscht nach einem Lauf mit Fehlern nichts', () => {
    makeTree()
    const { reporter, infos } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter, hasErrors: true })

    expect(removed).toEqual({ files: 0, dirs: 0, skipped: 'errors' })
    expect(existsSync(path.join(dir, 'verwaist'))).toBe(true)
    expect(infos.join('\n')).toContain('Fehler')
  })

  it('lässt geschützte Slugs stehen, auch wenn sie im Sollzustand fehlen', () => {
    makeTree()
    const { reporter, issues } = recorder()
    const removed = cleanupOrphans({
      dir,
      keep: keep(),
      reporter,
      protectedSlugs: new Set(['verwaist']),
    })

    expect(removed.dirs).toBe(0)
    expect(existsSync(path.join(dir, 'verwaist'))).toBe(true)
    expect(issues.some((issue) => issue.message.includes('Foto mit Fehler'))).toBe(true)
  })

  it('meldet im Dry-Run, was entfiele, und löscht nichts', () => {
    makeTree()
    const { reporter, steps } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter, dryRun: true })

    expect(removed).toEqual({ files: 1, dirs: 1, skipped: null })
    expect(existsSync(path.join(dir, 'verwaist'))).toBe(true)
    expect(existsSync(path.join(dir, 'hafen', '2560.avif'))).toBe(true)
    expect(steps.join('\n')).toContain('entfiele verwaist')
    expect(steps.join('\n')).toContain('entfiele hafen/2560.avif')
  })

  it('kommt mit einem fehlenden Ausgabeverzeichnis aus', () => {
    const { reporter } = recorder()
    const removed = cleanupOrphans({ dir: path.join(dir, 'gibt-es-nicht'), keep: keep(), reporter })
    expect(removed.skipped).toBe('kein-verzeichnis')
  })
})
