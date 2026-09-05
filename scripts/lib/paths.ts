import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import type { SourceMode } from '../../shared/types/photo.ts'

/** Project root: this file lives in `<root>/scripts/lib/`. */
export const ROOT = path.resolve(import.meta.dirname, '..', '..')

export const CONTENT_DIR = path.join(ROOT, 'content')
export const DEMO_DIR = path.join(ROOT, 'demo-content')
export const PUBLIC_IMG_DIR = path.join(ROOT, 'public', 'img')
export const MANIFEST_PATH = path.join(ROOT, 'photos.manifest.json')
export const INDEX_PATH = path.join(ROOT, 'app', 'data', 'photos.index.json')
export const CACHE_DIR = path.join(ROOT, '.image-cache')
export const CACHE_PATH = path.join(CACHE_DIR, 'manifest-cache.json')

/** Subdirectories of a content root (`content/`, `demo-content/`). */
export function photosDirs(contentRoot: string) {
  return {
    root: contentRoot,
    source: path.join(contentRoot, 'photos', 'source'),
    meta: path.join(contentRoot, 'photos', 'meta'),
  }
}

/** `~/foo` → `<home>/foo`. Only a leading `~` is replaced. */
export function expandHome(input: string): string {
  if (input === '~') return homedir()
  if (input.startsWith('~/')) return path.join(homedir(), input.slice(2))
  return input
}

/** Absolute path, resolved against the project root rather than the cwd. */
export function fromRoot(input: string): string {
  const expanded = expandHome(input)
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(ROOT, expanded)
}

/** For output: path relative to the project root, absolute if it lies outside. */
export function displayPath(target: string): string {
  const rel = path.relative(ROOT, target)
  return rel && !rel.startsWith('..') ? rel : target
}

/** Is `child` inside `parent`? A path is not contained in itself. */
export function isInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/**
 * Guard before every write or delete: returns the normalised path or throws.
 * Cleanup touches no file without this call.
 */
export function assertInside(parent: string, child: string): string {
  if (!isInside(parent, child)) {
    throw new Error(`path lies outside ${displayPath(parent)}: ${child}`)
  }
  return path.resolve(child)
}

export interface ResolvedSource {
  mode: SourceMode
  /** Root (`content`, `demo-content`, or the override). */
  root: string
  sourceDir: string
  metaDir: string
  /** Why this root was chosen, for the log line. */
  reason: string
}

const JPEG_RE = /\.jpe?g$/i

/** Number of JPEGs directly in `dir` (0 if the directory does not exist). */
export function countJpegs(dir: string): number {
  if (!existsSync(dir)) return 0
  try {
    return readdirSync(dir).filter((name) => JPEG_RE.test(name)).length
  } catch {
    return 0
  }
}

export function listJpegs(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => JPEG_RE.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

/**
 * Picks the source directory: explicit override → private `content/` submodule
 * → `demo-content/`. The submodule counts as present only when it is checked
 * out (`content/.git` exists — a file, not a directory, for a submodule) AND
 * holds at least one source file, so a clone without access falls back to the
 * demo content instead of failing the build.
 */
export function resolveSource(override?: string): ResolvedSource {
  if (override) {
    const root = fromRoot(override)
    const dirs = photosDirs(root)
    if (countJpegs(dirs.source) > 0) {
      return {
        mode: isInside(DEMO_DIR, dirs.source) ? 'demo' : 'content',
        root,
        sourceDir: dirs.source,
        metaDir: dirs.meta,
        reason: `override --source-dir ${displayPath(root)}`,
      }
    }
  }

  const content = photosDirs(CONTENT_DIR)
  const submoduleCheckedOut = existsSync(path.join(CONTENT_DIR, '.git'))
  if (submoduleCheckedOut && countJpegs(content.source) > 0) {
    return {
      mode: 'content',
      root: CONTENT_DIR,
      sourceDir: content.source,
      metaDir: content.meta,
      reason: 'private content/ submodule',
    }
  }

  const demo = photosDirs(DEMO_DIR)
  return {
    mode: 'demo',
    root: DEMO_DIR,
    sourceDir: demo.source,
    metaDir: demo.meta,
    reason: submoduleCheckedOut
      ? 'content/ holds no sources — demo fallback'
      : 'content/ not checked out — demo fallback',
  }
}

/** mtime and size for the cache fast path; null if the file is missing. */
export function statFile(file: string): { mtimeMs: number; size: number } | null {
  try {
    const s = statSync(file)
    return { mtimeMs: Math.round(s.mtimeMs), size: s.size }
  } catch {
    return null
  }
}
