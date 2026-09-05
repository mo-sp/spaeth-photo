import { describe, expect, it } from 'vitest'
import { advanceStrip, nextStripScroll, stripSpan } from '../usePhotoStrip.ts'

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

describe('nextStripScroll', () => {
  it('moves the row by the vertical delta of the wheel', () => {
    expect(nextStripScroll(200, 120, 1000)).toBe(320)
    expect(nextStripScroll(200, -120, 1000)).toBe(80)
  })

  // The regression: a notch that overshot the end used to be refused entirely,
  // so the last stretch of the row was unreachable and the gesture was lost
  // with it — the strip moved nothing and the page did not scroll either.
  it('reaches the end from less than one notch away', () => {
    expect(nextStripScroll(960, 120, 1000)).toBe(1000)
    expect(nextStripScroll(40, -120, 1000)).toBe(0)
  })

  it('reports no movement once the row is already at an end', () => {
    expect(nextStripScroll(1000, 120, 1000)).toBe(1000)
    expect(nextStripScroll(0, -120, 1000)).toBe(0)
  })

  it('stays at zero where there is nothing to scroll', () => {
    expect(nextStripScroll(0, 120, 0)).toBe(0)
  })
})

describe('stripSpan', () => {
  it('is one copy of the list plus its trailing gap', () => {
    // Two copies of 3 cells at 100 px with an 8 px gap: 6 cells, 5 inner gaps.
    expect(stripSpan(6 * 100 + 5 * 8, 8)).toBe(324)
    expect(stripSpan(6 * 100 + 5 * 8, 8) * 2 - 8).toBe(6 * 100 + 5 * 8)
  })

  it('handles a row without a gap', () => {
    expect(stripSpan(600, 0)).toBe(300)
  })
})
