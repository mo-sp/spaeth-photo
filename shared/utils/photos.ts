import type { PhotoIndexEntry, Tag, TagCount } from '../types/photo.ts'
import { DEFAULT_LOCALE, type Locale } from './i18n.ts'
import { TAG_ORDER } from './tags.ts'

/**
 * Newest first, ties broken by slug — the same order the build writes into the
 * manifest. The front end sorts anyway so that a filtered list can never come
 * out in a different order than an unfiltered one.
 */
export function sortPhotos(photos: readonly PhotoIndexEntry[]): PhotoIndexEntry[] {
  return [...photos].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.slug.localeCompare(b.slug, 'en')
  })
}

/**
 * The filter context a photo page may claim. A tag the photo does not carry is
 * a hand-assembled or stale link: honouring it would show "00 / 04" with no
 * neighbours and a back link into a gallery the photo is not in.
 */
export function effectiveTag(
  photos: readonly PhotoIndexEntry[],
  slug: string,
  wanted: Tag | null,
): Tag | null {
  if (wanted === null) return null
  const current = photos.find((photo) => photo.slug === slug)
  return current?.tags.includes(wanted) ? wanted : null
}

/**
 * Single-select filter; `null` is the full pool. An empty result falls back to
 * the full pool (spec) — an empty gallery would read as a defect.
 */
export function filterByTag(
  photos: readonly PhotoIndexEntry[],
  tag: Tag | null,
): PhotoIndexEntry[] {
  if (tag === null) return [...photos]
  const filtered = photos.filter((photo) => photo.tags.includes(tag))
  return filtered.length > 0 ? filtered : [...photos]
}

/** Tags in canonical order, only those actually in use. */
export function tagCounts(photos: readonly PhotoIndexEntry[]): TagCount[] {
  const counts = new Map<Tag, number>()
  for (const photo of photos) {
    for (const tag of photo.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return TAG_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
    tag,
    count: counts.get(tag) ?? 0,
  }))
}

export interface Neighbours {
  /** Zero-based position, `-1` when the slug is not in the list. */
  index: number
  /** One-based, for the "03 / 14" display; `0` for an unknown slug. */
  position: number
  total: number
  current: PhotoIndexEntry | null
  prev: PhotoIndexEntry | null
  next: PhotoIndexEntry | null
}

/**
 * Neighbours within the (filtered) list, cyclic via `(i ± 1 + n) % n`. With a
 * single photo the formula would point at the photo itself, so prev/next stay
 * empty rather than linking to the current page.
 */
export function neighbours(photos: readonly PhotoIndexEntry[], slug: string): Neighbours {
  const total = photos.length
  const index = photos.findIndex((photo) => photo.slug === slug)
  if (index < 0) {
    return { index: -1, position: 0, total, current: null, prev: null, next: null }
  }
  const cyclic = total > 1
  return {
    index,
    position: index + 1,
    total,
    current: photos[index] ?? null,
    prev: cyclic ? (photos[(index - 1 + total) % total] ?? null) : null,
    next: cyclic ? (photos[(index + 1) % total] ?? null) : null,
  }
}

/**
 * How many gallery tiles load without `loading="lazy"`. CSS-column masonry
 * settles its layout too late for the browser's lazy loader, so the column
 * break is simulated from the aspect ratios and everything above roughly one
 * screen height is eager. The min/max clamp keeps the count in the range the
 * measurements covered, whatever the collection size.
 */
export function eagerCount(
  photos: readonly PhotoIndexEntry[],
  columns = 3,
  targetHeight = 1.3,
  min = 6,
  max = 9,
): number {
  const heights = new Array<number>(Math.max(1, columns)).fill(0)
  let count = 0
  for (const photo of photos) {
    const shortest = heights.indexOf(Math.min(...heights))
    if ((heights[shortest] ?? 0) >= targetHeight) break
    heights[shortest] = (heights[shortest] ?? 0) + 1 / (photo.aspectRatio || 1)
    count += 1
  }
  return Math.min(photos.length, Math.max(Math.min(count, max), Math.min(min, photos.length)))
}

/** Two-digit counter display (`3` → `03`); three digits and up grow rather than truncate. */
export function padCounter(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * The curated home-page selection. `featured` and `order` come from the YAML,
 * so the choice is the photographer's, not the code's; a missing `order` sorts
 * last instead of reshuffling the row.
 */
export function curated(photos: readonly PhotoIndexEntry[], limit = 5): PhotoIndexEntry[] {
  return photos
    .filter((photo) => photo.featured)
    .sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return a.slug.localeCompare(b.slug, 'en')
    })
    .slice(0, limit)
}

/** The title in the requested locale; German falls back to the English one. */
export function photoTitle(
  photo: Pick<PhotoIndexEntry, 'title' | 'titleDe'>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (locale === 'de') return photo.titleDe ?? photo.title
  return photo.title
}

/**
 * The `alt` text in the requested locale. A missing description falls back to
 * the title of the *same* locale — an `alt` in the other language would be
 * read out in the wrong one.
 */
export function photoAlt(
  photo: Pick<PhotoIndexEntry, 'title' | 'titleDe' | 'alt' | 'altDe'>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (locale === 'de') return photo.altDe ?? photoTitle(photo, 'de')
  return photo.alt ?? photo.title
}
