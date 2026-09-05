/**
 * Slug-Erzeugung und -Prüfung. Der Slug ist zugleich Dateiname und URL
 * (`/foto/<slug>`) und nach dem Deploy unveränderlich — deshalb steht die
 * Umschrift hier explizit und nicht implizit in einer Bibliothek.
 */

/** Deutsche Umlaute werden ausgeschrieben, nicht entfernt (`ü` → `ue`). */
const GERMAN: Array<[RegExp, string]> = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue'],
  [/Ä/g, 'Ae'],
  [/Ö/g, 'Oe'],
  [/Ü/g, 'Ue'],
  [/ß/g, 'ss'],
]

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value)
}

/**
 * `"Pfütze mit Ahornblatt"` → `"pfuetze-mit-ahornblatt"`.
 *
 * Reihenfolge ist wesentlich: erst NFC normalisieren (damit ein zerlegtes
 * `u`+`¨` überhaupt als `ü` erkannt wird), dann die deutschen Sonderzeichen
 * ausschreiben, erst danach die übrigen Diakritika (é → e) über NFD entfernen.
 * Umgekehrt würde aus `ü` ein `u`.
 */
export function slugify(input: string): string {
  let value = input.normalize('NFC')
  for (const [pattern, replacement] of GERMAN) value = value.replace(pattern, replacement)
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Slug aus einem Original-Dateinamen (ohne Endung), für Bilder ohne Eintrag im
 * Mapping. `"A7_02554_cleanup.jpg"` → `"a7-02554-cleanup"`.
 */
export function slugFromFilename(filename: string): string {
  return slugify(filename.replace(/\.[^.]+$/, ''))
}
