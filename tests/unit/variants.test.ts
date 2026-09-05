import { describe, expect, it } from 'vitest'
import {
  AVIF_BUDGET_KB,
  SHARPEN,
  budgetBytes,
  jpegWidthsFor,
  sharpenFor,
  stepFor,
  widthLadder,
} from '../../scripts/lib/variants.ts'
import { variantUrl } from '../../shared/constants/images.ts'

describe('widthLadder', () => {
  it('produces the four standard steps for a landscape image', () => {
    expect(widthLadder(2560)).toEqual([480, 960, 1600, 2560])
  })

  it('never scales beyond the source', () => {
    expect(widthLadder(980)).toEqual([480, 960])
    expect(widthLadder(1000)).toEqual([480, 960, 1000])
    expect(widthLadder(400)).toEqual([400])
  })

  it('adds the native width of a portrait image as its largest step', () => {
    // 2560 px tall, 3:2 → 1707 px wide. Without this step the largest delivered
    // width would be 1600 and the detail page would have to scale up.
    expect(widthLadder(1707)).toEqual([480, 960, 1600, 1707])
  })

  it('produces no two practically identical steps', () => {
    expect(widthLadder(1610)).toEqual([480, 960, 1600])
    expect(widthLadder(1640)).toEqual([480, 960, 1600, 1640])
  })
})

describe('jpegWidthsFor', () => {
  it('takes the two standard steps where they exist', () => {
    expect(jpegWidthsFor(widthLadder(2560))).toEqual([960, 1600])
    expect(jpegWidthsFor(widthLadder(1707))).toEqual([960, 1600])
    expect(jpegWidthsFor(widthLadder(1000))).toEqual([960])
  })

  it('renders the largest available step as JPEG for a narrow source', () => {
    // Without this case variants.jpeg stays empty and a browser without AVIF and
    // WebP gets no src in the <img> — the photo would simply be gone.
    expect(jpegWidthsFor(widthLadder(800))).toEqual([800])
    expect(jpegWidthsFor(widthLadder(480))).toEqual([480])
    expect(jpegWidthsFor(widthLadder(400))).toEqual([400])
  })

  it('stays below 1600 px — a JPEG at maximum size would be pure waste', () => {
    expect(jpegWidthsFor([1707])).toEqual([])
    expect(jpegWidthsFor([])).toEqual([])
  })
})

describe('stepFor', () => {
  it('maps every width to its matching standard step', () => {
    expect(stepFor(480)).toBe(480)
    expect(stepFor(960)).toBe(960)
    expect(stepFor(1600)).toBe(1600)
    expect(stepFor(1707)).toBe(2560)
    expect(stepFor(2560)).toBe(2560)
  })
})

describe('sharpenFor', () => {
  it('does not sharpen the largest step', () => {
    expect(sharpenFor(2560, 2560)).toBeNull()
    expect(sharpenFor(1707, 1707)).toBeNull()
  })

  it('sharpens smaller steps the more they were scaled down', () => {
    expect(sharpenFor(480, 2560)).toEqual(SHARPEN[480])
    expect(sharpenFor(1600, 2560)).toEqual(SHARPEN[1600])
    expect(sharpenFor(960, 2560)!.m2).toBeGreaterThan(sharpenFor(1600, 2560)!.m2)
  })
})

describe('budgetBytes', () => {
  it('hits the table value for a 3:2 landscape image', () => {
    const budget = budgetBytes(1600, Math.round(1600 / 1.5))
    expect(budget / 1024).toBeCloseTo(AVIF_BUDGET_KB[1600], 0)
  })

  it('gives a portrait image more room at the same width — it has more pixels', () => {
    const landscape = budgetBytes(960, 640)
    const portrait = budgetBytes(960, 1440)
    expect(portrait / landscape).toBeCloseTo(2.25, 2)
  })

  it('scales linearly with the factor', () => {
    expect(budgetBytes(960, 640, 1.35) / budgetBytes(960, 640)).toBeCloseTo(1.35, 5)
  })
})

describe('URL convention', () => {
  it('builds paths from slug, width and format', () => {
    expect(variantUrl('hafen-am-morgen', 960, 'avif')).toBe('/img/hafen-am-morgen/960.avif')
    expect(variantUrl('hafen-am-morgen', 960, 'jpeg')).toBe('/img/hafen-am-morgen/960.jpg')
  })
})
