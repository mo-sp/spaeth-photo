import { describe, expect, it } from 'vitest'
import { parseMeta, renderMetaYaml } from '../../scripts/lib/meta.ts'
import { photoMetaSchema } from '../../scripts/lib/schema.ts'
import type { PhotoMeta } from '../../shared/types/photo.ts'

const complete: PhotoMeta = {
  title: 'Watt bei Sonnenuntergang',
  date: '2020-08-14',
  tags: ['natur', 'landschaft'],
  collection: null,
  camera: 'Sony ILCE-7M4',
  lens: null,
  featured: true,
  hero: false,
  order: 3,
  print: null,
}

describe('photoMetaSchema', () => {
  it('nimmt einen vollständigen Datensatz an', () => {
    expect(photoMetaSchema.parse(complete)).toEqual(complete)
  })

  it('besteht auf Titel und Datum', () => {
    expect(photoMetaSchema.safeParse({ ...complete, title: '   ' }).success).toBe(false)
    expect(photoMetaSchema.safeParse({ ...complete, date: undefined }).success).toBe(false)
  })

  it('lehnt Daten ab, die es nicht gibt', () => {
    expect(photoMetaSchema.safeParse({ ...complete, date: '2025-02-30' }).success).toBe(false)
    expect(photoMetaSchema.safeParse({ ...complete, date: '14.08.2020' }).success).toBe(false)
  })

  it('lässt nur die vereinbarten Tags durch', () => {
    expect(photoMetaSchema.safeParse({ ...complete, tags: ['Tiere'] }).success).toBe(false)
    expect(photoMetaSchema.safeParse({ ...complete, tags: ['stadt'] }).success).toBe(false)
  })

  it('meldet einen unbekannten Schlüssel, statt ihn zu schlucken', () => {
    // Ein Tippfehler soll auffallen — eine Auslassung nicht.
    expect(photoMetaSchema.safeParse({ ...complete, feautred: true }).success).toBe(false)
  })

  it('setzt fehlende Felder auf ihren Standardwert', () => {
    const parsed = photoMetaSchema.parse({ title: 'Ohne alles', date: '2024-01-02' })
    expect(parsed).toEqual({
      title: 'Ohne alles',
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

describe('YAML-Rundlauf', () => {
  it('liest zurück, was es geschrieben hat', () => {
    const parsed = parseMeta(renderMetaYaml(complete))
    expect(parsed.ok && parsed.value).toEqual(complete)
  })

  it('übersteht Anführungszeichen und Doppelpunkte im Titel', () => {
    const tricky: PhotoMeta = { ...complete, title: 'Der "Anleger": Licht & Schatten' }
    const parsed = parseMeta(renderMetaYaml(tricky))
    expect(parsed.ok && parsed.value.title).toBe(tricky.title)
  })

  it('sortiert Tags in die kanonische Reihenfolge', () => {
    const parsed = parseMeta(renderMetaYaml({ ...complete, tags: ['landschaft', 'tiere'] }))
    expect(parsed.ok && parsed.value.tags).toEqual(['tiere', 'landschaft'])
  })

  it('nennt den Pfad, wenn etwas nicht stimmt', () => {
    const parsed = parseMeta('title: "x"\ndate: 2024-13-01\n')
    expect(parsed.ok).toBe(false)
    expect(!parsed.ok && parsed.issues.join(' ')).toContain('date')
  })
})
