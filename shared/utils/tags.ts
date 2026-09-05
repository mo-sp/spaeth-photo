import type { Tag } from '../types/photo.ts'

/**
 * Tag-Vokabular des Frontends. Liegt unter `shared/utils/`, weil Nuxt nur von
 * dort (und aus `shared/types/`) automatisch importiert — die Build-Skripte
 * importieren dieselbe Datei mit relativem Pfad.
 */

/**
 * Reihenfolge der Tags in der Filterleiste. Bewusst inhaltlich sortiert
 * (Motivgruppen zuerst, Stilmerkmal zuletzt), nicht alphabetisch.
 */
export const TAG_ORDER = ['tiere', 'natur', 'landschaft', 'segeln', 'schwarzweiss'] as const

/**
 * Anzeige-Label mit Umlauten/ß. Im Datenmodell sind Tags kleingeschrieben und
 * ASCII, weil sie in URLs (`/galerie/schwarzweiss`) auftauchen.
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

/**
 * Prüft einen Routenparameter gegen das Vokabular. Alles, was kein bekannter
 * Tag ist, ergibt `null` — die Galerie-Seite macht daraus einen 404, statt
 * still den ungefilterten Bestand zu zeigen.
 */
export function parseTag(value: unknown): Tag | null {
  if (typeof value !== 'string' || value === '') return null
  return (TAG_ORDER as readonly string[]).includes(value) ? (value as Tag) : null
}
