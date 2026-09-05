import { describe, expect, it } from 'vitest'
import { absoluteUrl } from '../url.ts'

describe('absoluteUrl', () => {
  it('joins base and path', () => {
    expect(absoluteUrl('https://example.org', '/foto/x')).toBe('https://example.org/foto/x')
  })

  it('tolerates a trailing slash on the base', () => {
    expect(absoluteUrl('https://example.org/', '/foto/x')).toBe('https://example.org/foto/x')
  })

  it('adds a missing leading slash to the path', () => {
    expect(absoluteUrl('https://example.org', 'foto/x')).toBe('https://example.org/foto/x')
  })

  it('leaves the path relative when no base is configured', () => {
    expect(absoluteUrl('', '/foto/x')).toBe('/foto/x')
    expect(absoluteUrl('  ', '/foto/x')).toBe('/foto/x')
  })
})
