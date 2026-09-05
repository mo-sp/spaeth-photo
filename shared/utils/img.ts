import type { PhotoIndexEntry, VariantFormat } from '../types/photo.ts'
import { variantUrl } from '../constants/images.ts'

/**
 * Der Weg vom Index-Eintrag zu `<picture>`. Der Index führt nur die
 * tatsächlich erzeugten Breiten je Format; die URLs entstehen über die
 * Konvention in `shared/constants/images.ts`. Ein `srcset` darf deshalb nie aus
 * einer Konstante gebaut werden — sonst verspricht die Seite Stufen, die es für
 * dieses Bild nicht gibt (Hochformate haben andere).
 */

/** Reihenfolge der `<source>`-Elemente: der Browser nimmt das erste, das er kann. */
const SOURCE_FORMATS = ['avif', 'webp'] as const

export interface PhotoSource {
  type: string
  srcset: string
  /** Wiederholt auf jeder `<source>` — ohne `sizes` wählt der Browser 100vw. */
  sizes: string
}

/** `/img/hafen-am-morgen/960.avif` */
export function imgUrl(photo: PhotoIndexEntry, width: number, format: VariantFormat): string {
  return variantUrl(photo.slug, width, format)
}

/**
 * Die auslieferbaren Breiten eines Formats, aufsteigend und optional gedeckelt.
 *
 * `variantMax` deckelt dort, wo das Layout die Anzeigebreite ohnehin begrenzt
 * (die Detailseite deckelt ein Hochformat über die Höhe). Liegt der Deckel
 * unter der kleinsten erzeugten Stufe, bleibt trotzdem diese kleinste Stufe
 * stehen: ein leeres `srcset` wäre ein kaputtes Bild.
 */
export function variantWidths(widths: readonly number[], variantMax?: number): number[] {
  const sorted = [...widths].sort((a, b) => a - b)
  if (sorted.length === 0) return []
  if (variantMax === undefined) return sorted
  const capped = sorted.filter((width) => width <= variantMax)
  return capped.length > 0 ? capped : [sorted[0]!]
}

/** `"/img/x/480.avif 480w, /img/x/960.avif 960w"`; leer, wenn es das Format nicht gibt. */
export function srcSet(photo: PhotoIndexEntry, format: VariantFormat, variantMax?: number): string {
  return variantWidths(photo.variants[format], variantMax)
    .map((width) => `${imgUrl(photo, width, format)} ${width}w`)
    .join(', ')
}

/** Die `<source>`-Elemente in Reihenfolge der Präferenz. */
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

/**
 * Das Format des `<img>`-Fallbacks: JPEG, solange es welches gibt. Fehlt es,
 * darf der Fallback nicht leer bleiben — dann tritt WebP an seine Stelle, das
 * jeder Browser der letzten zehn Jahre versteht.
 */
export function fallbackFormat(photo: PhotoIndexEntry): VariantFormat {
  if (photo.variants.jpeg.length > 0) return 'jpeg'
  if (photo.variants.webp.length > 0) return 'webp'
  return 'avif'
}

/**
 * `src` des Fallbacks: die kleinste ausgelieferte JPEG-Stufe (960). Sie ist nur
 * für Browser ohne `srcset` gedacht und soll dort kein Megabyte kosten.
 */
export function fallbackSrc(photo: PhotoIndexEntry, variantMax?: number): string {
  const format = fallbackFormat(photo)
  const widths = variantWidths(photo.variants[format], variantMax)
  const width = widths[0]
  return width === undefined ? '' : imgUrl(photo, width, format)
}

/**
 * Höhe der Detail-Bühne in CSS-Pixeln — dieselbe Zahl wie `--detail-h` in
 * `tokens.css`. Sie steht hier ein zweites Mal, weil aus ihr die
 * Auslieferungsbreite folgt und CSS-Variablen zur Bauzeit nicht lesbar sind;
 * ändert sich der Token, gehört diese Konstante mitgeändert.
 */
export const DETAIL_STAGE_H = 820

/**
 * Die größte Breite, die das Detailbild auf der Bühne je einnehmen kann.
 *
 * `object-fit: contain` in einem 820 px hohen Kasten deckelt die Breite auf
 * `820 · aspectRatio`: ein Hochformat (0,67) füllt nie mehr als 547 px, egal
 * wie breit der Bildschirm ist. Ohne diesen Deckel verspräche `sizes` dem
 * Browser die volle Contentbreite, und er lüde für ein Hochformat die
 * 1707er-Stufe, wo 960 reichen.
 */
export function detailCap(aspectRatio: number): number {
  return Math.round(DETAIL_STAGE_H * aspectRatio)
}

/**
 * `sizes` des Detailbilds, pro Foto verschieden.
 *
 * Unter 768 px ist die Bühne höhenlos (`--detail-h: auto`), das Bild also
 * breitengetrieben und exakt 100vw breit. Darüber ist es die Contentbreite
 * (Viewport minus Seitenleiste, 180 bzw. 220 px), gedeckelt auf `detailCap`.
 */
export function detailSizes(aspectRatio: number): string {
  const cap = detailCap(aspectRatio)
  return [
    '(max-width: 767px) 100vw',
    `(max-width: 1023px) min(calc(100vw - 180px), ${cap}px)`,
    `min(calc(100vw - 220px), ${cap}px)`,
  ].join(', ')
}

/**
 * Der Deckel für das `srcset` des Detailbilds.
 *
 * `sizes` nennt CSS-Pixel, der Browser multipliziert selbst mit der
 * Pixeldichte — ein Deckel in Höhe von `detailCap` würde auf jedem
 * Retina-Display eine zu kleine Stufe erzwingen. Deshalb der Faktor 2. Und er
 * darf nie unter das fallen, was ein Telefon braucht: dort ist das Bild
 * 100vw breit (bis 767 CSS-px), bei doppelter Dichte also rund 1534 px — die
 * nächste erzeugte Stufe darüber ist 1600.
 */
export function detailVariantMax(aspectRatio: number): number {
  const MOBILE_MIN = 1600
  return Math.max(MOBILE_MIN, detailCap(aspectRatio) * 2)
}
