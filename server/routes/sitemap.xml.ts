import index from '../../app/data/photos.index.json'
import { EMPTY_SITEMAP, type SitemapPhoto, buildSitemap } from '../../shared/utils/sitemap.ts'

/**
 * sitemap.xml, generated at prerender time. It is a Nitro route rather than a
 * file in `public/` because its URLs have to be absolute, and the host only
 * becomes known when `NUXT_PUBLIC_SITE_URL` is set for the build.
 *
 * The builders live in `shared/utils/sitemap.ts`, where they are tested.
 */
const photos = (index as { photos: SitemapPhoto[] }).photos

export default defineEventHandler((event) => {
  // Without this header the prerenderer treats the response as HTML and writes
  // it to sitemap.xml/index.html.
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  const siteUrl = useRuntimeConfig(event).public.siteUrl

  /*
   * A sitemap has to carry absolute URLs; relative ones make it invalid.
   * Without a host the file is emitted empty but well-formed, and the build
   * says why: guessing a domain would put wrong URLs in front of a crawler, and
   * failing would break the promise that a clone without content still builds.
   */
  if (siteUrl.trim() === '') {
    console.warn(
      '[sitemap] NUXT_PUBLIC_SITE_URL is not set - emitting an empty sitemap.\n' +
        '          Set it as a build variable to list the pages of this site.',
    )
    return EMPTY_SITEMAP
  }

  return buildSitemap(siteUrl, photos)
})
