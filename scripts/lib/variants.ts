import { mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { VARIANT_EXTENSION, ogUrl, variantUrl } from '../../shared/constants/images.ts'
import type {
  ManifestFile,
  Orientation,
  PhotoVariants,
  VariantFormat,
} from '../../shared/types/photo.ts'

/**
 * Erzeugung der Auslieferungsvarianten eines Fotos.
 *
 * Farbmanagement: die Pipeline setzt bewusst **kein** `toColorspace`,
 * `keepMetadata` oder `withMetadata`. Die Web-Quellen sind sRGB-getaggt,
 * libvips rechnet intern korrekt und schreibt profillose Ausgaben — und
 * profillos heißt für jeden Browser sRGB. Ein mitgeschriebenes Profil würde
 * jede Datei um rund 500 Byte aufblähen, ohne das Ergebnis zu ändern. Der
 * Integrationstest `tests/integration/color.test.ts` hält das fest: ein reines
 * Rot muss am Ende der Kette 255,0,0 sein.
 */

export const BASE_WIDTHS = [480, 960, 1600, 2560] as const
export type BaseWidth = (typeof BASE_WIDTHS)[number]

/** JPEG ist nur der Notnagel für Browser ohne AVIF und WebP — zwei Stufen genügen. */
export const JPEG_WIDTHS: readonly number[] = [960, 1600]

/**
 * Startqualität je Stufe. Sie sinkt mit der Breite, weil ein großes Bild pro
 * Pixel weniger Bits braucht, um gleich gut auszusehen: es wird im Layout
 * seltener über seine native Größe hinaus vergrößert.
 */
export const AVIF_QUALITY: Record<BaseWidth, number> = { 480: 60, 960: 57, 1600: 54, 2560: 52 }
export const WEBP_QUALITY: Record<BaseWidth, number> = { 480: 76, 960: 75, 1600: 74, 2560: 72 }

/**
 * Obergrenze je Stufe in Kilobyte, gemessen an einem Querformat 3:2. Wird sie
 * gerissen, sinkt die Qualität in Fünferschritten bis zur Untergrenze. Der
 * Clamp greift nur bei den wenigen Bildern, die für den Encoder pathologisch
 * sind (Laub, Wellen, Rauschen im Nachthimmel) — genau dort, wo eine feste
 * Qualität sonst ein Vielfaches des Budgets erzeugt.
 */
export const AVIF_BUDGET_KB: Record<BaseWidth, number> = { 480: 20, 960: 48, 1600: 95, 2560: 190 }

/** WebP braucht für dasselbe Ergebnis mehr Platz als AVIF. */
export const WEBP_BUDGET_FACTOR = 1.35

export const QUALITY_STEP = 5
export const AVIF_MIN_QUALITY = 38
/**
 * WebP zerfällt unterhalb von etwa 60 sichtbar in Blöcke, während AVIF dort
 * noch brauchbar bleibt. Die Untergrenzen unterscheiden sich deshalb.
 */
export const WEBP_MIN_QUALITY = 60

export interface SharpenSettings {
  sigma: number
  m1: number
  m2: number
}

/**
 * Verkleinern kostet Schärfe, und zwar umso mehr, je stärker verkleinert wird.
 * Die größte erzeugte Stufe bekommt deshalb **kein** Sharpen: sie wird auf
 * großen Bildschirmen nahezu 1:1 dargestellt, und dort fällt Nachschärfen als
 * Halo auf.
 */
export const SHARPEN: Record<BaseWidth, SharpenSettings | null> = {
  480: { sigma: 0.6, m1: 0.3, m2: 1.6 },
  960: { sigma: 0.6, m1: 0.3, m2: 1.6 },
  1600: { sigma: 0.5, m1: 0.2, m2: 1.2 },
  2560: null,
}

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
export const OG_QUALITY = 80

export const LQIP_WIDTH = 20
export const LQIP_QUALITY = 35

export const JPEG_QUALITY = 82

/**
 * Alles, was das Aussehen der Ausgaben bestimmt. Der Hash dieses Objekts (plus
 * der libvips-Version) steht im Cache: ändert sich hier eine Zahl oder
 * aktualisiert sich libvips, wird alles neu gerendert, ohne dass jemand daran
 * denken muss.
 */
export const RENDER = {
  version: 1,
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
 * Die Breiten, die für ein Bild wirklich erzeugt werden. Nie größer als die
 * Quelle (hochskalieren ist verboten), und wenn die Quelle über der letzten
 * Regelstufe liegt, kommt ihre native Breite dazu. Das ist der Hochformat-Fall:
 * ein 2560 px hohes Porträt ist nur rund 1707 px breit, bekäme also ohne diese
 * Regel als größte Stufe 1600 px und würde auf der Detailseite unnötig
 * hochgerechnet.
 */
export function widthLadder(sourceWidth: number): number[] {
  const widths = BASE_WIDTHS.filter((width) => width <= sourceWidth) as number[]
  const largest = widths.at(-1) ?? 0
  // 32 px Abstand, damit nicht zwei praktisch identische Stufen entstehen.
  if (sourceWidth - largest >= 32) widths.push(sourceWidth)
  if (widths.length === 0) widths.push(sourceWidth)
  return widths
}

/** Regelstufe, deren Einstellungen für eine erzeugte Breite gelten. */
export function stepFor(width: number): BaseWidth {
  for (const base of BASE_WIDTHS) if (width <= base) return base
  return 2560
}

export function sharpenFor(width: number, largestWidth: number): SharpenSettings | null {
  if (width >= largestWidth) return null
  return SHARPEN[stepFor(width)]
}

/**
 * Budget in Byte für eine konkrete Variante. Die Tabellenwerte sind an einem
 * Querformat 3:2 gemessen; ein Hochformat hat bei gleicher Breite deutlich mehr
 * Pixel und bekommt entsprechend mehr Platz. Ohne diese Skalierung würde der
 * Clamp bei Hochformaten dauernd grundlos zuschlagen.
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
  /** Zahl der tatsächlichen Encodes — zeigt, wie oft der Budget-Clamp zuschlug. */
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

/** Durchschnittsfarbe über alle Pixel, als `#rrggbb`. */
export async function averageColor(file: string): Promise<string> {
  const stats = await sharp(file).stats()
  const [r, g, b] = stats.channels
  if (!r || !g || !b) return '#808080'
  return `#${hex(r.mean)}${hex(g.mean)}${hex(b.mean)}`
}

/**
 * 20 px breites WebP als Data-URI. 20 px statt der geplanten 24: darunter
 * verliert die Vorschau ihre Form, darüber wächst der Index spürbar, und jedes
 * Byte hier steht im HTML jeder Seite, auf der das Bild vorkommt.
 */
export async function makeLqip(file: string): Promise<string> {
  const buffer = await sharp(file)
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
 * Kodiert mit der Startqualität und senkt sie in Fünferschritten, solange das
 * Ergebnis über dem Budget liegt und die Untergrenze nicht erreicht ist.
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
  while (buffer.length > budget && quality - QUALITY_STEP >= minQuality) {
    quality -= QUALITY_STEP
    buffer = await encode(quality)
    encodes += 1
  }
  return { buffer, quality, encodes }
}

export interface RenderOptions {
  sourceFile: string
  slug: string
  /** Zielverzeichnis dieses Fotos, üblicherweise `public/img/<slug>`. */
  outDir: string
  write: (file: string, data: Buffer) => Promise<void>
}

export async function renderPhoto(options: RenderOptions): Promise<RenderResult> {
  const { sourceFile, slug, outDir, write } = options

  const metadata = await sharp(sourceFile, { failOn: 'error' }).metadata()
  const sourceWidth = metadata.width
  const sourceHeight = metadata.height
  const sourceBytes = statSync(sourceFile).size

  const widths = widthLadder(sourceWidth)
  const largest = widths.at(-1) ?? sourceWidth

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
    // Einmal verkleinern, dann alle Formate aus demselben Rohbild kodieren:
    // die drei Encoder sehen garantiert identische Pixel, und die teure
    // Skalierung passiert nur einmal je Breite.
    let pipeline = sharp(sourceFile, { failOn: 'error' }).resize({
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

    if (JPEG_WIDTHS.includes(targetWidth)) {
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
    .resize(OG_WIDTH, OG_HEIGHT, {
      fit: 'cover',
      // Nicht mittig zuschneiden: `attention` sucht die Bildregion mit der
      // höchsten Sättigung und Kantendichte. Bei einem Horizont im unteren
      // Drittel trifft ein zentrierter Schnitt sonst nur Himmel.
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
