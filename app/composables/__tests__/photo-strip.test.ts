import { describe, expect, it } from 'vitest'
import { advanceStrip, driftOrigin, nextStripScroll, stripSpan } from '../usePhotoStrip.ts'

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

describe('driftOrigin', () => {
  it('keeps its own position while scrollLeft only shows it rounded', () => {
    expect(driftOrigin(10.4, 10)).toBe(10.4)
    expect(driftOrigin(10.6, 11)).toBe(10.6)
  })

  it('takes over the offset once the reader has scrolled', () => {
    expect(driftOrigin(10.4, 130)).toBe(130)
    expect(driftOrigin(10.4, 9)).toBe(9)
  })
})

describe('the drift in a browser that rounds scrollLeft', () => {
  const span = 1000
  const dt = 1000 / 144

  /** A scroll container that stores what it is given rounded to whole pixels, as Chromium does. */
  function roundingStrip() {
    let stored = 0
    return {
      get scrollLeft() {
        return stored
      },
      set scrollLeft(value: number) {
        stored = Math.round(value)
      },
    }
  }

  // The regression: reading the step back from scrollLeft loses it every frame
  // once it is under half a pixel, which at 144 Hz and 48 px/s it is.
  it('stands still at 144 Hz when the offset is read back from scrollLeft', () => {
    const strip = roundingStrip()
    for (let frame = 0; frame < 144; frame++) {
      strip.scrollLeft = advanceStrip(strip.scrollLeft, dt, 48, span)
    }
    expect(strip.scrollLeft).toBe(0)
  })

  it('moves at its speed at 144 Hz when it keeps its own position', () => {
    const strip = roundingStrip()
    let position = 0
    for (let frame = 0; frame < 144; frame++) {
      position = advanceStrip(driftOrigin(position, strip.scrollLeft), dt, 48, span)
      strip.scrollLeft = position
    }
    expect(strip.scrollLeft).toBe(48)
  })

  it('continues from where the reader scrolled to', () => {
    const strip = roundingStrip()
    let position = 0
    for (let frame = 0; frame < 72; frame++) {
      position = advanceStrip(driftOrigin(position, strip.scrollLeft), dt, 48, span)
      strip.scrollLeft = position
    }
    strip.scrollLeft = 500
    for (let frame = 0; frame < 72; frame++) {
      position = advanceStrip(driftOrigin(position, strip.scrollLeft), dt, 48, span)
      strip.scrollLeft = position
    }
    expect(strip.scrollLeft).toBe(524)
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
