import { localeOf, localePath, stripLocale } from './i18n.ts'

/**
 * The German paths and tag slugs of P4-P7, mapped to the English ones. Nothing
 * was ever deployed under them; this only catches links shared during
 * development. Photo slugs need no map — they were English from the start.
 */
const LEGACY_PATHS: Record<string, string> = {
  '/galerie': '/gallery',
  '/foto': '/photo',
  '/ueber': '/about',
  '/impressum': '/legal-notice',
  '/datenschutz': '/privacy',
}

const LEGACY_TAGS: Record<string, string> = {
  tiere: 'animals',
  natur: 'nature',
  landschaft: 'landscape',
  segeln: 'sailing',
  schwarzweiss: 'black-and-white',
}

/** The English tag for a German one, or `null` if it is not a legacy tag. */
export function rewriteLegacyTag(tag: string): string | null {
  return LEGACY_TAGS[tag] ?? null
}

/**
 * The current path for a legacy one, or `null` if there is nothing to rewrite.
 * Accepts a path from either language tree and keeps the tree it was given.
 */
export function rewriteLegacyPath(path: string): string | null {
  const locale = localeOf(path)
  const base = stripLocale(path)
  const rewritten = rewriteBase(base)
  if (rewritten === null) return null
  return localePath(rewritten, locale)
}

function rewriteBase(path: string): string | null {
  for (const [from, to] of Object.entries(LEGACY_PATHS)) {
    if (path === from) return to
    if (path.startsWith(`${from}/`)) {
      const rest = path.slice(from.length + 1)
      if (from !== '/galerie') return `${to}/${rest}`
      return `${to}/${rewriteLegacyTag(rest) ?? rest}`
    }
  }
  // A current gallery path can still carry a German tag: `/gallery/segeln`.
  const tag = path.startsWith('/gallery/') ? path.slice('/gallery/'.length) : null
  const mapped = tag === null ? null : rewriteLegacyTag(tag)
  return mapped === null ? null : `/gallery/${mapped}`
}
