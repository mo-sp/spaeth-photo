import { describe, expect, it } from 'vitest'
import type { PhotoIndexEntry } from '../../types/photo.ts'
import {
  buildSources,
  detailCap,
  detailSizes,
  detailVariantMax,
  fallbackFormat,
  fallbackSrc,
  imgUrl,
  srcSet,
  variantWidths,
} from '../img.ts'

function photo(overrides: Partial<PhotoIndexEntry> = {}): PhotoIndexEntry {
  return {
    slug: 'hafen-am-morgen',
    title: 'Hafen am Morgen',
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
    variants: { avif: [480, 960, 1600, 2560], webp: [480, 960, 1600, 2560], jpeg: [960, 1600] },
    og: '/img/hafen-am-morgen/og.jpg',
    ...overrides,
  }
}

const SIZES = '(max-width: 767px) 100vw, 33vw'

describe('imgUrl', () => {
  it('folgt der Konvention /img/<slug>/<breite>.<endung>', () => {
    expect(imgUrl(photo(), 960, 'avif')).toBe('/img/hafen-am-morgen/960.avif')
    expect(imgUrl(photo(), 960, 'webp')).toBe('/img/hafen-am-morgen/960.webp')
  })

  it('schreibt JPEG als .jpg', () => {
    expect(imgUrl(photo(), 960, 'jpeg')).toBe('/img/hafen-am-morgen/960.jpg')
  })
})

describe('variantWidths', () => {
  it('sortiert aufsteigend', () => {
    expect(variantWidths([1600, 480, 960])).toEqual([480, 960, 1600])
  })

  it('deckelt auf variantMax', () => {
    expect(variantWidths([480, 960, 1600, 2560], 1600)).toEqual([480, 960, 1600])
  })

  it('behält die kleinste Stufe, wenn der Deckel darunter liegt', () => {
    expect(variantWidths([480, 960], 200)).toEqual([480])
  })

  it('ist auf einer leeren Liste leer', () => {
    expect(variantWidths([], 1600)).toEqual([])
  })
})

describe('srcSet', () => {
  it('schreibt Pfad und Breitendeskriptor je Stufe', () => {
    expect(srcSet(photo(), 'jpeg')).toBe(
      '/img/hafen-am-morgen/960.jpg 960w, /img/hafen-am-morgen/1600.jpg 1600w',
    )
  })

  it('nimmt die tatsächlich erzeugten Breiten, nicht die Regelstufen', () => {
    const hochformat = photo({ variants: { avif: [480, 960, 1600, 1707], webp: [], jpeg: [] } })
    expect(srcSet(hochformat, 'avif')).toContain('/img/hafen-am-morgen/1707.avif 1707w')
    expect(srcSet(hochformat, 'avif')).not.toContain('2560')
  })

  it('respektiert variantMax', () => {
    expect(srcSet(photo(), 'avif', 960)).toBe(
      '/img/hafen-am-morgen/480.avif 480w, /img/hafen-am-morgen/960.avif 960w',
    )
  })

  it('ist leer, wenn es das Format nicht gibt', () => {
    expect(srcSet(photo({ variants: { avif: [], webp: [960], jpeg: [960] } }), 'avif')).toBe('')
  })
})

describe('buildSources', () => {
  it('liefert AVIF vor WebP', () => {
    const sources = buildSources(photo(), SIZES)
    expect(sources.map((source) => source.type)).toEqual(['image/avif', 'image/webp'])
  })

  it('wiederholt sizes auf jeder source', () => {
    for (const source of buildSources(photo(), SIZES)) {
      expect(source.sizes).toBe(SIZES)
    }
  })

  it('reicht variantMax an jedes srcset durch', () => {
    for (const source of buildSources(photo(), SIZES, 960)) {
      expect(source.srcset).not.toContain('1600')
      expect(source.srcset).toContain('960w')
    }
  })

  it('lässt Formate ohne Varianten weg', () => {
    const sources = buildSources(photo({ variants: { avif: [], webp: [960], jpeg: [960] } }), SIZES)
    expect(sources.map((source) => source.type)).toEqual(['image/webp'])
  })

  it('erzeugt nie eine source mit leerem srcset', () => {
    for (const source of buildSources(photo(), SIZES, 10)) {
      expect(source.srcset).not.toBe('')
    }
  })
})

describe('fallback', () => {
  it('bevorzugt JPEG', () => {
    expect(fallbackFormat(photo())).toBe('jpeg')
  })

  it('weicht ohne JPEG auf WebP aus', () => {
    expect(fallbackFormat(photo({ variants: { avif: [960], webp: [960], jpeg: [] } }))).toBe('webp')
  })

  it('nimmt die kleinste JPEG-Stufe als src', () => {
    expect(fallbackSrc(photo())).toBe('/img/hafen-am-morgen/960.jpg')
  })

  it('bleibt auch mit engem Deckel nicht leer', () => {
    expect(fallbackSrc(photo(), 10)).toBe('/img/hafen-am-morgen/960.jpg')
  })
})

describe('detailCap', () => {
  it('deckelt die Breite über die Bühnenhöhe', () => {
    expect(detailCap(1.5)).toBe(1230)
    expect(detailCap(0.666797)).toBe(547)
  })
})

describe('detailSizes', () => {
  it('nennt drei Stufen und trägt den Deckel in beiden Desktop-Stufen', () => {
    const sizes = detailSizes(1.5)
    expect(sizes).toBe(
      '(max-width: 767px) 100vw, ' +
        '(max-width: 1023px) min(calc(100vw - 180px), 1230px), ' +
        'min(calc(100vw - 220px), 1230px)',
    )
  })

  it('ist mobil breitengetrieben, nicht gedeckelt', () => {
    expect(detailSizes(0.667).startsWith('(max-width: 767px) 100vw,')).toBe(true)
  })
})

describe('detailVariantMax', () => {
  it('lässt Raum für doppelte Pixeldichte', () => {
    expect(detailVariantMax(1.5)).toBe(2460)
  })

  it('fällt für Hochformate nicht unter die mobile Anzeigebreite', () => {
    expect(detailVariantMax(0.666797)).toBe(1600)
  })

  it('lässt einem Hochformat damit die 1600er-Stufe', () => {
    const portrait = photo({
      width: 1707,
      height: 2560,
      aspectRatio: 0.666797,
      variants: { avif: [480, 960, 1600, 1707], webp: [480, 960, 1600, 1707], jpeg: [960, 1600] },
    })
    expect(variantWidths(portrait.variants.avif, detailVariantMax(portrait.aspectRatio))).toEqual([
      480, 960, 1600,
    ])
  })

  it('spart dem Querformat die 2560er-Stufe', () => {
    const landscape = photo()
    expect(variantWidths(landscape.variants.avif, detailVariantMax(landscape.aspectRatio))).toEqual(
      [480, 960, 1600],
    )
  })
})
