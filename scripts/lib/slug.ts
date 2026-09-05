/**
 * Slug creation and validation. A slug is file name and URL (`/photo/<slug>`)
 * at once and immutable after deploy, so the transliteration is spelled out
 * here rather than left to a library.
 */

/** German umlauts are written out, not stripped (u-umlaut becomes `ue`). */
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
 * Order matters: NFC first (so a decomposed `u` + combining diaeresis is seen
 * as one character at all), then spell out the German characters, and only then
 * strip the remaining diacritics via NFD — the other way round an umlaut would
 * lose its `e`.
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

/** Slug from an original file name, for images with no entry in the import map. */
export function slugFromFilename(filename: string): string {
  return slugify(filename.replace(/\.[^.]+$/, ''))
}
