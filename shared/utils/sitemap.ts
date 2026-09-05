import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale, localePath } from './i18n.ts'
import { photoTitle } from './photos.ts'
import { TAG_ORDER } from './tags.ts'
import { absoluteUrl } from './url.ts'

/**
 * The builders behind `server/routes/sitemap.xml.ts`. They live here because
 * escaping, `lastmod` and the widest-JPEG pick are the parts worth testing, and
 * a Nitro route is not directly testable.
 */

/** The subset of the client index the sitemap reads. */
export interface SitemapPhoto {
  slug: string
  title: string
  titleDe?: string
  date: string
  tags: string[]
  variants: { jpeg: number[] }
}

export interface SitemapEntry {
  /** English, unprefixed path; one `<url>` per locale is derived from it. */
  path: string
  lastmod?: string
  /** Site-relative image paths, for the sitemap image extension. */
  images?: string[]
  /** `<image:title>` per locale. */
  imageTitles?: Record<Locale, string>
}

/**
 * `lastmod` is the photo's capture date. For the pages that list photos it is
 * the newest date they show: those pages really do change when a photo is added.
 */
export function newest(list: readonly SitemapPhoto[]): string | undefined {
  return list
    .map((photo) => photo.date)
    .sort()
    .at(-1)
}

/**
 * The crawler is pointed at the widest JPEG variant, not the AVIF/WebP ones and
 * not the OG crop: JPEG is the format every crawler reads, and the OG crop is a
 * 1200x630 cut of the photo, not the photo.
 */
export function photoImage(photo: SitemapPhoto): string[] {
  const width = photo.variants.jpeg.at(-1)
  return width === undefined ? [] : [`/img/${photo.slug}/${width}.jpg`]
}

/**
 * `/about`, `/legal-notice` and `/privacy` are absent on purpose: they carry
 * `hasPlaceholders`, which makes them `noindex`, and a noindex page in a
 * sitemap asks a crawler to fetch what it was just asked not to index.
 */
export function sitemapEntries(photos: readonly SitemapPhoto[]): SitemapEntry[] {
  const tags = TAG_ORDER.filter((tag) => photos.some((photo) => photo.tags.includes(tag)))
  return [
    { path: '/', lastmod: newest(photos) },
    { path: '/gallery', lastmod: newest(photos) },
    ...tags.map((tag) => {
      const filtered = photos.filter((photo) => photo.tags.includes(tag))
      return { path: `/gallery/${tag}`, lastmod: newest(filtered) }
    }),
    // A photo page is the one canonical place its image lives, so that is where
    // the image extension names it. Repeating every image on the gallery pages
    // would claim as many canonical pages for each of them.
    ...photos.map((photo) => ({
      path: `/photo/${photo.slug}`,
      lastmod: photo.date,
      images: photoImage(photo),
      imageTitles: {
        en: photoTitle(photo, 'en'),
        de: photoTitle(photo, 'de'),
      },
    })),
  ]
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

/** One `<url>` per locale, each listing every locale as an alternate. */
export function urlElement(siteUrl: string, entry: SitemapEntry, locale: Locale): string {
  const lines = [
    `    <loc>${xmlEscape(absoluteUrl(siteUrl, localePath(entry.path, locale)))}</loc>`,
  ]
  if (entry.lastmod !== undefined) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
  for (const code of LOCALES) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAGS[code]}" ` +
        `href="${xmlEscape(absoluteUrl(siteUrl, localePath(entry.path, code)))}" />`,
    )
  }
  lines.push(
    '    <xhtml:link rel="alternate" hreflang="x-default" ' +
      `href="${xmlEscape(absoluteUrl(siteUrl, localePath(entry.path, DEFAULT_LOCALE)))}" />`,
  )
  for (const image of entry.images ?? []) {
    lines.push(
      '    <image:image>',
      `      <image:loc>${xmlEscape(absoluteUrl(siteUrl, image))}</image:loc>`,
    )
    const title = entry.imageTitles?.[locale]
    if (title !== undefined) lines.push(`      <image:title>${xmlEscape(title)}</image:title>`)
    lines.push('    </image:image>')
  }
  // No <changefreq> and no <priority>: Google ignores both, and a number nobody
  // acts on is a number that quietly goes stale.
  return `  <url>\n${lines.join('\n')}\n  </url>`
}

/** The empty but well-formed document emitted when there is no site URL. */
export const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<!-- empty: NUXT_PUBLIC_SITE_URL was not set at build time -->\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />\n'

export function buildSitemap(siteUrl: string, photos: readonly SitemapPhoto[]): string {
  const urls = sitemapEntries(photos).flatMap((entry) =>
    LOCALES.map((locale) => urlElement(siteUrl, entry, locale)),
  )
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${urls.join('\n')}\n` +
    '</urlset>\n'
  )
}
