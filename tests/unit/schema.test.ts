import { describe, expect, it } from 'vitest'
import { parseMeta, renderMetaYaml } from '../../scripts/lib/meta.ts'
import { photoMetaSchema } from '../../scripts/lib/schema.ts'
import type { PhotoMeta } from '../../shared/types/photo.ts'

const complete: PhotoMeta = {
  title: 'Mudflats at Sunset',
  title_de: 'Watt bei Sonnenuntergang',
  alt: 'Channels in wet sand, the low sun over the North Sea behind them',
  alt_de: 'Priele im nassen Sand, dahinter die tief stehende Sonne über der Nordsee',
  date: '2020-08-14',
  tags: ['nature', 'landscape'],
  collection: null,
  camera: 'Sony ILCE-7M4',
  lens: null,
  featured: true,
  hero: false,
  order: 3,
  print: null,
}

describe('photoMetaSchema', () => {
  it('accepts a complete record', () => {
    expect(photoMetaSchema.parse(complete)).toEqual(complete)
  })

  it('insists on title and date', () => {
    expect(photoMetaSchema.safeParse({ ...complete, title: '   ' }).success).toBe(false)
    expect(photoMetaSchema.safeParse({ ...complete, date: undefined }).success).toBe(false)
  })

  it('rejects dates that do not exist', () => {
    expect(photoMetaSchema.safeParse({ ...complete, date: '2025-02-30' }).success).toBe(false)
    expect(photoMetaSchema.safeParse({ ...complete, date: '14.08.2020' }).success).toBe(false)
  })

  it('lets only the agreed tags through', () => {
    expect(photoMetaSchema.safeParse({ ...complete, tags: ['Tiere'] }).success).toBe(false)
    expect(photoMetaSchema.safeParse({ ...complete, tags: ['stadt'] }).success).toBe(false)
  })

  it('reports an unknown key instead of swallowing it', () => {
    // A typo should stand out — an omission should not.
    expect(photoMetaSchema.safeParse({ ...complete, feautred: true }).success).toBe(false)
  })

  it('sets missing fields to their default', () => {
    const parsed = photoMetaSchema.parse({ title: 'Bare minimum', date: '2024-01-02' })
    expect(parsed).toEqual({
      title: 'Bare minimum',
      title_de: null,
      alt: null,
      alt_de: null,
      date: '2024-01-02',
      tags: [],
      collection: null,
      camera: null,
      lens: null,
      featured: false,
      hero: false,
      order: null,
      print: null,
    })
  })
})

describe('YAML round trip', () => {
  it('reads back what it wrote', () => {
    const parsed = parseMeta(renderMetaYaml(complete))
    expect(parsed.ok && parsed.value).toEqual(complete)
  })

  it('survives quotes and colons in the title', () => {
    const tricky: PhotoMeta = { ...complete, title: 'The "Jetty": Light & Shadow' }
    const parsed = parseMeta(renderMetaYaml(tricky))
    expect(parsed.ok && parsed.value.title).toBe(tricky.title)
  })

  it('leaves out the image description when none is set', () => {
    const parsed = parseMeta(renderMetaYaml({ ...complete, alt: null }))
    expect(parsed.ok && parsed.value.alt).toBeNull()
  })

  it('keeps the German title and description optional', () => {
    const parsed = parseMeta(renderMetaYaml({ ...complete, title_de: null, alt_de: null }))
    expect(parsed.ok && parsed.value.title_de).toBeNull()
    expect(parsed.ok && parsed.value.alt_de).toBeNull()
  })

  it('sorts tags into the canonical order', () => {
    const parsed = parseMeta(renderMetaYaml({ ...complete, tags: ['landscape', 'animals'] }))
    expect(parsed.ok && parsed.value.tags).toEqual(['animals', 'landscape'])
  })

  it('names the path when something is wrong', () => {
    const parsed = parseMeta('title: "x"\ndate: 2024-13-01\n')
    expect(parsed.ok).toBe(false)
    expect(!parsed.ok && parsed.issues.join(' ')).toContain('date')
  })
})
