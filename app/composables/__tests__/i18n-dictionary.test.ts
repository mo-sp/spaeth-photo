import { describe, expect, it } from 'vitest'
import en from '../../i18n/en.json'
import de from '../../i18n/de.json'
import { translate } from '../useI18n.ts'

describe('translate', () => {
  it('returns the string of the requested locale', () => {
    expect(translate('en', 'nav.gallery')).toBe('Gallery')
    expect(translate('de', 'nav.gallery')).toBe('Galerie')
  })

  it('interpolates named placeholders', () => {
    expect(translate('en', 'photo.counter', { n: 3, total: 14 })).toBe('Photo 3 of 14')
  })

  it('leaves a placeholder the caller did not supply in place', () => {
    expect(translate('en', 'gallery.tagTitle', {})).toBe('{tag} – Gallery')
  })

  it('ignores parameters the string does not use', () => {
    expect(translate('en', 'nav.home', { n: 1 })).toBe('Home')
  })

  it('returns the template untouched when no parameters are passed', () => {
    expect(translate('en', 'error.status')).toBe('Error {status}')
  })
})

describe('dictionaries', () => {
  it('define the same keys in both locales', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort())
  })
})
