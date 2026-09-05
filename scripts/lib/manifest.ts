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
 * Assembly of the two generated artefacts: the full build log
 * `photos.manifest.json` and the client index `app/data/photos.index.json`.
 * Both are generated and gitignored.
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
  /** Source directory relative to the project root, for diagnostics only. */
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
 * Newest first; on equal dates the slug decides alphabetically, so that two
 * builds produce an identical order.
 */
export function comparePhotos(
  a: { date: string; slug: string },
  b: { date: string; slug: string },
): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return a.slug.localeCompare(b.slug, 'en')
}

/** Tags in canonical order, only the ones actually in use. */
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
 * Exactly one photo carries `hero: true`. A missing mark only warns — a home
 * page without a hero would be broken, so the build picks one. Two marks are an
 * error: that needs a decision the script must not make.
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
      message: `${marked.length} photos carry hero: true (${marked
        .map((photo) => photo.slug)
        .join(', ')}) — exactly one may`,
    })
    return { heroSlug: marked[0]?.slug ?? null, issues }
  }

  if (photos.length === 0) return { heroSlug: null, issues }

  const fallback = photos.find((photo) => photo.meta.featured) ?? photos[0]!
  issues.push({
    level: 'warn',
    scope: 'hero',
    message: `no photo carries hero: true — using ${fallback.slug}`,
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
        message: `order ${photo.meta.order} is used twice (${previous}, ${photo.slug})`,
      })
    } else {
      seenOrder.set(photo.meta.order, photo.slug)
    }
    if (!photo.meta.featured) {
      issues.push({
        level: 'warn',
        scope: photo.slug,
        message: 'order set, but featured: false — the photo will not appear on the home page',
      })
    }
  }

  const manifestPhotos: ManifestPhoto[] = sorted.map((photo) => ({
    slug: photo.slug,
    title: photo.meta.title,
    // Spread, so an absent translation is an absent key rather than a null.
    ...(photo.meta.title_de === null ? {} : { titleDe: photo.meta.title_de }),
    alt: photo.meta.alt,
    ...(photo.meta.alt_de === null ? {} : { altDe: photo.meta.alt_de }),
    date: photo.meta.date,
    year: year(photo.meta.date),
    tags: photo.meta.tags,
    collection: photo.meta.collection,
    camera: photo.meta.camera,
    lens: photo.meta.lens,
    featured: photo.meta.featured,
    // Derived, not copied: this and `heroSlug` cannot drift apart, whatever the
    // YAML files say.
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

/** The client index: the same data model without the build internals. */
export function toIndex(manifest: PhotoManifest): PhotoIndexFile {
  const photos: PhotoIndexEntry[] = manifest.photos.map((photo) => ({
    slug: photo.slug,
    title: photo.title,
    ...(photo.titleDe === undefined ? {} : { titleDe: photo.titleDe }),
    alt: photo.alt,
    ...(photo.altDe === undefined ? {} : { altDe: photo.altDe }),
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
