import { describe, expect, it } from 'vitest'
import { LOCALES } from '../i18n.ts'
import { TAG_LABELS, TAG_ORDER, parseTag, tagLabel } from '../tags.ts'

// `parseTag` is the only gatekeeper between a route parameter and the data model:
// whatever passes here counts as a valid tag everywhere else in the frontend.
describe('parseTag', () => {
  it('accepts every tag of the vocabulary', () => {
    for (const tag of TAG_ORDER) expect(parseTag(tag)).toBe(tag)
  })

  it('rejects unknown values', () => {
    expect(parseTag('stadt')).toBeNull()
    expect(parseTag('Sailing')).toBeNull()
    // The German keys of P4-P7 are not an alias for the English ones.
    expect(parseTag('segeln')).toBeNull()
    expect(parseTag('schwarzweiss')).toBeNull()
  })

  it('rejects empty values', () => {
    expect(parseTag('')).toBeNull()
    expect(parseTag(undefined)).toBeNull()
    expect(parseTag(null)).toBeNull()
  })

  it('rejects everything that is not a string', () => {
    // Multiple query parameters (`?tag=a&tag=b`) reach the route as an array.
    expect(parseTag(['sailing'])).toBeNull()
    expect(parseTag(42)).toBeNull()
    expect(parseTag({ tag: 'sailing' })).toBeNull()
  })
})

describe('tagLabel', () => {
  it('returns the label of the requested locale', () => {
    expect(tagLabel('black-and-white', 'en')).toBe('Black & White')
    expect(tagLabel('black-and-white', 'de')).toBe('Schwarzweiß')
    expect(tagLabel('architecture', 'de')).toBe('Architektur')
  })

  it('defaults to English', () => {
    expect(tagLabel('animals')).toBe('Animals')
  })

  it('falls back to the value itself for something unknown', () => {
    expect(tagLabel('stadt')).toBe('stadt')
  })

  it('knows a label for every tag in the order', () => {
    for (const locale of LOCALES) {
      for (const tag of TAG_ORDER) expect(TAG_LABELS[locale][tag]).toBeTruthy()
    }
  })
})
