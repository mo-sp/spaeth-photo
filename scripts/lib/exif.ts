import exifReader from 'exif-reader'

/**
 * EXIF of the originals, read during export **before** the metadata is
 * stripped: the camera details move into the YAML file, the shipped images stay
 * metadata-free.
 */

export interface SourceExif {
  /** Capture date as `YYYY-MM-DD`, or null. */
  date: string | null
  /** Camera as "make model", deduplicated. */
  camera: string | null
  lens: string | null
}

/**
 * Read via the UTC components only: EXIF stores wall-clock time without a zone
 * and `exif-reader` builds the Date through `Date.UTC`, so `getFullYear()`
 * would apply the build server's zone and push early-morning shots a day back.
 */
export function formatExifDate(value: Date): string {
  const year = String(value.getUTCFullYear()).padStart(4, '0')
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's date in local time, the fallback when EXIF has none. */
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
 * `SONY` → `Sony`, `DJI` → `DJI`. Words shorter than four letters are left
 * alone: those are abbreviations (DJI, GE), not names set in all caps.
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
 * `Make: "SONY"` + `Model: "ILCE-7M4"` → `"Sony ILCE-7M4"`. When the model
 * already repeats the make (`NIKON CORPORATION` / `NIKON D850`), only the model
 * is kept; the first word decides.
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
 * Reads the EXIF block as `sharp().metadata().exif` delivers it. A broken block
 * is not an error; the script falls back to its defaults.
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
    // LensModel only: LensSpecification is an array of four fractions (focal
    // lengths and apertures), never a name.
    lens: clean(photo.LensModel),
  }
}
