import { describe, expect, it } from 'vitest'
import { absoluteUrl } from '../url.ts'

describe('absoluteUrl', () => {
  it('setzt Basis und Pfad zusammen', () => {
    expect(absoluteUrl('https://example.org', '/foto/x')).toBe('https://example.org/foto/x')
  })

  it('verträgt einen Schrägstrich am Ende der Basis', () => {
    expect(absoluteUrl('https://example.org/', '/foto/x')).toBe('https://example.org/foto/x')
  })

  it('ergänzt einen fehlenden Schrägstrich am Pfad', () => {
    expect(absoluteUrl('https://example.org', 'foto/x')).toBe('https://example.org/foto/x')
  })

  it('lässt den Pfad relativ, wenn keine Basis konfiguriert ist', () => {
    expect(absoluteUrl('', '/foto/x')).toBe('/foto/x')
    expect(absoluteUrl('  ', '/foto/x')).toBe('/foto/x')
  })
})
