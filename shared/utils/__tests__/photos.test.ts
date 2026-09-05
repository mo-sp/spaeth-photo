import { describe, expect, it } from 'vitest'
import type { PhotoIndexEntry, Tag } from '../../types/photo.ts'
import {
  curated,
  eagerCount,
  effectiveTag,
  filterByTag,
  neighbours,
  padCounter,
  photoAlt,
  photoTitle,
  sortPhotos,
  tagCounts,
} from '../photos.ts'

/** Only the fields the pure functions touch. */
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
  photo('a', { tags: ['sailing'] }),
  photo('b', { tags: ['sailing', 'nature'] }),
  photo('c', { tags: ['nature'] }),
]

describe('sortPhotos', () => {
  it('sorts by date, newest first', () => {
    const sorted = sortPhotos([
      photo('alt', { date: '2020-01-01' }),
      photo('neu', { date: '2024-06-01' }),
    ])
    expect(sorted.map((entry) => entry.slug)).toEqual(['neu', 'alt'])
  })

  it('decides by slug on the same date', () => {
    const sorted = sortPhotos([photo('zeta'), photo('alpha')])
    expect(sorted.map((entry) => entry.slug)).toEqual(['alpha', 'zeta'])
  })

  it('leaves the input unchanged', () => {
    const input = [photo('zeta'), photo('alpha')]
    sortPhotos(input)
    expect(input.map((entry) => entry.slug)).toEqual(['zeta', 'alpha'])
  })
})

describe('filterByTag', () => {
  it('returns the full pool without a tag', () => {
    expect(filterByTag(list, null)).toHaveLength(3)
  })

  it('filters down to the tag', () => {
    expect(filterByTag(list, 'nature').map((entry) => entry.slug)).toEqual(['b', 'c'])
  })

  it('falls back to the full pool on an empty result (spec)', () => {
    expect(filterByTag(list, 'animals' as Tag)).toHaveLength(3)
  })

  it('does not fall into an endless loop on an empty pool', () => {
    expect(filterByTag([], 'nature')).toEqual([])
  })
})

describe('effectiveTag', () => {
  it('keeps a tag the photo actually carries', () => {
    expect(effectiveTag(list, 'a', 'sailing')).toBe('sailing')
    expect(effectiveTag(list, 'c', 'nature')).toBe('nature')
  })

  it('drops a tag the photo does not carry', () => {
    expect(effectiveTag(list, 'a', 'nature')).toBeNull()
  })

  it('drops the tag for an unknown slug', () => {
    expect(effectiveTag(list, 'nope', 'sailing')).toBeNull()
  })

  it('passes null through', () => {
    expect(effectiveTag(list, 'a', null)).toBeNull()
  })
})

describe('tagCounts', () => {
  it('counts only assigned tags, in canonical order', () => {
    expect(tagCounts(list)).toEqual([
      { tag: 'nature', count: 2 },
      { tag: 'sailing', count: 2 },
    ])
  })

  it('is empty on an empty list', () => {
    expect(tagCounts([])).toEqual([])
  })
})

describe('neighbours', () => {
  it('reports position and counter one-based', () => {
    const result = neighbours(list, 'b')
    expect(result.index).toBe(1)
    expect(result.position).toBe(2)
    expect(result.total).toBe(3)
    expect(result.current?.slug).toBe('b')
  })

  it('wraps around at the start', () => {
    const result = neighbours(list, 'a')
    expect(result.prev?.slug).toBe('c')
    expect(result.next?.slug).toBe('b')
  })

  it('wraps around at the end', () => {
    const result = neighbours(list, 'c')
    expect(result.prev?.slug).toBe('b')
    expect(result.next?.slug).toBe('a')
  })

  it('does not link to itself when there is a single image', () => {
    const result = neighbours([photo('einzig')], 'einzig')
    expect(result.position).toBe(1)
    expect(result.total).toBe(1)
    expect(result.prev).toBeNull()
    expect(result.next).toBeNull()
  })

  it('reports an unknown slug without a position', () => {
    const result = neighbours(list, 'gibtsnicht')
    expect(result.index).toBe(-1)
    expect(result.position).toBe(0)
    expect(result.current).toBeNull()
    expect(result.prev).toBeNull()
    expect(result.next).toBeNull()
  })

  it('copes with an empty list', () => {
    const result = neighbours([], 'a')
    expect(result.index).toBe(-1)
    expect(result.total).toBe(0)
    expect(result.current).toBeNull()
  })
})

describe('eagerCount', () => {
  it('fills three columns of landscape images and stays in the expected band', () => {
    const many = Array.from({ length: 26 }, (_, i) => photo(`p${i}`))
    const count = eagerCount(many, 3)
    expect(count).toBeGreaterThanOrEqual(6)
    expect(count).toBeLessThanOrEqual(9)
  })

  it('loads no more than necessary for portrait images', () => {
    const portraits = Array.from({ length: 26 }, (_, i) => photo(`p${i}`, { aspectRatio: 0.667 }))
    expect(eagerCount(portraits, 3)).toBeLessThanOrEqual(
      eagerCount(
        Array.from({ length: 26 }, (_, i) => photo(`q${i}`)),
        3,
      ),
    )
  })

  it('never loads more tiles than exist', () => {
    expect(eagerCount([photo('a'), photo('b')], 3)).toBe(2)
    expect(eagerCount([], 3)).toBe(0)
  })
})

describe('padCounter', () => {
  it('pads single-digit numbers to two places', () => {
    expect(padCounter(3)).toBe('03')
    expect(padCounter(0)).toBe('00')
  })

  it('leaves two- and three-digit numbers untouched', () => {
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

  it('takes only featured and sorts by order', () => {
    expect(curated(pool, 3).map((entry) => entry.slug)).toEqual(['a', 'b', 'c'])
  })

  it('appends images without an order at the end', () => {
    expect(curated(pool, 10).map((entry) => entry.slug)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('caps at the number of tiles', () => {
    expect(curated(pool, 2)).toHaveLength(2)
    expect(curated([], 5)).toEqual([])
  })
})

describe('photoTitle', () => {
  const both = photo('x', { title: 'Evening Harbour', titleDe: 'Hafen am Abend' })

  it('picks the title of the locale', () => {
    expect(photoTitle(both, 'en')).toBe('Evening Harbour')
    expect(photoTitle(both, 'de')).toBe('Hafen am Abend')
  })

  it('falls back to English when there is no translation', () => {
    expect(photoTitle(photo('x', { title: 'Only English' }), 'de')).toBe('Only English')
  })

  it('defaults to English', () => {
    expect(photoTitle(both)).toBe('Evening Harbour')
  })
})

describe('photoAlt', () => {
  it('picks the description of the locale', () => {
    const entry = photo('x', { alt: 'Masts at dusk', altDe: 'Masten in der Dämmerung' })
    expect(photoAlt(entry, 'en')).toBe('Masts at dusk')
    expect(photoAlt(entry, 'de')).toBe('Masten in der Dämmerung')
  })

  it('falls back to the title of the same locale, not to the other description', () => {
    const entry = photo('x', {
      title: 'Evening Harbour',
      titleDe: 'Hafen am Abend',
      alt: 'Masts at dusk',
    })
    expect(photoAlt(entry, 'de')).toBe('Hafen am Abend')
  })

  it('falls back through both levels', () => {
    expect(photoAlt(photo('x', { title: 'Only English' }), 'de')).toBe('Only English')
  })
})
