import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanupOrphans } from '../../scripts/lib/cleanup.ts'
import type { Issue, Reporter } from '../../scripts/lib/report.ts'

// The only code in this project that deletes, so most of these tests pin down
// when it refuses to.

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

// `harbour` is the wanted state, `orphan` has no source any more, and
// `harbour/2560.avif` is a variant the current configuration no longer produces.
function makeTree(): void {
  mkdirSync(path.join(dir, 'harbour'), { recursive: true })
  for (const name of ['480.avif', '960.avif', '960.jpg', 'og.jpg', '2560.avif']) {
    writeFileSync(path.join(dir, 'harbour', name), name)
  }
  mkdirSync(path.join(dir, 'orphan'), { recursive: true })
  writeFileSync(path.join(dir, 'orphan', '480.avif'), 'x')
  writeFileSync(path.join(dir, 'orphan', 'og.jpg'), 'x')
}

const keep = () => new Map([['harbour', new Set(['480.avif', '960.avif', '960.jpg', 'og.jpg'])]])

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'spaeth-cleanup-'))
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('cleanupOrphans', () => {
  it('removes orphaned slug folders and variants that no longer exist', () => {
    makeTree()
    const { reporter, steps } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter })

    expect(removed).toEqual({ files: 1, dirs: 1, skipped: null })
    expect(existsSync(path.join(dir, 'orphan'))).toBe(false)
    expect(existsSync(path.join(dir, 'harbour', '2560.avif'))).toBe(false)
    expect(existsSync(path.join(dir, 'harbour', '960.avif'))).toBe(true)
    expect(existsSync(path.join(dir, 'harbour', 'og.jpg'))).toBe(true)
    expect(steps.join('\n')).toContain('removed orphan')
  })

  it('leaves behind everything that is not a generated variant', () => {
    makeTree()
    writeFileSync(path.join(dir, 'README.md'), '# Output')
    writeFileSync(path.join(dir, 'harbour', '.gitkeep'), '')
    writeFileSync(path.join(dir, 'harbour', 'note.txt'), 'by hand')
    writeFileSync(path.join(dir, 'harbour', '960.avif.bak'), 'by hand')
    mkdirSync(path.join(dir, 'Kein Slug'))
    writeFileSync(path.join(dir, 'Kein Slug', 'egal.avif'), 'x')

    const { reporter, issues } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter })

    expect(removed.dirs).toBe(1)
    expect(removed.files).toBe(1)
    for (const survivor of [
      'README.md',
      path.join('harbour', '.gitkeep'),
      path.join('harbour', 'note.txt'),
      path.join('harbour', '960.avif.bak'),
      path.join('Kein Slug', 'egal.avif'),
    ]) {
      expect(existsSync(path.join(dir, survivor)), survivor).toBe(true)
    }
    // What is left behind is reported, not passed over in silence.
    expect(issues.filter((issue) => issue.scope === 'cleanup').length).toBe(5)
  })

  it('does not clean up at all without source images', () => {
    makeTree()
    const { reporter, issues } = recorder()
    const removed = cleanupOrphans({ dir, keep: new Map(), reporter })

    expect(removed).toEqual({ files: 0, dirs: 0, skipped: 'empty' })
    expect(existsSync(path.join(dir, 'orphan'))).toBe(true)
    expect(issues[0]?.message).toContain('no source images')
  })

  it('does not touch a symlink — it points out of the output directory', () => {
    makeTree()
    const outside = mkdtempSync(path.join(tmpdir(), 'spaeth-outside-'))
    writeFileSync(path.join(outside, 'wichtig.txt'), 'do not delete')
    symlinkSync(outside, path.join(dir, 'elsewhere'))
    try {
      const { reporter, issues } = recorder()
      const removed = cleanupOrphans({ dir, keep: keep(), reporter })

      expect(removed.dirs).toBe(1)
      expect(existsSync(path.join(outside, 'wichtig.txt'))).toBe(true)
      expect(issues.some((issue) => issue.message.includes('symlink'))).toBe(true)
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })

  it('deletes nothing at all on a partial run (--only)', () => {
    makeTree()
    const { reporter, infos } = recorder()
    // The dangerous case: cold cache, --only, every other slug missing from the
    // wanted state — their outputs are valid all the same.
    const removed = cleanupOrphans({ dir, keep: keep(), reporter, partial: true })

    expect(removed).toEqual({ files: 0, dirs: 0, skipped: 'partial' })
    expect(existsSync(path.join(dir, 'orphan'))).toBe(true)
    expect(existsSync(path.join(dir, 'harbour', '2560.avif'))).toBe(true)
    expect(infos.join('\n')).toContain('--only')
  })

  it('deletes nothing after a run with errors', () => {
    makeTree()
    const { reporter, infos } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter, hasErrors: true })

    expect(removed).toEqual({ files: 0, dirs: 0, skipped: 'errors' })
    expect(existsSync(path.join(dir, 'orphan'))).toBe(true)
    expect(infos.join('\n')).toContain('errors')
  })

  it('keeps protected slugs even when they are missing from the wanted state', () => {
    makeTree()
    const { reporter, issues } = recorder()
    const removed = cleanupOrphans({
      dir,
      keep: keep(),
      reporter,
      protectedSlugs: new Set(['orphan']),
    })

    expect(removed.dirs).toBe(0)
    expect(existsSync(path.join(dir, 'orphan'))).toBe(true)
    expect(issues.some((issue) => issue.message.includes('photo has errors'))).toBe(true)
  })

  it('reports in a dry run what would go and deletes nothing', () => {
    makeTree()
    const { reporter, steps } = recorder()
    const removed = cleanupOrphans({ dir, keep: keep(), reporter, dryRun: true })

    expect(removed).toEqual({ files: 1, dirs: 1, skipped: null })
    expect(existsSync(path.join(dir, 'orphan'))).toBe(true)
    expect(existsSync(path.join(dir, 'harbour', '2560.avif'))).toBe(true)
    expect(steps.join('\n')).toContain('would remove orphan')
    expect(steps.join('\n')).toContain('would remove harbour/2560.avif')
  })

  it('copes with a missing output directory', () => {
    const { reporter } = recorder()
    const removed = cleanupOrphans({
      dir: path.join(dir, 'does-not-exist'),
      keep: keep(),
      reporter,
    })
    expect(removed.skipped).toBe('no-directory')
  })
})
