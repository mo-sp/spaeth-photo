import type { VariantFormat } from '../types/photo.ts'

/**
 * Bild-URLs stehen nicht im Manifest, sie ergeben sich aus einer Konvention:
 * `/img/<slug>/<breite>.<endung>`. Das Manifest speichert deshalb nur die
 * Liste der tatsächlich erzeugten Breiten je Format — das spart im
 * Client-Index rund zwei Drittel der Bytes gegenüber ausgeschriebenen Pfaden
 * und macht Umbenennungen zu einer Änderung an genau dieser Stelle.
 */
export const VARIANT_EXTENSION: Record<VariantFormat, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
}

/** Basisverzeichnis eines Fotos unterhalb der Site-Wurzel. */
export function photoDirUrl(slug: string): string {
  return `/img/${slug}`
}

/** `/img/hafen-am-morgen/960.avif` */
export function variantUrl(slug: string, width: number, format: VariantFormat): string {
  return `${photoDirUrl(slug)}/${width}.${VARIANT_EXTENSION[format]}`
}

/** `srcset`-Wert für ein Format: `"/img/x/480.avif 480w, /img/x/960.avif 960w"`. */
export function srcset(slug: string, widths: readonly number[], format: VariantFormat): string {
  return widths.map((width) => `${variantUrl(slug, width, format)} ${width}w`).join(', ')
}

/**
 * Size of the OpenGraph crop. The pipeline renders every `og.jpg` at exactly
 * these dimensions (`fit: cover`), so `og:image:width`/`height` in the page
 * head are a fact, not an estimate — and both sides read the same constant
 * instead of repeating the numbers.
 */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** OpenGraph-Bild eines Fotos, 1200×630. */
export function ogUrl(slug: string): string {
  return `${photoDirUrl(slug)}/og.jpg`
}
