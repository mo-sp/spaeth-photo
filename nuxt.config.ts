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
    },
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/fonts.css', '~/assets/css/base.css'],

  compatibilityDate: '2026-08-29',

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
})
