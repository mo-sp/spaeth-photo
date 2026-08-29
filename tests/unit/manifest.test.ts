import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  comparePhotos,
  countTags,
  resolveHero,
  toIndex,
} from '../../scripts/lib/manifest.ts'
import type { PhotoMeta } from '../../shared/types/photo.ts'
import type { RenderResult } from '../../scripts/lib/variants.ts'

function meta(overrides: Partial<PhotoMeta> = {}): PhotoMeta {
  return {
    title: 'Titel',
    date: '2024-01-01',
    tags: [],
    collection: null,
    camera: null,
    lens: null,
    featured: false,
    hero: false,
    order: null,
    print: null,
    ...overrides,
  }
}

function render(): RenderResult {
  return {
    sourceWidth: 2560,
    sourceHeight: 1707,
    sourceBytes: 1_000_000,
    width: 2560,
    height: 1707,
    aspectRatio: 1.4997,
    orientation: 'landscape',
    color: '#334455',
    lqip: 'data:image/webp;base64,AAAA',
    variants: { avif: [480, 960], webp: [480, 960], jpeg: [960] },
    files: [
      { format: 'avif', width: 480, height: 320, path: '/img/x/480.avif', bytes: 10 },
      { format: 'avif', width: 960, height: 640, path: '/img/x/960.avif', bytes: 20 },
      { format: 'webp', width: 480, height: 320, path: '/img/x/480.webp', bytes: 30 },
      { format: 'webp', width: 960, height: 640, path: '/img/x/960.webp', bytes: 40 },
      { format: 'jpeg', width: 960, height: 640, path: '/img/x/960.jpg', bytes: 50 },
    ],
    ogFile: { format: 'jpeg', width: 1200, height: 630, path: '/img/x/og.jpg', bytes: 60 },
    totalBytes: 210,
    encodes: 5,
  }
}

describe('comparePhotos', () => {
  it('sortiert nach Datum absteigend', () => {
    const list = [
      { date: '2020-01-01', slug: 'alt' },
      { date: '2024-06-01', slug: 'neu' },
      { date: '2022-03-03', slug: 'mittel' },
    ]
    expect([...list].sort(comparePhotos).map((p) => p.slug)).toEqual(['neu', 'mittel', 'alt'])
  })

  it('macht die Reihenfolge bei gleichem Datum über den Slug eindeutig', () => {
    const list = [
      { date: '2024-01-01', slug: 'beta' },
      { date: '2024-01-01', slug: 'alpha' },
    ]
    expect([...list].sort(comparePhotos).map((p) => p.slug)).toEqual(['alpha', 'beta'])
  })
})

describe('countTags', () => {
  it('zählt und behält die kanonische Reihenfolge, nicht die Fundreihenfolge', () => {
    expect(
      countTags([{ tags: ['landschaft', 'natur'] }, { tags: ['tiere'] }, { tags: ['landschaft'] }]),
    ).toEqual([
      { tag: 'tiere', count: 1 },
      { tag: 'natur', count: 1 },
      { tag: 'landschaft', count: 2 },
    ])
  })

  it('nennt keine Tags, die niemand vergeben hat', () => {
    expect(countTags([{ tags: ['segeln'] }])).toEqual([{ tag: 'segeln', count: 1 }])
  })
})

describe('resolveHero', () => {
  it('nimmt das markierte Foto', () => {
    const result = resolveHero([
      { slug: 'a', meta: meta() },
      { slug: 'b', meta: meta({ hero: true }) },
    ])
    expect(result.heroSlug).toBe('b')
    expect(result.issues).toEqual([])
  })

  it('fällt ohne Markierung auf das erste hervorgehobene Foto zurück und warnt', () => {
    const result = resolveHero([
      { slug: 'neu', meta: meta() },
      { slug: 'gewaehlt', meta: meta({ featured: true }) },
    ])
    expect(result.heroSlug).toBe('gewaehlt')
    expect(result.issues[0]?.level).toBe('warn')
  })

  it('nimmt ohne jedes featured das erste Foto der Liste', () => {
    const result = resolveHero([
      { slug: 'erstes', meta: meta() },
      { slug: 'zweites', meta: meta() },
    ])
    expect(result.heroSlug).toBe('erstes')
    expect(result.issues[0]?.level).toBe('warn')
  })

  it('behandelt zwei Hero-Markierungen als Fehler', () => {
    const result = resolveHero([
      { slug: 'a', meta: meta({ hero: true }) },
      { slug: 'b', meta: meta({ hero: true }) },
    ])
    expect(result.issues[0]?.level).toBe('error')
  })

  it('kommt mit einem leeren Bestand zurecht', () => {
    expect(resolveHero([]).heroSlug).toBeNull()
  })
})

describe('buildManifest', () => {
  const photos = [
    { slug: 'alt', meta: meta({ date: '2020-05-05' }), render: render(), sourceHash: 'aaaa1111' },
    {
      slug: 'neu',
      meta: meta({ date: '2024-05-05', hero: true, featured: true, order: 1, tags: ['segeln'] }),
      render: render(),
      sourceHash: 'bbbb2222',
    },
  ]

  it('sortiert, löst den Hero auf und zählt die Tags', () => {
    const { manifest, issues } = buildManifest({
      photos,
      sourceMode: 'content',
      sourceDir: 'content/photos/source',
      generatedAt: '2026-08-29T00:00:00.000Z',
    })
    expect(manifest.photos.map((p) => p.slug)).toEqual(['neu', 'alt'])
    expect(manifest.heroSlug).toBe('neu')
    expect(manifest.tags).toEqual([{ tag: 'segeln', count: 1 }])
    expect(issues).toEqual([])
  })

  it('hält das Feld hero und heroSlug zusammen, egal was in der YAML stand', () => {
    const { manifest } = buildManifest({
      photos: [{ ...photos[0]!, meta: meta({ hero: true }) }, photos[1]!],
      sourceMode: 'demo',
      sourceDir: 'demo-content/photos/source',
    })
    const flagged = manifest.photos.filter((photo) => photo.hero)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]?.slug).toBe(manifest.heroSlug)
  })

  it('warnt, wenn order ohne featured gesetzt ist', () => {
    const { issues } = buildManifest({
      photos: [{ ...photos[0]!, meta: meta({ order: 2, hero: true }) }],
      sourceMode: 'demo',
      sourceDir: 'x',
    })
    expect(issues.some((issue) => issue.message.includes('featured: false'))).toBe(true)
  })

  it('warnt bei doppelt vergebener order', () => {
    const { issues } = buildManifest({
      photos: [
        { ...photos[0]!, meta: meta({ order: 1, featured: true, hero: true }) },
        { ...photos[1]!, meta: meta({ order: 1, featured: true }) },
      ],
      sourceMode: 'demo',
      sourceDir: 'x',
    })
    expect(issues.some((issue) => issue.message.includes('doppelt'))).toBe(true)
  })
})

describe('toIndex', () => {
  it('lässt die Build-Interna weg und behält alles, was das Frontend braucht', () => {
    const { manifest } = buildManifest({
      photos: [{ slug: 'x', meta: meta({ hero: true }), render: render(), sourceHash: 'cccc3333' }],
      sourceMode: 'demo',
      sourceDir: 'demo-content/photos/source',
    })
    const entry = toIndex(manifest).photos[0]!
    expect(Object.keys(entry)).not.toContain('files')
    expect(Object.keys(entry)).not.toContain('sourceHash')
    expect(entry.variants).toEqual({ avif: [480, 960], webp: [480, 960], jpeg: [960] })
    expect(entry.og).toBe('/img/x/og.jpg')
    expect(entry.year).toBe(2024)
  })
})
