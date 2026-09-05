import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { TAG_ORDER } from '../../shared/utils/tags.ts'
import type {
  ManifestPhoto,
  PhotoIndexEntry,
  PhotoIndexFile,
  PhotoManifest,
  PhotoMeta,
  SourceMode,
  Tag,
  TagCount,
} from '../../shared/types/photo.ts'
import { ogUrl } from '../../shared/constants/images.ts'
import type { RenderResult } from './variants.ts'

/**
 * Zusammenbau der beiden Artefakte.
 *
 * `photos.manifest.json` (Projektwurzel) ist vollständig: jede geschriebene
 * Datei mit Pfad und Größe, dazu Quellmaße und Hashes. Es ist ein
 * Build-Protokoll — für Diagnose und für das Aufräumen verwaister Ausgaben.
 *
 * `app/data/photos.index.json` ist der Teil, den das Frontend braucht, und
 * wird in das Bundle importiert. Er enthält keine Dateipfade: die URLs ergeben
 * sich aus der Konvention `/img/<slug>/<breite>.<endung>`. Beide Dateien sind
 * generiert und gitignored.
 */

export interface PhotoInput {
  slug: string
  meta: PhotoMeta
  render: RenderResult
  sourceHash: string
}

export interface ManifestIssue {
  level: 'error' | 'warn'
  scope: string
  message: string
}

export interface BuildManifestOptions {
  photos: PhotoInput[]
  sourceMode: SourceMode
  /** Quellverzeichnis relativ zur Projektwurzel, nur zur Diagnose. */
  sourceDir: string
  generatedAt?: string
}

export interface BuildManifestResult {
  manifest: PhotoManifest
  issues: ManifestIssue[]
}

function year(date: string): number {
  return Number(date.slice(0, 4))
}

/**
 * Neueste zuerst. Bei gleichem Datum entscheidet der Slug alphabetisch — nicht
 * aus Geschmack, sondern damit die Reihenfolge zwischen zwei Builds identisch
 * ist. Eine Galerie, die bei jedem Deploy anders sortiert, sieht wie ein Fehler
 * aus.
 */
export function comparePhotos(
  a: { date: string; slug: string },
  b: { date: string; slug: string },
): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return a.slug.localeCompare(b.slug, 'en')
}

/** Tags in kanonischer Reihenfolge, nur die tatsächlich vergebenen. */
export function countTags(photos: Array<{ tags: Tag[] }>): TagCount[] {
  const counts = new Map<Tag, number>()
  for (const photo of photos) {
    for (const tag of photo.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return TAG_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
    tag,
    count: counts.get(tag) ?? 0,
  }))
}

/**
 * Genau ein Foto trägt `hero: true`. Fehlt die Markierung, wählt der Build das
 * neueste hervorgehobene, sonst das neueste Foto überhaupt, und warnt — eine
 * Startseite ohne Hero wäre kaputt, und ein harter Fehler dafür wäre eine
 * unnötige Bremse. Zwei markierte Fotos sind dagegen ein Fehler: hier ist eine
 * Entscheidung nötig, die das Skript nicht treffen darf.
 */
export function resolveHero(photos: Array<{ slug: string; meta: PhotoMeta }>): {
  heroSlug: string | null
  issues: ManifestIssue[]
} {
  const issues: ManifestIssue[] = []
  const marked = photos.filter((photo) => photo.meta.hero)

  if (marked.length === 1) return { heroSlug: marked[0]!.slug, issues }

  if (marked.length > 1) {
    issues.push({
      level: 'error',
      scope: 'hero',
      message: `${marked.length} Fotos tragen hero: true (${marked
        .map((photo) => photo.slug)
        .join(', ')}) — genau eines darf es sein`,
    })
    return { heroSlug: marked[0]?.slug ?? null, issues }
  }

  if (photos.length === 0) return { heroSlug: null, issues }

  const fallback = photos.find((photo) => photo.meta.featured) ?? photos[0]!
  issues.push({
    level: 'warn',
    scope: 'hero',
    message: `kein Foto trägt hero: true — ${fallback.slug} eingesetzt`,
  })
  return { heroSlug: fallback.slug, issues }
}

export function buildManifest(options: BuildManifestOptions): BuildManifestResult {
  const { photos, sourceMode, sourceDir } = options
  const generatedAt = options.generatedAt ?? new Date().toISOString()

  const sorted = [...photos].sort((a, b) =>
    comparePhotos({ date: a.meta.date, slug: a.slug }, { date: b.meta.date, slug: b.slug }),
  )

  const { heroSlug, issues } = resolveHero(sorted)

  const seenOrder = new Map<number, string>()
  for (const photo of sorted) {
    if (photo.meta.order === null) continue
    const previous = seenOrder.get(photo.meta.order)
    if (previous) {
      issues.push({
        level: 'warn',
        scope: 'order',
        message: `order ${photo.meta.order} ist doppelt vergeben (${previous}, ${photo.slug})`,
      })
    } else {
      seenOrder.set(photo.meta.order, photo.slug)
    }
    if (!photo.meta.featured) {
      issues.push({
        level: 'warn',
        scope: photo.slug,
        message:
          'order gesetzt, aber featured: false — das Foto erscheint nicht auf der Startseite',
      })
    }
  }

  const manifestPhotos: ManifestPhoto[] = sorted.map((photo) => ({
    slug: photo.slug,
    title: photo.meta.title,
    alt: photo.meta.alt,
    date: photo.meta.date,
    year: year(photo.meta.date),
    tags: photo.meta.tags,
    collection: photo.meta.collection,
    camera: photo.meta.camera,
    lens: photo.meta.lens,
    featured: photo.meta.featured,
    // Aufgelöst statt abgeschrieben: `heroSlug` und dieses Feld können nicht
    // auseinanderlaufen, egal was in den YAML-Dateien steht.
    hero: photo.slug === heroSlug,
    order: photo.meta.order,
    width: photo.render.width,
    height: photo.render.height,
    aspectRatio: photo.render.aspectRatio,
    orientation: photo.render.orientation,
    color: photo.render.color,
    lqip: photo.render.lqip,
    variants: photo.render.variants,
    og: ogUrl(photo.slug),
    sourceWidth: photo.render.sourceWidth,
    sourceHeight: photo.render.sourceHeight,
    sourceBytes: photo.render.sourceBytes,
    sourceHash: photo.sourceHash,
    files: photo.render.files,
    ogFile: photo.render.ogFile,
    totalBytes: photo.render.totalBytes,
  }))

  return {
    manifest: {
      schema: 1,
      generatedAt,
      sourceMode,
      sourceDir,
      heroSlug,
      tags: countTags(manifestPhotos),
      photos: manifestPhotos,
    },
    issues,
  }
}

/** Der Client-Index: dasselbe Datenmodell ohne die Build-Interna. */
export function toIndex(manifest: PhotoManifest): PhotoIndexFile {
  const photos: PhotoIndexEntry[] = manifest.photos.map((photo) => ({
    slug: photo.slug,
    title: photo.title,
    alt: photo.alt,
    date: photo.date,
    year: photo.year,
    tags: photo.tags,
    collection: photo.collection,
    camera: photo.camera,
    lens: photo.lens,
    featured: photo.featured,
    hero: photo.hero,
    order: photo.order,
    width: photo.width,
    height: photo.height,
    aspectRatio: photo.aspectRatio,
    orientation: photo.orientation,
    color: photo.color,
    lqip: photo.lqip,
    variants: photo.variants,
    og: photo.og,
  }))

  return {
    schema: manifest.schema,
    generatedAt: manifest.generatedAt,
    sourceMode: manifest.sourceMode,
    heroSlug: manifest.heroSlug,
    tags: manifest.tags,
    photos,
  }
}

export function writeJson(file: string, data: unknown, pretty: boolean): void {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, pretty ? 2 : 0) + '\n', 'utf8')
}
