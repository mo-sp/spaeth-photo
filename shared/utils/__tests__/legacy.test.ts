import { describe, expect, it } from 'vitest'
import { rewriteLegacyPath, rewriteLegacyTag } from '../legacy.ts'

describe('rewriteLegacyPath', () => {
  it('maps every German path of P4-P7', () => {
    expect(rewriteLegacyPath('/galerie')).toBe('/gallery')
    expect(rewriteLegacyPath('/galerie/segeln')).toBe('/gallery/sailing')
    expect(rewriteLegacyPath('/foto/anleger-im-gegenlicht')).toBe('/photo/anleger-im-gegenlicht')
    expect(rewriteLegacyPath('/ueber')).toBe('/about')
    expect(rewriteLegacyPath('/impressum')).toBe('/legal-notice')
    expect(rewriteLegacyPath('/datenschutz')).toBe('/privacy')
  })

  it('leaves current paths alone', () => {
    expect(rewriteLegacyPath('/')).toBeNull()
    expect(rewriteLegacyPath('/gallery')).toBeNull()
    expect(rewriteLegacyPath('/de/gallery')).toBeNull()
  })

  it('matches whole segments only', () => {
    expect(rewriteLegacyPath('/galerien')).toBeNull()
    expect(rewriteLegacyPath('/fotografie')).toBeNull()
  })
})

describe('rewriteLegacyTag', () => {
  it('maps every German tag slug of P4-P7', () => {
    expect(rewriteLegacyTag('tiere')).toBe('animals')
    expect(rewriteLegacyTag('natur')).toBe('nature')
    expect(rewriteLegacyTag('landschaft')).toBe('landscape')
    expect(rewriteLegacyTag('segeln')).toBe('sailing')
    expect(rewriteLegacyTag('schwarzweiss')).toBe('black-and-white')
  })

  it('leaves an English tag alone', () => {
    expect(rewriteLegacyTag('sailing')).toBeNull()
  })
})

describe('rewriteLegacyPath in the German tree', () => {
  it('keeps the /de prefix', () => {
    expect(rewriteLegacyPath('/de/galerie')).toBe('/de/gallery')
    expect(rewriteLegacyPath('/de/ueber')).toBe('/de/about')
  })

  it('rewrites the tag as well as the path', () => {
    expect(rewriteLegacyPath('/de/galerie/segeln')).toBe('/de/gallery/sailing')
  })

  it('rewrites a German tag under an already-current gallery path', () => {
    expect(rewriteLegacyPath('/gallery/segeln')).toBe('/gallery/sailing')
    expect(rewriteLegacyPath('/de/gallery/tiere')).toBe('/de/gallery/animals')
  })

  it('leaves a photo slug alone - they were English from the start', () => {
    expect(rewriteLegacyPath('/foto/anleger-im-gegenlicht')).toBe('/photo/anleger-im-gegenlicht')
  })
})
