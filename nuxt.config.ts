import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Prerender-Routen aus dem generierten Client-Index.
 *
 * `crawlLinks` findet die Detailseiten zwar über die Galerie, aber nur wenn
 * jede Kachel als `<a href>` im HTML steht — diese Liste macht das Prerendering
 * unabhängig davon, wie die Galerie später verlinkt. Fehlt der Index (fremder
 * Clone vor dem ersten `build-images`), wird gewarnt statt abgebrochen: die
 * npm-Skripte rufen `build-images` vorher auf, und ein harter Fehler an dieser
 * Stelle wäre für den Fehlerfall die falsche Reihenfolge.
 */
function indexRoutes(): string[] {
  const file = fileURLToPath(new URL('./app/data/photos.index.json', import.meta.url))
  if (!existsSync(file)) {
    console.warn(
      '[nuxt.config] app/data/photos.index.json fehlt — erst `pnpm build-images` laufen lassen',
    )
    return []
  }
  const index = JSON.parse(readFileSync(file, 'utf8')) as {
    photos: Array<{ slug: string }>
    tags: Array<{ tag: string }>
  }
  return [
    ...index.photos.map((photo) => `/foto/${photo.slug}`),
    ...index.tags.map((entry) => `/galerie/${entry.tag}`),
  ]
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
      htmlAttrs: { lang: 'de' },
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
    // Macht `definePageMeta({ aside })` zur Buildzeit auslesbar, damit das
    // Layout den Sidebar-Inhalt ohne Teleport und ohne Store wählen kann.
    extraPageMetaExtractionKeys: ['aside'],
  },

  compatibilityDate: '2026-08-29',

  nitro: {
    prerender: {
      crawlLinks: true,
      // Ein Build, der eine kaputte Route stillschweigend überspringt, liefert
      // eine Seite mit Löchern aus.
      failOnError: true,
      // Query-Varianten (`?foto=…`) sind derselbe Inhalt; sie zu prerendern
      // würde Dateien mit Fragezeichen im Namen erzeugen.
      ignore: [/\?/],
      routes: ['/', ...indexRoutes()],
    },
  },
})
