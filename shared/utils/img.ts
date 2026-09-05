import type { PhotoIndexEntry, VariantFormat } from '../types/photo.ts'
import { variantUrl } from '../constants/images.ts'

/**
 * Index entry to `<picture>`. A `srcset` is always built from the widths the
 * index records per format, never from a constant: portraits get different
 * steps than landscapes, and a promised step that does not exist is a 404.
 */

/** `<source>` order: the browser takes the first format it can decode. */
const SOURCE_FORMATS = ['avif', 'webp'] as const

export interface PhotoSource {
  type: string
  srcset: string
  /** Repeated on every `<source>`: without `sizes` the browser assumes 100vw. */
  sizes: string
}

/** `/img/hafen-am-morgen/960.avif` */
export function imgUrl(photo: PhotoIndexEntry, width: number, format: VariantFormat): string {
  return variantUrl(photo.slug, width, format)
}

/**
 * The deliverable widths of a format, ascending and optionally capped where the
 * layout already limits the display width. A cap below the smallest rendered
 * step still keeps that step — an empty `srcset` is a broken image.
 */
export function variantWidths(widths: readonly number[], variantMax?: number): number[] {
  const sorted = [...widths].sort((a, b) => a - b)
  if (sorted.length === 0) return []
  if (variantMax === undefined) return sorted
  const capped = sorted.filter((width) => width <= variantMax)
  return capped.length > 0 ? capped : [sorted[0]!]
}

/** `"/img/x/480.avif 480w, /img/x/960.avif 960w"`; empty if the format is absent. */
export function srcSet(photo: PhotoIndexEntry, format: VariantFormat, variantMax?: number): string {
  return variantWidths(photo.variants[format], variantMax)
    .map((width) => `${imgUrl(photo, width, format)} ${width}w`)
    .join(', ')
}

/** The `<source>` elements in order of preference. */
export function buildSources(
  photo: PhotoIndexEntry,
  sizes: string,
  variantMax?: number,
): PhotoSource[] {
  return SOURCE_FORMATS.filter((format) => photo.variants[format].length > 0).map((format) => ({
    type: `image/${format}`,
    srcset: srcSet(photo, format, variantMax),
    sizes,
  }))
}

/** Format of the `<img>` fallback: JPEG where it exists, otherwise WebP — never empty. */
export function fallbackFormat(photo: PhotoIndexEntry): VariantFormat {
  if (photo.variants.jpeg.length > 0) return 'jpeg'
  if (photo.variants.webp.length > 0) return 'webp'
  return 'avif'
}

/** Fallback `src`: the smallest rendered step, since only `srcset`-less browsers use it. */
export function fallbackSrc(photo: PhotoIndexEntry, variantMax?: number): string {
  const format = fallbackFormat(photo)
  const widths = variantWidths(photo.variants[format], variantMax)
  const width = widths[0]
  return width === undefined ? '' : imgUrl(photo, width, format)
}

/** Detail stage height in CSS px; mirrors `--detail-h` in `tokens.css`, which JS cannot read. Change both together. */
export const DETAIL_STAGE_H = 820

/**
 * Widest the detail image can ever render: `object-fit: contain` in an 820 px
 * box caps the width at `820 · aspectRatio` (a 0.67 portrait never exceeds
 * 547 px), which keeps `sizes` from over-promising on portraits.
 */
export function detailCap(aspectRatio: number): number {
  return Math.round(DETAIL_STAGE_H * aspectRatio)
}

/**
 * What the two 44 px stepper columns and their gaps take from the stage width
 * above 768 px; mirrors `--step-w` in `PhotoStepper.vue`. Below that breakpoint
 * the arrows sit under the image and the stage keeps the full width.
 */
const STEPPER_GUTTER = 2 * (44 + 8)

/**
 * Per-photo `sizes` for the detail image: below 768 px the stage is height-less
 * and the image is exactly 100vw, above it the content width minus the stepper
 * columns, capped at `detailCap`.
 */
export function detailSizes(aspectRatio: number): string {
  const cap = detailCap(aspectRatio)
  return [
    '(max-width: 767px) 100vw',
    `(max-width: 1023px) min(calc(100vw - ${180 + STEPPER_GUTTER}px), ${cap}px)`,
    `min(calc(100vw - ${220 + STEPPER_GUTTER}px), ${cap}px)`,
  ].join(', ')
}

/**
 * `srcset` cap for the detail image. Factor 2 because `sizes` is in CSS px and
 * the browser multiplies by device pixel ratio; the 1600 floor covers a phone
 * at 767 CSS px and 2× (~1534 px).
 */
export function detailVariantMax(aspectRatio: number): number {
  const MOBILE_MIN = 1600
  return Math.max(MOBILE_MIN, detailCap(aspectRatio) * 2)
}
