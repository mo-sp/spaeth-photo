import type { VariantFormat } from '../types/photo.ts'

/**
 * Image URLs are a convention, not data: `/img/<slug>/<width>.<ext>`. The
 * manifest therefore stores only the widths rendered per format, which keeps
 * the client index about two thirds smaller than spelled-out paths.
 */
export const VARIANT_EXTENSION: Record<VariantFormat, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
}

/** A photo's base directory below the site root. */
export function photoDirUrl(slug: string): string {
  return `/img/${slug}`
}

/** `/img/hafen-am-morgen/960.avif` */
export function variantUrl(slug: string, width: number, format: VariantFormat): string {
  return `${photoDirUrl(slug)}/${width}.${VARIANT_EXTENSION[format]}`
}

/**
 * Size of the OpenGraph crop. The pipeline renders every `og.jpg` at exactly
 * these dimensions, so `og:image:width`/`height` in the head are a fact.
 */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** A photo's OpenGraph image, 1200×630. */
export function ogUrl(slug: string): string {
  return `${photoDirUrl(slug)}/og.jpg`
}
