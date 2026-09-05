import type { PhotoIndexEntry, Tag, TagCount } from '../types/photo.ts'
import { TAG_ORDER } from './tags.ts'

/**
 * Reine Ableitungen auf dem Client-Index. Kein Nuxt, kein Vue, keine
 * Seiteneffekte — deshalb liegen sie unter `shared/utils/` (Nuxt importiert von
 * dort automatisch) und lassen sich direkt mit vitest prüfen.
 */

/**
 * Neueste zuerst, bei Gleichstand Slug aufsteigend — dieselbe Ordnung, die der
 * Build ins Manifest schreibt. Das Frontend sortiert trotzdem selbst: eine
 * Liste, die nach einem Filter plötzlich anders herum steht, wäre ein Fehler,
 * den niemand im Build bemerkt.
 */
export function sortPhotos(photos: readonly PhotoIndexEntry[]): PhotoIndexEntry[] {
  return [...photos].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.slug.localeCompare(b.slug, 'en')
  })
}

/**
 * Einfachauswahl wie in der Spec: `null` zeigt den vollen Pool. Läuft ein
 * Filter leer, wird ebenfalls der volle Pool gezeigt (Spec-Fallback) — eine
 * leere Galerie sähe wie ein Defekt aus. Beim aktuellen Bestand tritt der Fall
 * nicht auf, weil die Filterleiste nur tatsächlich vergebene Tags anbietet.
 */
export function filterByTag(
  photos: readonly PhotoIndexEntry[],
  tag: Tag | null,
): PhotoIndexEntry[] {
  if (tag === null) return [...photos]
  const filtered = photos.filter((photo) => photo.tags.includes(tag))
  return filtered.length > 0 ? filtered : [...photos]
}

/** Tags in kanonischer Reihenfolge, nur die tatsächlich vergebenen. */
export function tagCounts(photos: readonly PhotoIndexEntry[]): TagCount[] {
  const counts = new Map<Tag, number>()
  for (const photo of photos) {
    for (const tag of photo.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return TAG_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
    tag,
    count: counts.get(tag) ?? 0,
  }))
}

export interface Neighbours {
  /** Nullbasierte Position, `-1` wenn der Slug nicht in der Liste steht. */
  index: number
  /** Einsbasiert für die Anzeige „03 / 14"; `0` bei unbekanntem Slug. */
  position: number
  total: number
  current: PhotoIndexEntry | null
  prev: PhotoIndexEntry | null
  next: PhotoIndexEntry | null
}

/**
 * Nachbarn innerhalb der (gefilterten) Liste, zyklisch nach `(i ± 1 + n) % n`.
 *
 * Zwei Sonderfälle weichen von der Formel ab: bei unbekanntem Slug gibt es
 * keine Position, und bei genau einem Bild zeigte die Formel auf das Bild
 * selbst — ein „Vorher"-Link auf die eigene Seite ist kein Navigationsziel,
 * also bleibt er leer.
 */
export function neighbours(photos: readonly PhotoIndexEntry[], slug: string): Neighbours {
  const total = photos.length
  const index = photos.findIndex((photo) => photo.slug === slug)
  if (index < 0) {
    return { index: -1, position: 0, total, current: null, prev: null, next: null }
  }
  const cyclic = total > 1
  return {
    index,
    position: index + 1,
    total,
    current: photos[index] ?? null,
    prev: cyclic ? (photos[(index - 1 + total) % total] ?? null) : null,
    next: cyclic ? (photos[(index + 1) % total] ?? null) : null,
  }
}

/**
 * Wie viele Kacheln der Galerie ohne `loading="lazy"` geladen werden.
 *
 * Der Lazy-Loader des Browsers entscheidet erst nach dem Layout, und bei einem
 * Masonry aus CSS-Columns steht das Layout spät — die obersten Kacheln würden
 * sichtbar nachladen. Statt einer festen Zahl wird der Spaltenumbruch aus den
 * Seitenverhältnissen simuliert (Kachelhöhe = 1 / aspectRatio bei Breite 1,
 * jede Kachel in die kürzeste Spalte) und alles vorgeladen, bis jede Spalte
 * etwa eine Bildschirmhöhe trägt. Die Klammer hält das Ergebnis unabhängig vom
 * Bestand in der Größenordnung, die die Messung getragen hat.
 */
export function eagerCount(
  photos: readonly PhotoIndexEntry[],
  columns = 3,
  targetHeight = 1.3,
  min = 6,
  max = 9,
): number {
  const heights = new Array<number>(Math.max(1, columns)).fill(0)
  let count = 0
  for (const photo of photos) {
    const shortest = heights.indexOf(Math.min(...heights))
    if ((heights[shortest] ?? 0) >= targetHeight) break
    heights[shortest] = (heights[shortest] ?? 0) + 1 / (photo.aspectRatio || 1)
    count += 1
  }
  return Math.min(photos.length, Math.max(Math.min(count, max), Math.min(min, photos.length)))
}
