import { describe, expect, it } from 'vitest'
import type { PhotoIndexEntry, Tag } from '../../types/photo.ts'
import {
  curated,
  eagerCount,
  filterByTag,
  neighbours,
  padCounter,
  sortPhotos,
  tagCounts,
} from '../photos.ts'

/** Nur die Felder, die die reinen Funktionen anfassen. */
function photo(slug: string, options: Partial<PhotoIndexEntry> = {}): PhotoIndexEntry {
  return {
    slug,
    title: slug,
    alt: null,
    date: '2024-01-01',
    year: 2024,
    tags: [],
    collection: null,
    camera: null,
    lens: null,
    featured: false,
    hero: false,
    order: null,
    width: 2560,
    height: 1707,
    aspectRatio: 1.5,
    orientation: 'landscape',
    color: '#123456',
    lqip: 'data:image/webp;base64,AA',
    variants: { avif: [480, 960], webp: [480, 960], jpeg: [960] },
    og: `/img/${slug}/og.jpg`,
    ...options,
  }
}

const list = [
  photo('a', { tags: ['segeln'] }),
  photo('b', { tags: ['segeln', 'natur'] }),
  photo('c', { tags: ['natur'] }),
]

describe('sortPhotos', () => {
  it('sortiert nach Datum absteigend', () => {
    const sorted = sortPhotos([
      photo('alt', { date: '2020-01-01' }),
      photo('neu', { date: '2024-06-01' }),
    ])
    expect(sorted.map((entry) => entry.slug)).toEqual(['neu', 'alt'])
  })

  it('entscheidet bei gleichem Datum über den Slug', () => {
    const sorted = sortPhotos([photo('zeta'), photo('alpha')])
    expect(sorted.map((entry) => entry.slug)).toEqual(['alpha', 'zeta'])
  })

  it('lässt die Eingabe unverändert', () => {
    const input = [photo('zeta'), photo('alpha')]
    sortPhotos(input)
    expect(input.map((entry) => entry.slug)).toEqual(['zeta', 'alpha'])
  })
})

describe('filterByTag', () => {
  it('gibt ohne Tag den vollen Pool zurück', () => {
    expect(filterByTag(list, null)).toHaveLength(3)
  })

  it('filtert auf den Tag', () => {
    expect(filterByTag(list, 'natur').map((entry) => entry.slug)).toEqual(['b', 'c'])
  })

  it('fällt bei leerem Ergebnis auf den vollen Pool zurück (Spec)', () => {
    expect(filterByTag(list, 'tiere' as Tag)).toHaveLength(3)
  })

  it('fällt bei leerem Pool nicht in eine Endlosschleife', () => {
    expect(filterByTag([], 'natur')).toEqual([])
  })
})

describe('tagCounts', () => {
  it('zählt nur vergebene Tags in kanonischer Reihenfolge', () => {
    expect(tagCounts(list)).toEqual([
      { tag: 'natur', count: 2 },
      { tag: 'segeln', count: 2 },
    ])
  })

  it('ist auf einer leeren Liste leer', () => {
    expect(tagCounts([])).toEqual([])
  })
})

describe('neighbours', () => {
  it('liefert Position und Zähler einsbasiert', () => {
    const result = neighbours(list, 'b')
    expect(result.index).toBe(1)
    expect(result.position).toBe(2)
    expect(result.total).toBe(3)
    expect(result.current?.slug).toBe('b')
  })

  it('läuft am Anfang zyklisch um', () => {
    const result = neighbours(list, 'a')
    expect(result.prev?.slug).toBe('c')
    expect(result.next?.slug).toBe('b')
  })

  it('läuft am Ende zyklisch um', () => {
    const result = neighbours(list, 'c')
    expect(result.prev?.slug).toBe('b')
    expect(result.next?.slug).toBe('a')
  })

  it('verlinkt bei einem einzigen Bild nicht auf sich selbst', () => {
    const result = neighbours([photo('einzig')], 'einzig')
    expect(result.position).toBe(1)
    expect(result.total).toBe(1)
    expect(result.prev).toBeNull()
    expect(result.next).toBeNull()
  })

  it('meldet einen unbekannten Slug ohne Position', () => {
    const result = neighbours(list, 'gibtsnicht')
    expect(result.index).toBe(-1)
    expect(result.position).toBe(0)
    expect(result.current).toBeNull()
    expect(result.prev).toBeNull()
    expect(result.next).toBeNull()
  })

  it('kommt mit einer leeren Liste zurecht', () => {
    const result = neighbours([], 'a')
    expect(result.index).toBe(-1)
    expect(result.total).toBe(0)
    expect(result.current).toBeNull()
  })
})

describe('eagerCount', () => {
  it('füllt drei Spalten mit Querformaten und bleibt im erwarteten Band', () => {
    const many = Array.from({ length: 26 }, (_, i) => photo(`p${i}`))
    const count = eagerCount(many, 3)
    expect(count).toBeGreaterThanOrEqual(6)
    expect(count).toBeLessThanOrEqual(9)
  })

  it('lädt bei Hochformaten nicht mehr als nötig', () => {
    const portraits = Array.from({ length: 26 }, (_, i) => photo(`p${i}`, { aspectRatio: 0.667 }))
    expect(eagerCount(portraits, 3)).toBeLessThanOrEqual(
      eagerCount(
        Array.from({ length: 26 }, (_, i) => photo(`q${i}`)),
        3,
      ),
    )
  })

  it('lädt nie mehr Kacheln als vorhanden', () => {
    expect(eagerCount([photo('a'), photo('b')], 3)).toBe(2)
    expect(eagerCount([], 3)).toBe(0)
  })
})

describe('padCounter', () => {
  it('füllt einstellige Zahlen auf zwei Stellen auf', () => {
    expect(padCounter(3)).toBe('03')
    expect(padCounter(0)).toBe('00')
  })

  it('lässt zwei- und dreistellige Zahlen unangetastet', () => {
    expect(padCounter(14)).toBe('14')
    expect(padCounter(104)).toBe('104')
  })
})

describe('curated', () => {
  const pool = [
    photo('e', { featured: false, order: 1 }),
    photo('c', { featured: true, order: 3 }),
    photo('a', { featured: true, order: 1 }),
    photo('d', { featured: true, order: null }),
    photo('b', { featured: true, order: 2 }),
  ]

  it('nimmt nur featured und sortiert nach order', () => {
    expect(curated(pool, 3).map((entry) => entry.slug)).toEqual(['a', 'b', 'c'])
  })

  it('hängt Bilder ohne order hinten an', () => {
    expect(curated(pool, 10).map((entry) => entry.slug)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('deckelt auf die Zahl der Kacheln', () => {
    expect(curated(pool, 2)).toHaveLength(2)
    expect(curated([], 5)).toEqual([])
  })
})
