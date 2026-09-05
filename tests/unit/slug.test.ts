import { describe, expect, it } from 'vitest'
import { isValidSlug, slugFromFilename, slugify } from '../../scripts/lib/slug.ts'

describe('slugify', () => {
  it('schreibt deutsche Sonderzeichen aus, statt sie zu entfernen', () => {
    expect(slugify('Pfütze mit Ahornblatt')).toBe('pfuetze-mit-ahornblatt')
    expect(slugify('Wolkenbank über der Elbe')).toBe('wolkenbank-ueber-der-elbe')
    expect(slugify('Lachmöwen am Geländer')).toBe('lachmoewen-am-gelaender')
    expect(slugify('Schwarzweiß')).toBe('schwarzweiss')
    expect(slugify('Öl über Ähren')).toBe('oel-ueber-aehren')
  })

  it('erkennt auch zerlegt kodierte Umlaute', () => {
    // NFD: u + Kombinierendes Trema. Ohne die Normalisierung vorweg würde
    // daraus „u" statt „ue".
    expect(slugify('Pfütze')).toBe('pfuetze')
  })

  it('entfernt übrige Diakritika', () => {
    expect(slugify('Ilhéus dos Mosteiros')).toBe('ilheus-dos-mosteiros')
    expect(slugify('Ponta da Ferraria — São Miguel')).toBe('ponta-da-ferraria-sao-miguel')
  })

  it('fasst Trennzeichen zusammen und schneidet Ränder ab', () => {
    expect(slugify('Schaf mit Lamm, Deich')).toBe('schaf-mit-lamm-deich')
    expect(slugify('  --Hafen  am   Morgen--  ')).toBe('hafen-am-morgen')
    expect(slugify('03 / 14')).toBe('03-14')
  })

  it('liefert für unbrauchbare Eingaben eine leere Zeichenkette', () => {
    expect(slugify('///')).toBe('')
    expect(slugify('')).toBe('')
  })
})

describe('slugFromFilename', () => {
  it('entfernt die Endung und normalisiert den Rest', () => {
    expect(slugFromFilename('A7_02554_cleanup.jpg')).toBe('a7-02554-cleanup')
    expect(slugFromFilename('_SA44965.JPG')).toBe('sa44965')
    expect(slugFromFilename('DSC00011.jpg')).toBe('dsc00011')
  })
})

describe('isValidSlug', () => {
  it('akzeptiert kleingeschriebenes kebab-case aus ASCII', () => {
    expect(isValidSlug('hafen-am-morgen')).toBe(true)
    expect(isValidSlug('a7-02554-cleanup')).toBe(true)
    expect(isValidSlug('foto')).toBe(true)
  })

  it('lehnt alles ab, was in einer URL Ärger macht', () => {
    for (const bad of ['Hafen', 'hafen_am_morgen', 'hafen--am', '-hafen', 'hafen-', '', 'ölberg']) {
      expect(isValidSlug(bad), bad).toBe(false)
    }
  })
})
