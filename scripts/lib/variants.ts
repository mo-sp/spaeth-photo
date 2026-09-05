import { mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  OG_HEIGHT,
  OG_WIDTH,
  VARIANT_EXTENSION,
  ogUrl,
  variantUrl,
} from '../../shared/constants/images.ts'
import type {
  ManifestFile,
  Orientation,
  PhotoVariants,
  VariantFormat,
} from '../../shared/types/photo.ts'

/**
 * Delivery variants of one photo. No `toColorspace`, `keepMetadata` or
 * `withMetadata` on purpose: the web sources are sRGB-tagged and a profileless
 * output means sRGB to every browser, while an embedded profile would add
 * roughly 500 bytes per file without changing the result.
 */

export const BASE_WIDTHS = [480, 960, 1600, 2560] as const
export type BaseWidth = (typeof BASE_WIDTHS)[number]

/** JPEG is only the fallback for browsers without AVIF and WebP — two steps suffice. */
export const JPEG_WIDTHS: readonly number[] = [960, 1600]

/**
 * Start quality per step. It falls with width because a large image needs fewer
 * bits per pixel to look equally good: the layout scales it up less often.
 */
export const AVIF_QUALITY: Record<BaseWidth, number> = { 480: 60, 960: 57, 1600: 54, 2560: 52 }
export const WEBP_QUALITY: Record<BaseWidth, number> = { 480: 76, 960: 75, 1600: 74, 2560: 72 }

/**
 * Ceiling per step in kilobytes, measured on a 3:2 landscape. Exceeding it
 * lowers the quality in steps of five down to the floor; the clamp only bites
 * on images that are pathological for the encoder (foliage, waves, noise).
 */
export const AVIF_BUDGET_KB: Record<BaseWidth, number> = { 480: 20, 960: 48, 1600: 95, 2560: 190 }

/** WebP needs more room than AVIF for the same result. */
export const WEBP_BUDGET_FACTOR = 1.35

export const QUALITY_STEP = 5
export const AVIF_MIN_QUALITY = 38
/** WebP breaks into visible blocks below about 60, where AVIF still holds up. */
export const WEBP_MIN_QUALITY = 60

export interface SharpenSettings {
  sigma: number
  m1: number
  m2: number
}

/**
 * Downscaling costs sharpness, the more the stronger it is. The largest step
 * gets none: it is shown almost 1:1 on large screens, where sharpening would
 * show up as a halo.
 */
export const SHARPEN: Record<BaseWidth, SharpenSettings | null> = {
  480: { sigma: 0.6, m1: 0.3, m2: 1.6 },
  960: { sigma: 0.6, m1: 0.3, m2: 1.6 },
  1600: { sigma: 0.5, m1: 0.2, m2: 1.2 },
  2560: null,
}

export const OG_QUALITY = 80

export const LQIP_WIDTH = 20
export const LQIP_QUALITY = 35

export const JPEG_QUALITY = 82

/**
 * Everything that determines how the outputs look. The hash of this object
 * (plus the libvips version) is in the cache, so changing a number here
 * re-renders everything without anyone having to remember.
 */
export const RENDER = {
  // 2: JPEG fallback for sources under 960 px too, quality clamped to the
  // floor, `.autoOrient()` before downscaling.
  version: 2,
  baseWidths: BASE_WIDTHS,
  jpegWidths: JPEG_WIDTHS,
  avifQuality: AVIF_QUALITY,
  avifBudgetKb: AVIF_BUDGET_KB,
  avifMinQuality: AVIF_MIN_QUALITY,
  avifEffort: 3,
  avifBitdepth: 10,
  webpQuality: WEBP_QUALITY,
  webpBudgetFactor: WEBP_BUDGET_FACTOR,
  webpMinQuality: WEBP_MIN_QUALITY,
  webpEffort: 5,
  jpegQuality: JPEG_QUALITY,
  qualityStep: QUALITY_STEP,
  sharpen: SHARPEN,
  og: { width: OG_WIDTH, height: OG_HEIGHT, quality: OG_QUALITY },
  lqip: { width: LQIP_WIDTH, quality: LQIP_QUALITY },
} as const

/**
 * The widths actually generated for an image. Never larger than the source
 * (upscaling is forbidden); a source above the last regular step contributes
 * its native width. That is the portrait case: a 2560 px tall portrait is only
 * about 1707 px wide and would otherwise top out at 1600 px.
 */
export function widthLadder(sourceWidth: number): number[] {
  const widths = BASE_WIDTHS.filter((width) => width <= sourceWidth) as number[]
  const largest = widths.at(-1) ?? 0
  // 32 px apart, so two practically identical steps cannot arise.
  if (sourceWidth - largest >= 32) widths.push(sourceWidth)
  if (widths.length === 0) widths.push(sourceWidth)
  return widths
}

/**
 * The widths produced as JPEG: normally 960 and 1600, but if the source is
 * narrower than 960 px the largest generated step up to 1600 px steps in.
 * Without that, `variants.jpeg` stays empty and the `<img>` has no `src`.
 */
export function jpegWidthsFor(widths: readonly number[]): number[] {
  const regular = widths.filter((width) => JPEG_WIDTHS.includes(width))
  if (regular.length > 0) return regular
  const fallback = widths.filter((width) => width <= 1600).at(-1)
  return fallback === undefined ? [] : [fallback]
}

/** The regular step whose settings apply to a generated width. */
export function stepFor(width: number): BaseWidth {
  for (const base of BASE_WIDTHS) if (width <= base) return base
  return 2560
}

export function sharpenFor(width: number, largestWidth: number): SharpenSettings | null {
  if (width >= largestWidth) return null
  return SHARPEN[stepFor(width)]
}

/**
 * Budget in bytes for one variant. The table values are measured on a 3:2
 * landscape; a portrait has far more pixels at the same width and gets
 * proportionally more room, or the clamp would bite it constantly.
 */
export function budgetBytes(width: number, height: number, factor = 1): number {
  const step = stepFor(width)
  const reference = (step * step) / 1.5
  return Math.round(AVIF_BUDGET_KB[step] * 1024 * factor * ((width * height) / reference))
}

export interface RenderResult {
  sourceWidth: number
  sourceHeight: number
  sourceBytes: number
  width: number
  height: number
  aspectRatio: number
  orientation: Orientation
  color: string
  lqip: string
  variants: PhotoVariants
  files: ManifestFile[]
  ogFile: ManifestFile
  totalBytes: number
  /** Number of actual encodes — shows how often the budget clamp bit. */
  encodes: number
}

function orientationOf(width: number, height: number): Orientation {
  if (width > height) return 'landscape'
  if (width < height) return 'portrait'
  return 'square'
}

function hex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
}

/** Average colour over all pixels, as `#rrggbb`. */
export async function averageColor(file: string): Promise<string> {
  const stats = await sharp(file).stats()
  const [r, g, b] = stats.channels
  if (!r || !g || !b) return '#808080'
  return `#${hex(r.mean)}${hex(g.mean)}${hex(b.mean)}`
}

/**
 * 20 px wide WebP as a data URI — not the planned 24: below that the preview
 * loses its shape, above it the index grows noticeably, and every byte here
 * sits in the HTML of every page the image appears on.
 */
export async function makeLqip(file: string): Promise<string> {
  const buffer = await sharp(file)
    .autoOrient()
    .resize({ width: LQIP_WIDTH, kernel: 'lanczos3' })
    .webp({ quality: LQIP_QUALITY, effort: 6 })
    .toBuffer()
  return `data:image/webp;base64,${buffer.toString('base64')}`
}

interface EncodeAttempt {
  buffer: Buffer
  quality: number
  encodes: number
}

/**
 * Encodes at the start quality and lowers it in steps of five while the result
 * exceeds the budget. The last step is clamped to the floor rather than
 * abandoned: no ladder of fives off the start values ever lands on 38.
 */
async function encodeWithinBudget(
  encode: (quality: number) => Promise<Buffer>,
  startQuality: number,
  minQuality: number,
  budget: number,
): Promise<EncodeAttempt> {
  let quality = startQuality
  let buffer = await encode(quality)
  let encodes = 1
  while (buffer.length > budget && quality > minQuality) {
    quality = Math.max(minQuality, quality - QUALITY_STEP)
    buffer = await encode(quality)
    encodes += 1
  }
  return { buffer, quality, encodes }
}

export interface RenderOptions {
  sourceFile: string
  slug: string
  /** Output directory of this photo, usually `public/img/<slug>`. */
  outDir: string
  write: (file: string, data: Buffer) => Promise<void>
}

export async function renderPhoto(options: RenderOptions): Promise<RenderResult> {
  const { sourceFile, slug, outDir, write } = options

  const metadata = await sharp(sourceFile, { failOn: 'error' }).metadata()
  // `.autoOrient()` is a no-op for the web sources from `export-sources`, which
  // are already rotated. For anything else — a hand-placed image, a test
  // fixture — dimensions and pixels would otherwise be crossed.
  const rotated = (metadata.orientation ?? 1) >= 5
  const sourceWidth = rotated ? metadata.height : metadata.width
  const sourceHeight = rotated ? metadata.width : metadata.height
  const sourceBytes = statSync(sourceFile).size

  const widths = widthLadder(sourceWidth)
  const largest = widths.at(-1) ?? sourceWidth
  const jpegWidths = new Set(jpegWidthsFor(widths))

  mkdirSync(outDir, { recursive: true })

  const files: ManifestFile[] = []
  const variants: PhotoVariants = { avif: [], webp: [], jpeg: [] }
  let encodes = 0
  let width = 0
  let height = 0

  const record = async (format: VariantFormat, w: number, h: number, buffer: Buffer) => {
    const file = path.join(outDir, `${w}.${VARIANT_EXTENSION[format]}`)
    await write(file, buffer)
    files.push({
      format,
      width: w,
      height: h,
      path: variantUrl(slug, w, format),
      bytes: buffer.length,
    })
    variants[format].push(w)
  }

  for (const targetWidth of widths) {
    // Resize once, then encode all formats from the same raw image: the three
    // encoders are guaranteed identical pixels, and the expensive scaling
    // happens once per width.
    let pipeline = sharp(sourceFile, { failOn: 'error' }).autoOrient().resize({
      width: targetWidth,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    const sharpen = sharpenFor(targetWidth, largest)
    if (sharpen) pipeline = pipeline.sharpen(sharpen)

    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })
    const raw = { width: info.width, height: info.height, channels: info.channels }
    const from = () => sharp(data, { raw })

    if (info.width > width) {
      width = info.width
      height = info.height
    }

    const avif = await encodeWithinBudget(
      (quality) =>
        from()
          .avif({ quality, effort: RENDER.avifEffort, chromaSubsampling: '4:4:4', bitdepth: 10 })
          .toBuffer(),
      AVIF_QUALITY[stepFor(targetWidth)],
      AVIF_MIN_QUALITY,
      budgetBytes(info.width, info.height),
    )
    encodes += avif.encodes
    await record('avif', info.width, info.height, avif.buffer)

    const webp = await encodeWithinBudget(
      (quality) =>
        from().webp({ quality, effort: RENDER.webpEffort, smartSubsample: true }).toBuffer(),
      WEBP_QUALITY[stepFor(targetWidth)],
      WEBP_MIN_QUALITY,
      budgetBytes(info.width, info.height, WEBP_BUDGET_FACTOR),
    )
    encodes += webp.encodes
    await record('webp', info.width, info.height, webp.buffer)

    if (jpegWidths.has(targetWidth)) {
      const jpeg = await from()
        .jpeg({
          quality: JPEG_QUALITY,
          chromaSubsampling: '4:4:4',
          mozjpeg: true,
          progressive: true,
        })
        .toBuffer()
      encodes += 1
      await record('jpeg', info.width, info.height, jpeg)
    }
  }

  const ogBuffer = await sharp(sourceFile, { failOn: 'error' })
    .autoOrient()
    .resize(OG_WIDTH, OG_HEIGHT, {
      fit: 'cover',
      // Not a centre crop: `attention` finds the region with the highest
      // saturation and edge density. With a horizon in the lower third, a
      // centred cut would hit nothing but sky.
      position: 'attention',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .jpeg({ quality: OG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })
  encodes += 1
  const ogFile: ManifestFile = {
    format: 'jpeg',
    width: ogBuffer.info.width,
    height: ogBuffer.info.height,
    path: ogUrl(slug),
    bytes: ogBuffer.data.length,
  }
  await write(path.join(outDir, 'og.jpg'), ogBuffer.data)

  const [color, lqip] = await Promise.all([averageColor(sourceFile), makeLqip(sourceFile)])

  return {
    sourceWidth,
    sourceHeight,
    sourceBytes,
    width,
    height,
    aspectRatio: Number((width / height).toFixed(6)),
    orientation: orientationOf(width, height),
    color,
    lqip,
    variants,
    files,
    ogFile,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) + ogFile.bytes,
    encodes,
  }
}
