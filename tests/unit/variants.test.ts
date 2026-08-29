import { describe, expect, it } from 'vitest'
import {
  AVIF_BUDGET_KB,
  SHARPEN,
  budgetBytes,
  sharpenFor,
  stepFor,
  widthLadder,
} from '../../scripts/lib/variants.ts'
import { srcset, variantUrl } from '../../shared/constants/images.ts'

describe('widthLadder', () => {
  it('erzeugt für ein Querformat die vier Regelstufen', () => {
    expect(widthLadder(2560)).toEqual([480, 960, 1600, 2560])
  })

  it('vergrößert nie über die Quelle hinaus', () => {
    expect(widthLadder(980)).toEqual([480, 960])
    expect(widthLadder(1000)).toEqual([480, 960, 1000])
    expect(widthLadder(400)).toEqual([400])
  })

  it('nimmt bei einem Hochformat dessen native Breite als größte Stufe dazu', () => {
    // 2560 px hoch, 3:2 → 1707 px breit. Ohne diese Stufe wäre die größte
    // ausgelieferte Breite 1600 und die Detailseite müsste hochrechnen.
    expect(widthLadder(1707)).toEqual([480, 960, 1600, 1707])
  })

  it('erzeugt keine zwei praktisch gleichen Stufen', () => {
    expect(widthLadder(1610)).toEqual([480, 960, 1600])
    expect(widthLadder(1640)).toEqual([480, 960, 1600, 1640])
  })
})

describe('stepFor', () => {
  it('ordnet jede Breite der passenden Regelstufe zu', () => {
    expect(stepFor(480)).toBe(480)
    expect(stepFor(960)).toBe(960)
    expect(stepFor(1600)).toBe(1600)
    expect(stepFor(1707)).toBe(2560)
    expect(stepFor(2560)).toBe(2560)
  })
})

describe('sharpenFor', () => {
  it('schärft die größte Stufe nicht nach', () => {
    expect(sharpenFor(2560, 2560)).toBeNull()
    expect(sharpenFor(1707, 1707)).toBeNull()
  })

  it('schärft kleinere Stufen umso stärker, je stärker verkleinert wurde', () => {
    expect(sharpenFor(480, 2560)).toEqual(SHARPEN[480])
    expect(sharpenFor(1600, 2560)).toEqual(SHARPEN[1600])
    expect(sharpenFor(960, 2560)!.m2).toBeGreaterThan(sharpenFor(1600, 2560)!.m2)
  })
})

describe('budgetBytes', () => {
  it('trifft bei einem Querformat 3:2 den Tabellenwert', () => {
    const budget = budgetBytes(1600, Math.round(1600 / 1.5))
    expect(budget / 1024).toBeCloseTo(AVIF_BUDGET_KB[1600], 0)
  })

  it('gibt einem Hochformat bei gleicher Breite mehr Platz — es hat mehr Pixel', () => {
    const quer = budgetBytes(960, 640)
    const hoch = budgetBytes(960, 1440)
    expect(hoch / quer).toBeCloseTo(2.25, 2)
  })

  it('skaliert linear mit dem Faktor', () => {
    expect(budgetBytes(960, 640, 1.35) / budgetBytes(960, 640)).toBeCloseTo(1.35, 5)
  })
})

describe('URL-Konvention', () => {
  it('bildet Pfade aus Slug, Breite und Format', () => {
    expect(variantUrl('hafen-am-morgen', 960, 'avif')).toBe('/img/hafen-am-morgen/960.avif')
    expect(variantUrl('hafen-am-morgen', 960, 'jpeg')).toBe('/img/hafen-am-morgen/960.jpg')
  })

  it('baut daraus ein srcset', () => {
    expect(srcset('x', [480, 960], 'webp')).toBe('/img/x/480.webp 480w, /img/x/960.webp 960w')
  })
})
