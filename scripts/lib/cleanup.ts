import { existsSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { VARIANT_EXTENSION } from '../../shared/constants/images.ts'
import { assertInside, displayPath } from './paths.ts'
import type { Reporter } from './report.ts'
import { isValidSlug } from './slug.ts'

/**
 * Removal of orphaned outputs below the image output directory. The only place
 * in the pipeline that deletes, and therefore the only one that checks its own
 * preconditions instead of trusting the caller.
 */

/** Only these file names may live below `<dir>/<slug>/`. */
export const OUTPUT_FILE_PATTERN = new RegExp(
  `^(?:\\d+\\.(?:${Object.values(VARIANT_EXTENSION).join('|')})|og\\.jpg)$`,
)

export interface CleanupOptions {
  /** Output directory, usually `public/img`. It is never left. */
  dir: string
  /** Target state: slug → permitted file names. */
  keep: Map<string, Set<string>>
  reporter: Reporter
  /** Report only, touch nothing. */
  dryRun?: boolean
  /** The run was partial (`--only`), so `keep` is incomplete and nothing is removed. */
  partial?: boolean
  /** The run had errors — the error path is never destructive. */
  hasErrors?: boolean
  /** Slugs whose outputs must survive regardless of `keep`. */
  protectedSlugs?: ReadonlySet<string>
}

export interface CleanupResult {
  files: number
  dirs: number
  /** Reason, if nothing was cleaned up at all. */
  skipped: 'partial' | 'errors' | 'empty' | 'no-directory' | null
}

export function cleanupOrphans(options: CleanupOptions): CleanupResult {
  const { dir, keep, reporter, dryRun = false, partial = false, hasErrors = false } = options
  const protectedSlugs = options.protectedSlugs ?? new Set<string>()
  const removed: CleanupResult = { files: 0, dirs: 0, skipped: null }

  if (partial) {
    reporter.info('  Cleanup skipped (--only): the run knows only part of the set.')
    return { ...removed, skipped: 'partial' }
  }
  if (hasErrors) {
    reporter.info('  Cleanup skipped (errors): the error path deletes nothing.')
    return { ...removed, skipped: 'errors' }
  }
  if (!existsSync(dir)) return { ...removed, skipped: 'no-directory' }
  if (keep.size === 0) {
    reporter.warn('cleanup', 'no source images — nothing is cleaned up')
    return { ...removed, skipped: 'empty' }
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = assertInside(dir, path.join(dir, entry.name))

    // Deleting a symlink would reach beyond the output directory — exactly what
    // assertInside exists to prevent.
    if (entry.isSymbolicLink()) {
      reporter.warn('cleanup', `symlink left untouched: ${displayPath(full)}`)
      continue
    }

    if (!entry.isDirectory()) {
      reporter.warn('cleanup', `unexpected file left in place: ${displayPath(full)}`)
      continue
    }

    const allowed = keep.get(entry.name)
    if (!allowed) {
      if (!isValidSlug(entry.name)) {
        reporter.warn('cleanup', `unexpected directory left in place: ${displayPath(full)}`)
        continue
      }
      if (protectedSlugs.has(entry.name)) {
        reporter.warn('cleanup', `${entry.name}: outputs kept (photo has errors)`)
        continue
      }
      const count = readdirSync(full).length
      reporter.step(dryRun ? 'would remove' : 'removed', entry.name, `${count} files · source gone`)
      if (!dryRun) rmSync(full, { recursive: true, force: true })
      removed.dirs += 1
      continue
    }

    for (const file of readdirSync(full, { withFileTypes: true })) {
      if (allowed.has(file.name)) continue
      const target = assertInside(full, path.join(full, file.name))
      if (!file.isFile() || file.isSymbolicLink() || !OUTPUT_FILE_PATTERN.test(file.name)) {
        reporter.warn('cleanup', `unexpected entry left in place: ${displayPath(target)}`)
        continue
      }
      reporter.step(
        dryRun ? 'would remove' : 'removed',
        `${entry.name}/${file.name}`,
        'variant gone',
      )
      if (!dryRun) unlinkSync(target)
      removed.files += 1
    }
  }

  return removed
}
