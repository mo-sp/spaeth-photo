import { describe, expect, it } from 'vitest'
import { LOCALES } from '../i18n.ts'
import { TAG_LABELS, TAG_ORDER, parseTag, tagLabel } from '../tags.ts'

/**
 * `parseTag` ist der einzige Torwächter zwischen einem Routenparameter und dem
 * Datenmodell: was hier durchkommt, gilt im Rest des Frontends als gültiger
 * Tag. Deshalb wird jede Eingabeform geprüft, nicht nur der Gutfall.
 */
describe('parseTag', () => {
  it('nimmt jeden Tag des Vokabulars an', () => {
    for (const tag of TAG_ORDER) expect(parseTag(tag)).toBe(tag)
  })

  it('weist unbekannte Werte ab', () => {
    expect(parseTag('stadt')).toBeNull()
    expect(parseTag('Sailing')).toBeNull()
    // The German keys of P4-P7 are not an alias for the English ones.
    expect(parseTag('segeln')).toBeNull()
    expect(parseTag('schwarzweiss')).toBeNull()
  })

  it('weist Leerwerte ab', () => {
    expect(parseTag('')).toBeNull()
    expect(parseTag(undefined)).toBeNull()
    expect(parseTag(null)).toBeNull()
  })

  it('weist alles ab, was kein String ist', () => {
    // Mehrfache Query-Parameter (`?tag=a&tag=b`) erreichen die Route als Array.
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

  it('fällt bei Unbekanntem auf den Wert selbst zurück', () => {
    expect(tagLabel('stadt')).toBe('stadt')
  })

  it('kennt für jeden Tag der Reihenfolge ein Label', () => {
    for (const locale of LOCALES) {
      for (const tag of TAG_ORDER) expect(TAG_LABELS[locale][tag]).toBeTruthy()
    }
  })
})
