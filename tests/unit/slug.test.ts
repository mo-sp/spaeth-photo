import { describe, expect, it } from 'vitest'
import { isValidSlug, slugFromFilename, slugify } from '../../scripts/lib/slug.ts'

describe('slugify', () => {
  it('spells out German special characters instead of dropping them', () => {
    expect(slugify('Pfütze mit Ahornblatt')).toBe('pfuetze-mit-ahornblatt')
    expect(slugify('Wolkenbank über der Elbe')).toBe('wolkenbank-ueber-der-elbe')
    expect(slugify('Lachmöwen am Geländer')).toBe('lachmoewen-am-gelaender')
    expect(slugify('Schwarzweiß')).toBe('schwarzweiss')
    expect(slugify('Öl über Ähren')).toBe('oel-ueber-aehren')
  })

  it('recognises decomposed umlauts too', () => {
    // NFD: u + combining diaeresis. Without normalising first this would become
    // "u" instead of "ue".
    expect(slugify('Pfütze')).toBe('pfuetze')
  })

  it('strips the remaining diacritics', () => {
    expect(slugify('Ilhéus dos Mosteiros')).toBe('ilheus-dos-mosteiros')
    expect(slugify('Ponta da Ferraria — São Miguel')).toBe('ponta-da-ferraria-sao-miguel')
  })

  it('collapses separators and trims the edges', () => {
    expect(slugify('Schaf mit Lamm, Deich')).toBe('schaf-mit-lamm-deich')
    expect(slugify('  --Hafen  am   Morgen--  ')).toBe('hafen-am-morgen')
    expect(slugify('03 / 14')).toBe('03-14')
  })

  it('returns an empty string for unusable input', () => {
    expect(slugify('///')).toBe('')
    expect(slugify('')).toBe('')
  })
})

describe('slugFromFilename', () => {
  it('strips the extension and normalises the rest', () => {
    expect(slugFromFilename('A7_02554_cleanup.jpg')).toBe('a7-02554-cleanup')
    expect(slugFromFilename('_SA44965.JPG')).toBe('sa44965')
    expect(slugFromFilename('DSC00011.jpg')).toBe('dsc00011')
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase ASCII kebab-case', () => {
    expect(isValidSlug('hafen-am-morgen')).toBe(true)
    expect(isValidSlug('a7-02554-cleanup')).toBe(true)
    expect(isValidSlug('foto')).toBe(true)
  })

  it('rejects everything that causes trouble in a URL', () => {
    for (const bad of ['Hafen', 'hafen_am_morgen', 'hafen--am', '-hafen', 'hafen-', '', 'ölberg']) {
      expect(isValidSlug(bad), bad).toBe(false)
    }
  })
})
