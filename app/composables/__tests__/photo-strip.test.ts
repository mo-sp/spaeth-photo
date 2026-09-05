import { describe, expect, it } from 'vitest'
import { advanceStrip } from '../usePhotoStrip.ts'

describe('advanceStrip', () => {
  it('advances by speed times the elapsed time', () => {
    expect(advanceStrip(0, 50, 48, 1000)).toBeCloseTo(2.4)
  })

  it('wraps at the span, so the second copy stands where the first one did', () => {
    expect(advanceStrip(998, 50, 48, 1000)).toBeCloseTo(0.4)
  })

  it('clamps a long frame gap: a backgrounded tab must not resume with a jump', () => {
    expect(advanceStrip(0, 5000, 48, 1000)).toBe(advanceStrip(0, 100, 48, 1000))
  })

  it('stays at zero while the span is unknown', () => {
    expect(advanceStrip(120, 16, 48, 0)).toBe(0)
  })

  it('ignores a negative frame gap', () => {
    expect(advanceStrip(120, -16, 48, 1000)).toBe(120)
  })
})
