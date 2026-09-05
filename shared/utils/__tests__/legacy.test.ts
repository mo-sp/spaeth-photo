import { describe, expect, it } from 'vitest'
import { rewriteLegacyPath } from '../legacy.ts'

describe('rewriteLegacyPath', () => {
  it('maps every German path of P4-P7', () => {
    expect(rewriteLegacyPath('/galerie')).toBe('/gallery')
    expect(rewriteLegacyPath('/galerie/segeln')).toBe('/gallery/segeln')
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
