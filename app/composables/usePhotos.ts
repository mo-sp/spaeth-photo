import raw from '~/data/photos.index.json'
import type { PhotoIndexEntry, PhotoIndexFile, Tag } from '#shared/types/photo'

/**
 * Zugriff auf den generierten Client-Index.
 *
 * Der Import steht im Modul-Scope: die Datei wird vom Bundler mitgenommen und
 * ist ohne Netzwerkrunde da — der Index ist eine Build-Konstante, kein
 * Datenabruf. Genau ein Cast bringt das strukturell typlose JSON auf das
 * Datenmodell; das Schema hat der Build bereits mit zod geprüft, ein zweites
 * Mal im Browser wäre bezahlte Arbeit ohne Ertrag.
 */
const index = raw as unknown as PhotoIndexFile

/** Ein Foto oder `null` — die Detailseite macht daraus einen 404. */
export function usePhoto(slug: string): PhotoIndexEntry | null {
  return index.photos.find((photo) => photo.slug === slug) ?? null
}

export function usePhotos() {
  return {
    index,
    /** Alle Fotos in kanonischer Ordnung: Datum absteigend, dann Slug. */
    photos: sortPhotos(index.photos),
    /** Nur tatsächlich vergebene Tags, in kanonischer Reihenfolge. */
    tags: index.tags,
    heroSlug: index.heroSlug,
    /** Prüft einen Routenparameter gegen den Bestand, nicht nur gegen das Vokabular. */
    knownTag(value: unknown): Tag | null {
      const tag = parseTag(value)
      if (tag === null) return null
      return index.tags.some((entry) => entry.tag === tag) ? tag : null
    },
  }
}
