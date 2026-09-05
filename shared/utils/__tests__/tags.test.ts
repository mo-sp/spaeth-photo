import { describe, expect, it } from 'vitest'
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
    expect(parseTag('Segeln')).toBeNull()
    expect(parseTag('schwarzweiß')).toBeNull()
  })

  it('weist Leerwerte ab', () => {
    expect(parseTag('')).toBeNull()
    expect(parseTag(undefined)).toBeNull()
    expect(parseTag(null)).toBeNull()
  })

  it('weist alles ab, was kein String ist', () => {
    // Mehrfache Query-Parameter (`?tag=a&tag=b`) erreichen die Route als Array.
    expect(parseTag(['segeln'])).toBeNull()
    expect(parseTag(42)).toBeNull()
    expect(parseTag({ tag: 'segeln' })).toBeNull()
  })
})

describe('tagLabel', () => {
  it('gibt das Anzeige-Label mit Umlaut zurück', () => {
    expect(tagLabel('schwarzweiss')).toBe('Schwarzweiß')
  })

  it('fällt bei Unbekanntem auf den Wert selbst zurück', () => {
    expect(tagLabel('stadt')).toBe('stadt')
  })

  it('kennt für jeden Tag der Reihenfolge ein Label', () => {
    for (const tag of TAG_ORDER) expect(TAG_LABELS[tag]).toBeTruthy()
  })
})
