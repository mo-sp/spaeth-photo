import raw from '~/data/photos.index.json'
import type { PhotoIndexEntry, PhotoIndexFile, Tag } from '#shared/types/photo'

/**
 * The generated client index. Imported at module scope, so the bundler inlines
 * it and there is no network round trip — it is a build constant. Exactly one
 * cast types the JSON; the build already validated it with zod.
 */
const index = raw as unknown as PhotoIndexFile

/** Canonical order: date descending, then slug. Sorted once, not per call. */
const photos = sortPhotos(index.photos)

/** A photo or `null` — the detail page turns that into a 404. */
export function findPhoto(slug: string): PhotoIndexEntry | null {
  return index.photos.find((photo) => photo.slug === slug) ?? null
}

export function usePhotos() {
  return {
    index,
    /** All photos in canonical order: date descending, then slug. */
    photos,
    /** Only tags actually in use, in canonical order. */
    tags: index.tags,
    heroSlug: index.heroSlug,
    /** The home-page hero; the build already resolved the slug. */
    hero: index.photos.find((photo) => photo.slug === index.heroSlug) ?? null,
    /** Checks a route parameter against the collection, not just the vocabulary. */
    knownTag(value: unknown): Tag | null {
      const tag = parseTag(value)
      if (tag === null) return null
      return index.tags.some((entry) => entry.tag === tag) ? tag : null
    },
  }
}
