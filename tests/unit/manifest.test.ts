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
    title: 'Title',
    title_de: null,
    alt: null,
    alt_de: null,
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
  it('sorts by date, newest first', () => {
    const list = [
      { date: '2020-01-01', slug: 'old' },
      { date: '2024-06-01', slug: 'new' },
      { date: '2022-03-03', slug: 'middle' },
    ]
    expect([...list].sort(comparePhotos).map((p) => p.slug)).toEqual(['new', 'middle', 'old'])
  })

  it('breaks a tie on the same date by slug', () => {
    const list = [
      { date: '2024-01-01', slug: 'beta' },
      { date: '2024-01-01', slug: 'alpha' },
    ]
    expect([...list].sort(comparePhotos).map((p) => p.slug)).toEqual(['alpha', 'beta'])
  })
})

describe('countTags', () => {
  it('counts and keeps the canonical order, not the order of appearance', () => {
    expect(
      countTags([
        { tags: ['landscape', 'nature'] },
        { tags: ['animals'] },
        { tags: ['landscape'] },
      ]),
    ).toEqual([
      { tag: 'animals', count: 1 },
      { tag: 'nature', count: 1 },
      { tag: 'landscape', count: 2 },
    ])
  })

  it('does not name tags nobody has assigned', () => {
    expect(countTags([{ tags: ['sailing'] }])).toEqual([{ tag: 'sailing', count: 1 }])
  })
})

describe('resolveHero', () => {
  it('takes the marked photo', () => {
    const result = resolveHero([
      { slug: 'a', meta: meta() },
      { slug: 'b', meta: meta({ hero: true }) },
    ])
    expect(result.heroSlug).toBe('b')
    expect(result.issues).toEqual([])
  })

  it('falls back to the first featured photo without a marker, and warns', () => {
    const result = resolveHero([
      { slug: 'new', meta: meta() },
      { slug: 'gewaehlt', meta: meta({ featured: true }) },
    ])
    expect(result.heroSlug).toBe('gewaehlt')
    expect(result.issues[0]?.level).toBe('warn')
  })

  it('takes the first photo of the list when nothing is featured', () => {
    const result = resolveHero([
      { slug: 'erstes', meta: meta() },
      { slug: 'zweites', meta: meta() },
    ])
    expect(result.heroSlug).toBe('erstes')
    expect(result.issues[0]?.level).toBe('warn')
  })

  it('treats two hero markers as an error', () => {
    const result = resolveHero([
      { slug: 'a', meta: meta({ hero: true }) },
      { slug: 'b', meta: meta({ hero: true }) },
    ])
    expect(result.issues[0]?.level).toBe('error')
  })

  it('copes with an empty set', () => {
    expect(resolveHero([]).heroSlug).toBeNull()
  })
})

describe('buildManifest', () => {
  const photos = [
    { slug: 'old', meta: meta({ date: '2020-05-05' }), render: render(), sourceHash: 'aaaa1111' },
    {
      slug: 'new',
      meta: meta({ date: '2024-05-05', hero: true, featured: true, order: 1, tags: ['sailing'] }),
      render: render(),
      sourceHash: 'bbbb2222',
    },
  ]

  it('sorts, resolves the hero and counts the tags', () => {
    const { manifest, issues } = buildManifest({
      photos,
      sourceMode: 'content',
      sourceDir: 'content/photos/source',
      generatedAt: '2026-08-29T00:00:00.000Z',
    })
    expect(manifest.photos.map((p) => p.slug)).toEqual(['new', 'old'])
    expect(manifest.heroSlug).toBe('new')
    expect(manifest.tags).toEqual([{ tag: 'sailing', count: 1 }])
    expect(issues).toEqual([])
  })

  it('keeps the hero field and heroSlug in step, whatever the YAML said', () => {
    const { manifest } = buildManifest({
      photos: [{ ...photos[0]!, meta: meta({ hero: true }) }, photos[1]!],
      sourceMode: 'demo',
      sourceDir: 'demo-content/photos/source',
    })
    const flagged = manifest.photos.filter((photo) => photo.hero)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]?.slug).toBe(manifest.heroSlug)
  })

  it('warns when order is set without featured', () => {
    const { issues } = buildManifest({
      photos: [{ ...photos[0]!, meta: meta({ order: 2, hero: true }) }],
      sourceMode: 'demo',
      sourceDir: 'x',
    })
    expect(issues.some((issue) => issue.message.includes('featured: false'))).toBe(true)
  })

  it('warns about a duplicate order', () => {
    const { issues } = buildManifest({
      photos: [
        { ...photos[0]!, meta: meta({ order: 1, featured: true, hero: true }) },
        { ...photos[1]!, meta: meta({ order: 1, featured: true }) },
      ],
      sourceMode: 'demo',
      sourceDir: 'x',
    })
    expect(issues.some((issue) => issue.message.includes('is used twice'))).toBe(true)
  })
})

describe('toIndex', () => {
  it('drops the build internals and keeps everything the frontend needs', () => {
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
