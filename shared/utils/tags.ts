import type { Tag } from '../types/photo.ts'
import { DEFAULT_LOCALE, type Locale } from './i18n.ts'

/**
 * Tag vocabulary of the front end. It lives under `shared/utils/` because Nuxt
 * only auto-imports from there (and from `shared/types/`) — the build scripts
 * import the same file by relative path.
 */

/**
 * Order of the tags in the filter bar. Deliberately sorted by meaning (subject
 * groups first, the stylistic one last), not alphabetically.
 */
export const TAG_ORDER = [
  'animals',
  'nature',
  'landscape',
  'sailing',
  'fire',
  'architecture',
  'black-and-white',
] as const

/** Display labels per locale; the keys stay lowercase ASCII because they are URLs. */
export const TAG_LABELS: Record<Locale, Record<Tag, string>> = {
  en: {
    animals: 'Animals',
    nature: 'Nature',
    landscape: 'Landscape',
    sailing: 'Sailing',
    fire: 'Fire',
    architecture: 'Architecture',
    'black-and-white': 'Black & White',
  },
  de: {
    animals: 'Tiere',
    nature: 'Natur',
    landscape: 'Landschaft',
    sailing: 'Segeln',
    fire: 'Feuer',
    architecture: 'Architektur',
    'black-and-white': 'Schwarzweiß',
  },
}

/** Label of a tag; falls back to the key itself if it is unknown. */
export function tagLabel(tag: string, locale: Locale = DEFAULT_LOCALE): string {
  return TAG_LABELS[locale][tag as Tag] ?? tag
}

/**
 * Checks a route parameter against the vocabulary. Anything that is not a known
 * tag yields `null` — the gallery page turns that into a 404 rather than
 * quietly showing the unfiltered set.
 */
export function parseTag(value: unknown): Tag | null {
  if (typeof value !== 'string' || value === '') return null
  return (TAG_ORDER as readonly string[]).includes(value) ? (value as Tag) : null
}
