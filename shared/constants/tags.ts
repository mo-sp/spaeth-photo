import type { Tag } from '../types/photo.ts'

/**
 * Reihenfolge der Tags in der Filterleiste. Bewusst inhaltlich sortiert
 * (Motivgruppen zuerst, Stilmerkmal zuletzt), nicht alphabetisch.
 */
export const TAG_ORDER = ['tiere', 'natur', 'landschaft', 'segeln', 'schwarzweiss'] as const

/**
 * Anzeige-Label mit Umlauten/ß. Im Datenmodell sind Tags kleingeschrieben und
 * ASCII, weil sie in URLs (`?tag=schwarzweiss`) auftauchen.
 */
export const TAG_LABELS: Record<Tag, string> = {
  tiere: 'Tiere',
  natur: 'Natur',
  landschaft: 'Landschaft',
  segeln: 'Segeln',
  schwarzweiss: 'Schwarzweiß',
}

/** Label eines Tags; fällt auf den Slug zurück, falls unbekannt. */
export function tagLabel(tag: string): string {
  return TAG_LABELS[tag as Tag] ?? tag
}
