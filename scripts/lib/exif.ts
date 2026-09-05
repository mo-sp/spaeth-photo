import exifReader from 'exif-reader'

/**
 * EXIF-Auswertung der Originale. Wird im Export **vor** dem Strippen der
 * Metadaten aufgerufen: die Kamerainformationen wandern in die YAML-Datei, die
 * ausgelieferten Bilder bleiben metadatenfrei.
 */

export interface SourceExif {
  /** Aufnahmedatum als `YYYY-MM-DD` oder null. */
  date: string | null
  /** Kamera als „Hersteller Modell", dedupliziert. */
  camera: string | null
  lens: string | null
}

/**
 * EXIF speichert die Aufnahmezeit als lokale Wanduhrzeit ohne Zone
 * (`2023:06:28 14:22:33`). `exif-reader` baut daraus ein Date über `Date.UTC`.
 * Das Datum darf deshalb **nur** über die UTC-Komponenten gelesen werden —
 * `getFullYear()` würde die Zeitzone des Buildservers anwenden und Aufnahmen
 * kurz nach Mitternacht oder vor 2 Uhr morgens auf den Vortag schieben.
 */
export function formatExifDate(value: Date): string {
  const year = String(value.getUTCFullYear()).padStart(4, '0')
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Heutiges Datum in Ortszeit, als Fallback ohne EXIF. */
export function todayIso(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\0/g, '').trim().replace(/\s+/g, ' ')
  return trimmed.length > 0 ? trimmed : null
}

/**
 * `SONY` → `Sony`, `DJI` → `DJI`. Hersteller schreiben ihren Namen im EXIF fast
 * immer in Versalien; als Fließtext gesetzt sieht das nach Geschrei aus. Wörter
 * mit weniger als vier Buchstaben bleiben unangetastet, weil das in aller Regel
 * Abkürzungen sind (DJI, GE) und keine Namen.
 */
function softenShouting(value: string): string {
  return value
    .split(' ')
    .map((word) => {
      if (word.length < 4 || word !== word.toUpperCase() || !/^\p{Lu}+$/u.test(word)) return word
      return word[0] + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * `Make: "SONY"` + `Model: "ILCE-7M4"` → `"Sony ILCE-7M4"`.
 * Enthält das Modell den Hersteller bereits (`Make: "NIKON CORPORATION"`,
 * `Model: "NIKON D850"`), wird nur das Modell übernommen — verglichen wird das
 * erste Wort. Auch dann wird das Geschrei gedämpft (`"Nikon D850"`); echte
 * Modellbezeichnungen bleiben davon unberührt, weil sie Ziffern oder
 * Bindestriche enthalten (`ILCE-7M4` ist kein Geschrei).
 */
export function cameraName(make: unknown, model: unknown): string | null {
  const rawMake = clean(make)
  const rawModel = clean(model)
  if (!rawModel) return rawMake ? softenShouting(rawMake) : null
  if (!rawMake) return rawModel
  const firstMake = rawMake.split(' ')[0]?.toLowerCase()
  const firstModel = rawModel.split(' ')[0]?.toLowerCase()
  if (firstMake && firstMake === firstModel) return softenShouting(rawModel)
  return `${softenShouting(rawMake)} ${rawModel}`
}

function asDate(value: unknown): Date | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : null
}

/**
 * Liest den EXIF-Block, wie ihn `sharp().metadata().exif` liefert. Defekte
 * Blöcke sind kein Fehler: das Skript fällt dann auf die Vorgaben zurück.
 */
export function readExif(block: Buffer | undefined): SourceExif {
  if (!block || block.length === 0) return { date: null, camera: null, lens: null }

  let parsed: ReturnType<typeof exifReader>
  try {
    parsed = exifReader(block)
  } catch {
    return { date: null, camera: null, lens: null }
  }

  const image = (parsed?.Image ?? {}) as Record<string, unknown>
  const photo = (parsed?.Photo ?? {}) as Record<string, unknown>

  const taken =
    asDate(photo.DateTimeOriginal) ?? asDate(photo.DateTimeDigitized) ?? asDate(image.DateTime)

  return {
    date: taken ? formatExifDate(taken) : null,
    camera: cameraName(image.Make, image.Model),
    // Nur LensModel: LensSpecification ist ein Array aus vier Brüchen
    // (Brennweiten und Blenden), niemals ein Name — `clean` gäbe dafür immer
    // null zurück.
    lens: clean(photo.LensModel),
  }
}
