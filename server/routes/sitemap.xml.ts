import index from '../../app/data/photos.index.json'
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
  date: string
  tags: string[]
  variants: { jpeg: number[] }
}

interface Entry {
  path: string
  lastmod?: string
  /** Site-relative image paths, for the sitemap image extension. */
  images?: string[]
}

const photos = (index as { photos: IndexPhoto[] }).photos

/**
 * `lastmod` is the photo's capture date, per the P4-P6 ruling. For the pages
 * that list photos it is the newest date they show: those pages really do
 * change when a photo is added.
 *
 * The three text pages deliberately carry no `lastmod`. The only date
 * available would be the build time, and a rebuild does not change their
 * wording — a crawler that trusted it would recrawl them for nothing. The
 * element is optional; an absent one is honest, a wrong one is not.
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

function entries(): Entry[] {
  const tags = TAG_ORDER.filter((tag) => photos.some((photo) => photo.tags.includes(tag)))
  return [
    { path: '/', lastmod: newest(photos) },
    { path: '/galerie', lastmod: newest(photos) },
    ...tags.map((tag) => {
      const filtered = photos.filter((photo) => photo.tags.includes(tag))
      return { path: `/galerie/${tag}`, lastmod: newest(filtered) }
    }),
    // Each photo page is the one canonical place its image lives, so that is
    // where the image extension names it. Repeating all 26 images on the
    // gallery pages would claim 26 canonical pages for each of them.
    ...photos.map((photo) => ({
      path: `/foto/${photo.slug}`,
      lastmod: photo.date,
      images: photoImage(photo),
    })),
    { path: '/ueber' },
    { path: '/impressum' },
    { path: '/datenschutz' },
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

function urlElement(siteUrl: string, entry: Entry): string {
  const lines = [`    <loc>${xml(absoluteUrl(siteUrl, entry.path))}</loc>`]
  if (entry.lastmod !== undefined) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
  for (const image of entry.images ?? []) {
    lines.push(
      '    <image:image>',
      `      <image:loc>${xml(absoluteUrl(siteUrl, image))}</image:loc>`,
      '    </image:image>',
    )
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

  const urls = entries().map((entry) => urlElement(siteUrl, entry))
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    `${urls.join('\n')}\n` +
    '</urlset>\n'
  )
})
