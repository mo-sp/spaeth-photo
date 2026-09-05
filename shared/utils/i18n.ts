/**
 * Locale arithmetic for the two route trees. Pure: the layout, the sitemap
 * route and `nuxt.config.ts` all need it.
 */

export const LOCALES = ['en', 'de'] as const

export type Locale = (typeof LOCALES)[number]

/** The unprefixed tree; `x-default` points here too. */
export const DEFAULT_LOCALE: Locale = 'en'

/** BCP-47 tags for `<html lang>` and `hreflang`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en',
  de: 'de',
}

/** OpenGraph wants a language_TERRITORY pair; nothing in the routing does. */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_GB',
  de: 'de_DE',
}

/** Endonyms for the language switch. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
}

/** The locales that carry a path prefix — every locale but the default one. */
export const PREFIXED_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)

/** Which tree a path belongs to. */
export function localeOf(path: string): Locale {
  for (const locale of PREFIXED_LOCALES) {
    // Whole segments only: `/design` is an English path, not a German one.
    if (path === `/${locale}` || path.startsWith(`/${locale}/`)) return locale
  }
  return DEFAULT_LOCALE
}

/** The path without its locale prefix — the form both trees are keyed on. */
export function stripLocale(path: string): string {
  for (const locale of PREFIXED_LOCALES) {
    if (path === `/${locale}` || path === `/${locale}/`) return '/'
    if (path.startsWith(`/${locale}/`)) return path.slice(`/${locale}`.length)
  }
  return path
}

/** Drops query and hash: `?tag=`/`?foto=` are views of a page, not pages. */
export function pagePath(path: string): string {
  return path.split(/[?#]/)[0] ?? path
}

/** The same page in another locale. Accepts a path from either tree. */
export function localePath(path: string, locale: Locale): string {
  const base = stripLocale(path)
  if (locale === DEFAULT_LOCALE) return base
  return base === '/' ? `/${locale}` : `/${locale}${base}`
}

export interface LocaleLink {
  locale: Locale
  /** BCP-47 tag, for `lang`/`hreflang`. */
  tag: string
  /** Endonym, as shown in the switch. */
  name: string
  to: string
  active: boolean
}

/** The language switch: one link per locale, on the same page. */
export function localeLinks(path: string, current: Locale): LocaleLink[] {
  // A guard: every caller passes `route.path`, which carries no query or hash.
  const base = pagePath(path)
  return LOCALES.map((locale) => ({
    locale,
    tag: LOCALE_TAGS[locale],
    name: LOCALE_NAMES[locale],
    to: localePath(base, locale),
    active: locale === current,
  }))
}
