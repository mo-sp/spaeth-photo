import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import type { SourceMode } from '../../shared/types/photo.ts'

/** Projektwurzel: diese Datei liegt in `<root>/scripts/lib/`. */
export const ROOT = path.resolve(import.meta.dirname, '..', '..')

export const CONTENT_DIR = path.join(ROOT, 'content')
export const DEMO_DIR = path.join(ROOT, 'demo-content')
export const PUBLIC_IMG_DIR = path.join(ROOT, 'public', 'img')
export const MANIFEST_PATH = path.join(ROOT, 'photos.manifest.json')
export const INDEX_PATH = path.join(ROOT, 'app', 'data', 'photos.index.json')
export const CACHE_DIR = path.join(ROOT, '.image-cache')
export const CACHE_PATH = path.join(CACHE_DIR, 'manifest-cache.json')

/** Unterverzeichnisse eines Content-Wurzelverzeichnisses (`content/`, `demo-content/`). */
export function photosDirs(contentRoot: string) {
  return {
    root: contentRoot,
    source: path.join(contentRoot, 'photos', 'source'),
    meta: path.join(contentRoot, 'photos', 'meta'),
  }
}

/** `~/foo` → `<home>/foo`. Nur führendes `~` wird ersetzt. */
export function expandHome(input: string): string {
  if (input === '~') return homedir()
  if (input.startsWith('~/')) return path.join(homedir(), input.slice(2))
  return input
}

/** Absoluter Pfad relativ zur Projektwurzel (nicht zum cwd). */
export function fromRoot(input: string): string {
  const expanded = expandHome(input)
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(ROOT, expanded)
}

/** Für Ausgaben: Pfad relativ zur Projektwurzel, sonst absolut. */
export function displayPath(target: string): string {
  const rel = path.relative(ROOT, target)
  return rel && !rel.startsWith('..') ? rel : target
}

/**
 * Liegt `child` innerhalb von `parent`? Vergleicht normalisierte Pfade; ein
 * Pfad ist nicht in sich selbst enthalten.
 */
export function isInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/**
 * Schutzschranke vor jedem schreibenden oder löschenden Zugriff: gibt den
 * normalisierten Pfad zurück oder wirft. Ohne diesen Aufruf fasst das
 * Aufräumen keine Datei an.
 */
export function assertInside(parent: string, child: string): string {
  if (!isInside(parent, child)) {
    throw new Error(`Pfad liegt außerhalb von ${displayPath(parent)}: ${child}`)
  }
  return path.resolve(child)
}

export interface ResolvedSource {
  mode: SourceMode
  /** Wurzel (`content` oder `demo-content` oder Override). */
  root: string
  sourceDir: string
  metaDir: string
  /** Begründung für die Wahl, für die Log-Zeile. */
  reason: string
}

const JPEG_RE = /\.jpe?g$/i

/** Anzahl der JPEGs direkt in `dir` (0, wenn es das Verzeichnis nicht gibt). */
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
 * Wählt das Quellverzeichnis für den Bild-Build.
 *
 * Reihenfolge: expliziter Override → privates `content/`-Submodule →
 * `demo-content/`. Das Submodule gilt nur als vorhanden, wenn es ausgecheckt
 * ist (`content/.git` existiert — bei einem Submodule eine Datei, kein
 * Verzeichnis) UND mindestens eine Quelldatei enthält. Ein fremder Clone ohne
 * Zugriff bekommt so automatisch den Demo-Content, statt dass der Build
 * fehlschlägt.
 */
export function resolveSource(override?: string): ResolvedSource {
  if (override) {
    const root = fromRoot(override)
    const dirs = photosDirs(root)
    if (countJpegs(dirs.source) > 0) {
      return {
        // `dirs.source` liegt immer unterhalb von `root`; ist root der
        // Demo-Ordner, greift schon isInside.
        mode: isInside(DEMO_DIR, dirs.source) ? 'demo' : 'content',
        root,
        sourceDir: dirs.source,
        metaDir: dirs.meta,
        reason: `Override --source-dir ${displayPath(root)}`,
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
      reason: 'privates content/-Submodule',
    }
  }

  const demo = photosDirs(DEMO_DIR)
  return {
    mode: 'demo',
    root: DEMO_DIR,
    sourceDir: demo.source,
    metaDir: demo.meta,
    reason: submoduleCheckedOut
      ? 'content/ enthält keine Quellen — Demo-Fallback'
      : 'content/ nicht ausgecheckt — Demo-Fallback',
  }
}

/** mtime/Größe für den Cache-Fastpath; null, wenn die Datei fehlt. */
export function statFile(file: string): { mtimeMs: number; size: number } | null {
  try {
    const s = statSync(file)
    return { mtimeMs: Math.round(s.mtimeMs), size: s.size }
  } catch {
    return null
  }
}
