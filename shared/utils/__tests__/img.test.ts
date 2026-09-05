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
  it('follows the convention /img/<slug>/<width>.<extension>', () => {
    expect(imgUrl(photo(), 960, 'avif')).toBe('/img/hafen-am-morgen/960.avif')
    expect(imgUrl(photo(), 960, 'webp')).toBe('/img/hafen-am-morgen/960.webp')
  })

  it('writes JPEG as .jpg', () => {
    expect(imgUrl(photo(), 960, 'jpeg')).toBe('/img/hafen-am-morgen/960.jpg')
  })
})

describe('variantWidths', () => {
  it('sorts ascending', () => {
    expect(variantWidths([1600, 480, 960])).toEqual([480, 960, 1600])
  })

  it('caps at variantMax', () => {
    expect(variantWidths([480, 960, 1600, 2560], 1600)).toEqual([480, 960, 1600])
  })

  it('keeps the smallest step when the cap is below it', () => {
    expect(variantWidths([480, 960], 200)).toEqual([480])
  })

  it('is empty on an empty list', () => {
    expect(variantWidths([], 1600)).toEqual([])
  })
})

describe('srcSet', () => {
  it('writes path and width descriptor per step', () => {
    expect(srcSet(photo(), 'jpeg')).toBe(
      '/img/hafen-am-morgen/960.jpg 960w, /img/hafen-am-morgen/1600.jpg 1600w',
    )
  })

  it('takes the widths actually produced, not the standard steps', () => {
    const portrait = photo({ variants: { avif: [480, 960, 1600, 1707], webp: [], jpeg: [] } })
    expect(srcSet(portrait, 'avif')).toContain('/img/hafen-am-morgen/1707.avif 1707w')
    expect(srcSet(portrait, 'avif')).not.toContain('2560')
  })

  it('respects variantMax', () => {
    expect(srcSet(photo(), 'avif', 960)).toBe(
      '/img/hafen-am-morgen/480.avif 480w, /img/hafen-am-morgen/960.avif 960w',
    )
  })

  it('is empty when the format does not exist', () => {
    expect(srcSet(photo({ variants: { avif: [], webp: [960], jpeg: [960] } }), 'avif')).toBe('')
  })
})

describe('buildSources', () => {
  it('delivers AVIF before WebP', () => {
    const sources = buildSources(photo(), SIZES)
    expect(sources.map((source) => source.type)).toEqual(['image/avif', 'image/webp'])
  })

  it('repeats sizes on every source', () => {
    for (const source of buildSources(photo(), SIZES)) {
      expect(source.sizes).toBe(SIZES)
    }
  })

  it('passes variantMax through to every srcset', () => {
    for (const source of buildSources(photo(), SIZES, 960)) {
      expect(source.srcset).not.toContain('1600')
      expect(source.srcset).toContain('960w')
    }
  })

  it('leaves out formats without variants', () => {
    const sources = buildSources(photo({ variants: { avif: [], webp: [960], jpeg: [960] } }), SIZES)
    expect(sources.map((source) => source.type)).toEqual(['image/webp'])
  })

  it('never produces a source with an empty srcset', () => {
    for (const source of buildSources(photo(), SIZES, 10)) {
      expect(source.srcset).not.toBe('')
    }
  })
})

describe('fallback', () => {
  it('prefers JPEG', () => {
    expect(fallbackFormat(photo())).toBe('jpeg')
  })

  it('falls back to WebP without JPEG', () => {
    expect(fallbackFormat(photo({ variants: { avif: [960], webp: [960], jpeg: [] } }))).toBe('webp')
  })

  it('takes the smallest JPEG step as src', () => {
    expect(fallbackSrc(photo())).toBe('/img/hafen-am-morgen/960.jpg')
  })

  it('stays non-empty even with a tight cap', () => {
    expect(fallbackSrc(photo(), 10)).toBe('/img/hafen-am-morgen/960.jpg')
  })
})

describe('detailCap', () => {
  it('caps the width via the stage height', () => {
    expect(detailCap(1.5)).toBe(1230)
    expect(detailCap(0.666797)).toBe(547)
  })
})

describe('detailSizes', () => {
  it('names three steps and carries the cap in both desktop steps', () => {
    const sizes = detailSizes(1.5)
    expect(sizes).toBe(
      '(max-width: 767px) 100vw, ' +
        '(max-width: 1023px) min(calc(100vw - 180px), 1230px), ' +
        'min(calc(100vw - 220px), 1230px)',
    )
  })

  it('is width-driven on mobile, not capped', () => {
    expect(detailSizes(0.667).startsWith('(max-width: 767px) 100vw,')).toBe(true)
  })
})

describe('detailVariantMax', () => {
  it('leaves room for double pixel density', () => {
    expect(detailVariantMax(1.5)).toBe(2460)
  })

  it('does not fall below the mobile display width for portrait images', () => {
    expect(detailVariantMax(0.666797)).toBe(1600)
  })

  it('thereby leaves a portrait image its 1600 step', () => {
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

  it('spares a landscape image the 2560 step', () => {
    const landscape = photo()
    expect(variantWidths(landscape.variants.avif, detailVariantMax(landscape.aspectRatio))).toEqual(
      [480, 960, 1600],
    )
  })
})
