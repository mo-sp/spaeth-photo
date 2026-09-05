/**
 * Seitenspezifischer Sidebar-Inhalt.
 *
 * `definePageMeta({ aside: 'gallery' })` sagt dem Layout, was es in den
 * Sidebar-Slot rendern soll. Nuxt liest den Schlüssel dank
 * `experimental.extraPageMetaExtractionKeys` schon zur Buildzeit aus, die
 * Zuordnung steht also im statischen HTML — anders als bei einem Teleport, den
 * das SSG verwirft, oder einem Store, der beim Prerendern leer bleibt.
 */
declare module '#app' {
  interface PageMeta {
    aside?: 'gallery' | 'photo'
  }
}

export {}
