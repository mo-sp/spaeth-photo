import index from '../../app/data/photos.index.json'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  localePath,
  type Locale,
} from '../../shared/utils/i18n.ts'
import { TAG_ORDER } from '../../shared/utils/tags.ts'
import { absoluteUrl } from '../../shared/utils/url.ts'

/**
 * sitemap.xml, generated at prerender time.
 *
 * It is a Nitro route rather than a file in `public/` because the URLs inside
 * it have to be absolute, and the host only becomes known when
 * `NUXT_PUBLIC_SITE_URL` is set for the build. A static file could not do that.
 *
 * The explicit `content-type` is what makes the prerenderer write
 * `sitemap.xml`; with the default `text/html` it would file the response under
 * `sitemap.xml/index.html`, which serves fine but is not the URL robots.txt
 * points at.
 */

interface IndexPhoto {
  slug: string
  title: string
  titleDe?: string
  date: string
  tags: string[]
  variants: { jpeg: number[] }
}

interface Entry {
  /** English, unprefixed path; one `<url>` per locale is derived from it. */
  path: string
  lastmod?: string
  /** Site-relative image paths, for the sitemap image extension. */
  images?: string[]
  /** `<image:title>` per locale. */
  imageTitles?: Record<Locale, string>
}

const photos = (index as { photos: IndexPhoto[] }).photos

/**
 * `lastmod` is the photo's capture date, per the P4-P6 ruling. For the pages
 * that list photos it is the newest date they show: those pages really do
 * change when a photo is added.
 *
 * The three text pages carry no `lastmod` — and no `<url>` at all while they
 * are drafts, see below.
 */
function newest(list: readonly IndexPhoto[]): string | undefined {
  return list.map((photo) => photo.date).sort().at(-1)
}

/**
 * The image the crawler is pointed at is the widest JPEG variant, not the
 * AVIF/WebP ones and not the OG crop: JPEG is the format every crawler can
 * read, and it is the same file a browser without AVIF/WebP support gets.
 * The OG crop is a 1200x630 cut of the photo, not the photo.
 */
function photoImage(photo: IndexPhoto): string[] {
  const width = photo.variants.jpeg.at(-1)
  return width === undefined ? [] : [`/img/${photo.slug}/${width}.jpg`]
}

/**
 * `/about`, `/legal-notice` and `/privacy` are missing on purpose: they carry
 * `hasPlaceholders`, which makes them `noindex`, and a noindex page in a
 * sitemap is a request to crawl a page one has just asked not to index.
 */
function entries(): Entry[] {
  const tags = TAG_ORDER.filter((tag) => photos.some((photo) => photo.tags.includes(tag)))
  return [
    { path: '/', lastmod: newest(photos) },
    { path: '/gallery', lastmod: newest(photos) },
    ...tags.map((tag) => {
      const filtered = photos.filter((photo) => photo.tags.includes(tag))
      return { path: `/gallery/${tag}`, lastmod: newest(filtered) }
    }),
    // Each photo page is the one canonical place its image lives, so that is
    // where the image extension names it. Repeating all 26 images on the
    // gallery pages would claim 26 canonical pages for each of them.
    ...photos.map((photo) => ({
      path: `/photo/${photo.slug}`,
      lastmod: photo.date,
      images: photoImage(photo),
      imageTitles: {
        en: photo.title,
        de: photo.titleDe ?? photo.title,
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

function xml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

/** One `<url>` per locale, each listing every locale as an alternate. */
function urlElement(siteUrl: string, entry: Entry, locale: Locale): string {
  const lines = [`    <loc>${xml(absoluteUrl(siteUrl, localePath(entry.path, locale)))}</loc>`]
  if (entry.lastmod !== undefined) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
  for (const code of LOCALES) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAGS[code]}" ` +
        `href="${xml(absoluteUrl(siteUrl, localePath(entry.path, code)))}" />`,
    )
  }
  lines.push(
    '    <xhtml:link rel="alternate" hreflang="x-default" ' +
      `href="${xml(absoluteUrl(siteUrl, localePath(entry.path, DEFAULT_LOCALE)))}" />`,
  )
  for (const image of entry.images ?? []) {
    lines.push(
      '    <image:image>',
      `      <image:loc>${xml(absoluteUrl(siteUrl, image))}</image:loc>`,
    )
    const title = entry.imageTitles?.[locale]
    if (title !== undefined) lines.push(`      <image:title>${xml(title)}</image:title>`)
    lines.push('    </image:image>')
  }
  // No <changefreq> and no <priority>: Google ignores both, and a number
  // nobody acts on is a number that quietly goes stale.
  return `  <url>\n${lines.join('\n')}\n  </url>`
}

export default defineEventHandler((event) => {
  // Without this header the prerenderer treats the response as HTML and
  // writes it to sitemap.xml/index.html.
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  const siteUrl = useRuntimeConfig(event).public.siteUrl

  /*
   * A sitemap has to carry absolute URLs; relative ones make it invalid.
   * Without `NUXT_PUBLIC_SITE_URL` there is no host to build them from, so the
   * file is emitted empty but well-formed, and the build says why. Guessing a
   * domain would put wrong URLs in front of a crawler, and failing the build
   * would break the promise that a clone without the private content builds.
   */
  if (siteUrl.trim() === '') {
    console.warn(
      '[sitemap] NUXT_PUBLIC_SITE_URL is not set - emitting an empty sitemap.\n' +
        '          Set it as a build variable to list the pages of this site.',
    )
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!-- empty: NUXT_PUBLIC_SITE_URL was not set at build time -->\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />\n'
    )
  }

  const urls = entries().flatMap((entry) =>
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
})
