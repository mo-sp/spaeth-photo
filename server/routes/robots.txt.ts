import { absoluteUrl } from '../../shared/utils/url.ts'

/**
 * robots.txt, generated at prerender time instead of sitting in `public/`.
 *
 * The reason is the `Sitemap:` line: the sitemaps protocol requires a full
 * URL there, and a static file cannot know the host. Either the line is
 * absolute and correct, or it is not written at all — a `Sitemap: /sitemap.xml`
 * would simply be ignored, which is the worst of the three outcomes because it
 * looks right.
 *
 * Everything else this file says is the same as before: nothing is
 * disallowed. There is no admin area, no search-result page and no duplicate
 * view to hide; `?tag=` and `?foto=` are query views of pages that are already
 * listed, and the canonical link on each page settles them.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  const siteUrl = useRuntimeConfig(event).public.siteUrl
  const lines = ['User-Agent: *', 'Disallow:']
  if (siteUrl.trim() !== '') {
    lines.push('', `Sitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}`)
  }
  return `${lines.join('\n')}\n`
})
