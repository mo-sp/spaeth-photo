import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BRAND_NAME } from './shared/constants/brand.ts'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  PREFIXED_LOCALES,
  localePath,
} from './shared/utils/i18n.ts'
import { THEME_INIT_SCRIPT } from './shared/utils/theme.ts'
import { VIDEO_FILES } from './shared/utils/video.ts'

const VIDEO_DIR = fileURLToPath(new URL('./content/video', import.meta.url))

/**
 * The background clip, or `''` when there is none. Like the photographs it
 * comes from the private `content/` submodule, and like them its absence is
 * not an error: without a clip the home page keeps its hero photograph.
 *
 * A directory counts only once it holds a poster, so a half-finished encode
 * does not reach the build. The first one wins, alphabetically, because the
 * start page shows exactly one.
 */
function videoSlug(): string {
  if (!existsSync(VIDEO_DIR)) return ''
  const found = readdirSync(VIDEO_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(`${VIDEO_DIR}/${entry.name}/${VIDEO_FILES.poster}`),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'))
  return found[0] ?? ''
}

const videoSlugValue = videoSlug()

/**
 * Every route of the site in its canonical (English, unprefixed) form.
 *
 * `crawlLinks` finds the detail pages through the gallery, but only as long as
 * every tile is an `<a href>` in the HTML — this list makes prerendering
 * independent of how the gallery happens to link. If the index is missing (a
 * fresh clone before the first `build-images`), the build warns instead of
 * failing: the npm scripts run `build-images` first, and a hard error here
 * would be the wrong order of events for the case it is meant to catch.
 */
function baseRoutes(): string[] {
  const file = fileURLToPath(new URL('./app/data/photos.index.json', import.meta.url))
  const fixed = ['/', '/gallery', '/about', '/legal-notice', '/privacy']
  if (!existsSync(file)) {
    console.warn(
      '[nuxt.config] app/data/photos.index.json is missing - run `pnpm build-images` first',
    )
    return fixed
  }
  const index = JSON.parse(readFileSync(file, 'utf8')) as {
    photos: Array<{ slug: string }>
    tags: Array<{ tag: string }>
  }
  return [
    ...fixed,
    ...index.tags.map((entry) => `/gallery/${entry.tag}`),
    ...index.photos.map((photo) => `/photo/${photo.slug}`),
  ]
}

/** Both trees; the German one is reachable only via the language switch. */
function prerenderRoutes(): string[] {
  return baseRoutes().flatMap((route) => LOCALES.map((locale) => localePath(route, locale)))
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],

  // Prerendering requires it; phase 1 deploys `.output/public`, not a server.
  ssr: true,

  devtools: { enabled: false },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: `%s – ${BRAND_NAME}`,
      // The one inline script on the site. It applies a stored theme before the
      // first paint, which no component can do on a prerendered page: by the
      // time Vue hydrates, the other palette has already been on screen.
      script: [{ innerHTML: THEME_INIT_SCRIPT, tagPosition: 'head' }],
      // Defaults for the shells that have no route: `.output/public/404.html`
      // is served by the host for any unknown path and 200.html is the SPA
      // fallback; both would otherwise be untitled, language-less and
      // indexable. Every real page overrides all three. The title is the bare
      // word because `titleTemplate` appends the name.
      htmlAttrs: { lang: LOCALE_TAGS[DEFAULT_LOCALE] },
      title: 'Photography',
      meta: [{ name: 'robots', content: 'noindex' }],
    },
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/fonts.css', '~/assets/css/base.css'],

  runtimeConfig: {
    public: {
      // Absolute URLs for OpenGraph and sitemap.xml. A *build* variable: a
      // static site has nobody left at runtime to substitute it.
      siteUrl: '',
      // Slug of the background clip, empty when `content/video/` holds none.
      // Read at build time for the same reason: there is no server to ask.
      videoSlug: videoSlugValue,
    },
  },

  experimental: {
    // The client index is already in the JS bundle; without this Nuxt would
    // ship the rendered data a second time as a payload.
    payloadExtraction: 'client',
    defaults: {
      // Prefetch on visibility would pull every detail page at once in a
      // 26-tile gallery; hover/focus is evidence of intent.
      nuxtLink: { prefetchOn: { visibility: false, interaction: true } },
    },
    // Makes both keys readable at build time, so the layout picks sidebar
    // content and robots meta without a teleport or a store.
    extraPageMetaExtractionKeys: ['aside', 'hasPlaceholders'],
  },

  compatibilityDate: '2026-08-29',

  hooks: {
    /**
     * The German route tree, cloned from the resolved English pages so every
     * `definePageMeta` key survives. A second `app/pages/de/` directory would
     * duplicate 6 files, and a runtime `router.options.ts` would not prerender.
     */
    'pages:extend'(pages) {
      // Child routes keep their parent's name, so only the top-level name is
      // prefixed; there are no nested pages today, and a duplicate child name
      // would surface as a vue-router warning if that changed.
      const clone = (page: (typeof pages)[number], locale: string): (typeof pages)[number] => ({
        ...page,
        path: page.path === '/' ? `/${locale}` : `/${locale}${page.path}`,
        name: page.name === undefined ? undefined : `${locale}-${page.name}`,
        children: page.children?.map((child) => ({ ...child })),
      })

      for (const locale of PREFIXED_LOCALES) {
        // Snapshot: pushing into the array being iterated would clone clones.
        const originals = [...pages]
        pages.push(...originals.map((page) => clone(page, locale)))
      }
    },
  },

  nitro: {
    /**
     * The renditions are served from `/video/` straight out of the content
     * repo. A second public directory rather than a copy into `public/`: the
     * files are generated artefacts that must never enter this repository, and
     * Nitro copies them into `.output/public` at build time just like `public/`.
     */
    publicAssets:
      videoSlugValue === '' ? [] : [{ dir: VIDEO_DIR, baseURL: '/video', maxAge: 60 * 60 * 24 }],

    prerender: {
      crawlLinks: true,
      // A build that silently skips a broken route ships a site with holes.
      failOnError: true,
      // Query views (`?tag=…`) are the same content, and prerendering them
      // would create files with a question mark in the name.
      ignore: [/\?/],
      // sitemap.xml and robots.txt are Nitro routes (server/routes/), not
      // files in public/: both need the absolute site URL, which only exists
      // once NUXT_PUBLIC_SITE_URL is set for the build. Nothing links to them,
      // so crawlLinks would never reach them.
      routes: ['/sitemap.xml', '/robots.txt', ...prerenderRoutes()],
    },
  },
})
