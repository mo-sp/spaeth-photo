/**
 * Page-specific sidebar content. `experimental.extraPageMetaExtractionKeys`
 * makes Nuxt read the key at build time, so the assignment is in the static
 * HTML — unlike a teleport, which SSG discards.
 */
declare module '#app' {
  interface PageMeta {
    aside?: 'gallery' | 'photo'
    /**
     * The page still shows `TODO:` placeholders: `noindex, follow`, no sitemap
     * entry, no hreflang pair. Set by hand — scanning the text for the marker
     * word would catch a sentence about placeholders too.
     */
    hasPlaceholders?: boolean
  }
}

export {}
