import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LOCALES, localePath } from './shared/utils/i18n.ts'

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
      '[nuxt.config] app/data/photos.index.json fehlt — erst `pnpm build-images` laufen lassen',
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

  // SSG: `nuxt generate` rendert alle über die Navigation erreichbaren Routen
  // vor. `ssr: true` ist dafür Voraussetzung; ein Nitro-Server wird in Phase 1
  // nicht deployed (Output ist `.output/public`).
  ssr: true,

  devtools: { enabled: false },

  app: {
    head: {
      // No `htmlAttrs.lang`: the layout sets it per route.
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s – Moritz Späth',
    },
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/fonts.css', '~/assets/css/base.css'],

  runtimeConfig: {
    public: {
      // Absolute URLs für OpenGraph und sitemap.xml (P7). In Coolify als
      // BUILD-Variable setzen — zur Laufzeit gibt es bei einer statischen Seite
      // niemanden mehr, der sie einsetzen könnte.
      siteUrl: '',
    },
  },

  experimental: {
    // Der Client-Index steckt bereits im JS-Bundle. Ohne diese Einstellung
    // legte Nuxt die im HTML gerenderten Daten ein zweites Mal als Payload
    // daneben. 'client' extrahiert die Payload nur für Client-Navigationen.
    payloadExtraction: 'client',
    defaults: {
      // Prefetch beim Sichtbarwerden lädt in einer Galerie mit 26 Kacheln
      // sofort jede Detailseite. Beim Hovern/Fokussieren ist die Absicht
      // belegt, und die Verzögerung bis zum Klick reicht aus.
      nuxtLink: { prefetchOn: { visibility: false, interaction: true } },
    },
    // Macht `definePageMeta({ aside, hasPlaceholders })` zur Buildzeit
    // auslesbar, damit das Layout Sidebar-Inhalt und robots-Meta ohne Teleport
    // und ohne Store wählen kann.
    extraPageMetaExtractionKeys: ['aside', 'hasPlaceholders'],
  },

  compatibilityDate: '2026-08-29',

  hooks: {
    /**
     * The German route tree, cloned from the English one.
     *
     * Cloning the *resolved* pages is what keeps `definePageMeta({ aside })`
     * and every other page meta key intact — a second directory under
     * `app/pages/de/` would need 26 duplicated files, and a `router.options.ts`
     * that rewrites paths at runtime would not prerender at all. The clone
     * shares the same component file, so a page is written once and rendered
     * twice.
     */
    'pages:extend'(pages) {
      const clone = (page: (typeof pages)[number], locale: string): (typeof pages)[number] => ({
        ...page,
        path: page.path === '/' ? `/${locale}` : `/${locale}${page.path}`,
        name: page.name === undefined ? undefined : `${locale}-${page.name}`,
        children: page.children?.map((child) => ({ ...child })),
      })

      for (const locale of LOCALES) {
        if (locale === 'en') continue
        // Snapshot: pushing into the array being iterated would clone clones.
        const originals = [...pages]
        pages.push(...originals.map((page) => clone(page, locale)))
      }
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      // Ein Build, der eine kaputte Route stillschweigend überspringt, liefert
      // eine Seite mit Löchern aus.
      failOnError: true,
      // Query-Varianten (`?foto=…`) sind derselbe Inhalt; sie zu prerendern
      // würde Dateien mit Fragezeichen im Namen erzeugen.
      ignore: [/\?/],
      // sitemap.xml and robots.txt are Nitro routes (server/routes/), not
      // files in public/: both need the absolute site URL, which only exists
      // once NUXT_PUBLIC_SITE_URL is set for the build. Nothing links to them,
      // so crawlLinks would never reach them.
      routes: ['/sitemap.xml', '/robots.txt', ...prerenderRoutes()],
    },
  },
})
