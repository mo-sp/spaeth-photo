import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  LOCALE_TAGS,
  OG_LOCALES,
  localeLinks,
  localeOf,
  localePath,
  stripLocale,
} from '../i18n.ts'

describe('localeOf', () => {
  it('reads the prefix as a whole segment', () => {
    expect(localeOf('/de')).toBe('de')
    expect(localeOf('/de/')).toBe('de')
    expect(localeOf('/de/gallery')).toBe('de')
    expect(localeOf('/de/photo/moss-on-deadwood')).toBe('de')
  })

  it('does not mistake an English path that starts with the same letters', () => {
    // The reason `startsWith('/de')` is never used anywhere in this module.
    expect(localeOf('/design')).toBe('en')
    expect(localeOf('/de-luxe')).toBe('en')
    expect(localeOf('/dessert/gallery')).toBe('en')
  })

  it('falls back to the default locale', () => {
    expect(localeOf('/')).toBe('en')
    expect(localeOf('/gallery/sailing')).toBe('en')
    expect(localeOf('/fr/gallery')).toBe('en')
  })
})

describe('stripLocale', () => {
  it('removes the prefix', () => {
    expect(stripLocale('/de/gallery')).toBe('/gallery')
    expect(stripLocale('/de/gallery/black-and-white')).toBe('/gallery/black-and-white')
  })

  it('turns the German home page back into the root', () => {
    expect(stripLocale('/de')).toBe('/')
    expect(stripLocale('/de/')).toBe('/')
  })

  it('leaves English paths untouched', () => {
    expect(stripLocale('/')).toBe('/')
    expect(stripLocale('/gallery')).toBe('/gallery')
    expect(stripLocale('/design')).toBe('/design')
  })
})

describe('localePath', () => {
  it('prefixes the non-default locale', () => {
    expect(localePath('/gallery', 'de')).toBe('/de/gallery')
    expect(localePath('/', 'de')).toBe('/de')
  })

  it('strips the prefix for the default locale', () => {
    expect(localePath('/de/gallery', 'en')).toBe('/gallery')
    expect(localePath('/de', 'en')).toBe('/')
    expect(localePath('/gallery', 'en')).toBe('/gallery')
  })

  it('accepts a path that is already in the target locale', () => {
    expect(localePath('/de/about', 'de')).toBe('/de/about')
  })

  it('round-trips every locale', () => {
    for (const locale of LOCALES) {
      expect(stripLocale(localePath('/gallery/sailing', locale))).toBe('/gallery/sailing')
      expect(localeOf(localePath('/gallery/sailing', locale))).toBe(locale)
    }
  })
})

describe('locale tables', () => {
  it('covers every locale', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_TAGS[locale]).toBeTruthy()
      expect(OG_LOCALES[locale]).toBeTruthy()
      expect(LOCALE_NAMES[locale]).toBeTruthy()
    }
  })

  it('has the default locale in the list', () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE)
  })
})

describe('localeLinks', () => {
  it('offers every locale and marks the current one', () => {
    expect(localeLinks('/gallery', 'en')).toEqual([
      { locale: 'en', tag: 'en', name: 'English', to: '/gallery', active: true },
      { locale: 'de', tag: 'de', name: 'Deutsch', to: '/de/gallery', active: false },
    ])
  })

  it('drops the query - a filter or an open lightbox is a view, not a page', () => {
    expect(localeLinks('/gallery/sailing?foto=x', 'en').map((link) => link.to)).toEqual([
      '/gallery/sailing',
      '/de/gallery/sailing',
    ])
  })

  it('drops the hash too', () => {
    expect(localeLinks('/about#contact', 'de').map((link) => link.to)).toEqual([
      '/about',
      '/de/about',
    ])
  })

  it('stays on the same page when given a German path', () => {
    expect(localeLinks('/de/photo/a', 'de').map((link) => link.to)).toEqual([
      '/photo/a',
      '/de/photo/a',
    ])
  })
})
