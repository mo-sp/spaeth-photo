import { describe, expect, it } from 'vitest'
import {
  advanceStrip,
  approachVelocity,
  DRIFT_MAX_SPEED,
  driftOrigin,
  driftVelocity,
  nextStripScroll,
  stripSpan,
} from '../usePhotoStrip.ts'

describe('advanceStrip', () => {
  it('advances by speed times the elapsed time', () => {
    expect(advanceStrip(0, 50, 48, 1000)).toBeCloseTo(2.4)
  })

  it('wraps at the span, so the second copy stands where the first one did', () => {
    expect(advanceStrip(998, 50, 48, 1000)).toBeCloseTo(0.4)
  })

  it('drifts left with a negative speed', () => {
    expect(advanceStrip(500, 50, -48, 1000)).toBeCloseTo(497.6)
  })

  it('wraps below zero onto the second copy, so the row is endless to the left too', () => {
    expect(advanceStrip(1, 50, -48, 1000)).toBeCloseTo(998.6)
    expect(advanceStrip(0, 50, -48, 1000)).toBeCloseTo(997.6)
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

describe('driftVelocity', () => {
  // A 1000 px strip: the still zone runs from 400 to 600, the ramp from there to either edge.
  it('stands still around the centre', () => {
    expect(driftVelocity(500, 1000)).toBe(0)
    expect(driftVelocity(420, 1000)).toBe(0)
    expect(driftVelocity(600, 1000)).toBe(0)
  })

  it('drifts towards the side the pointer is on', () => {
    expect(driftVelocity(200, 1000)).toBeLessThan(0)
    expect(driftVelocity(800, 1000)).toBeGreaterThan(0)
    expect(driftVelocity(200, 1000)).toBe(-driftVelocity(800, 1000))
  })

  it('reaches the top speed at either edge', () => {
    expect(driftVelocity(0, 1000)).toBe(-DRIFT_MAX_SPEED)
    expect(driftVelocity(1000, 1000)).toBe(DRIFT_MAX_SPEED)
  })

  it('gets steeper towards the edge', () => {
    // Halfway along the ramp a quadratic gives a quarter of the top speed.
    expect(driftVelocity(800, 1000, 0.1, 320, 2)).toBeCloseTo(80)
    const inner = driftVelocity(700, 1000) - driftVelocity(650, 1000)
    const outer = driftVelocity(950, 1000) - driftVelocity(900, 1000)
    expect(outer).toBeGreaterThan(inner)
  })

  it('holds the top speed for a pointer just outside the measured box', () => {
    expect(driftVelocity(-20, 1000)).toBe(-DRIFT_MAX_SPEED)
    expect(driftVelocity(1020, 1000)).toBe(DRIFT_MAX_SPEED)
  })

  it('stays still while the width is unknown', () => {
    expect(driftVelocity(100, 0)).toBe(0)
  })
})

describe('approachVelocity', () => {
  /** The speed after `ms` of frames at `hz`, starting at `from`, aiming at `to`. */
  function settle(from: number, to: number, ms: number, hz: number) {
    let speed = from
    for (let frame = 0; frame < (ms * hz) / 1000; frame++) {
      speed = approachVelocity(speed, to, 1000 / hz)
    }
    return speed
  }

  it('closes about two thirds of the gap in one time constant', () => {
    expect(approachVelocity(0, 300, 80, 80)).toBeCloseTo(300 * (1 - Math.exp(-1)))
  })

  it('arrives at the same speed at 60 and at 144 Hz', () => {
    expect(settle(0, 320, 500, 144)).toBeCloseTo(settle(0, 320, 500, 60), 6)
    expect(settle(-320, 80, 250, 144)).toBeCloseTo(settle(-320, 80, 250, 60), 6)
  })

  it('brakes towards rest once nothing steers', () => {
    const braking = settle(320, 0, 1500, 144)
    expect(braking).toBeGreaterThan(0)
    expect(braking).toBeLessThan(2)
  })

  it('clamps a long frame gap like the offset does', () => {
    expect(approachVelocity(0, 320, 5000)).toBe(approachVelocity(0, 320, 100))
  })

  it('ignores a negative frame gap', () => {
    expect(approachVelocity(40, 320, -16)).toBe(40)
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
