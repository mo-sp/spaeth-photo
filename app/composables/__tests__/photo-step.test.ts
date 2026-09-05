import { describe, expect, it } from 'vitest'
import { stepFromKey, stepFromSwipe, type StepKeyIntent } from '../usePhotoStepKeys.ts'

function intent(overrides: Partial<StepKeyIntent> = {}): StepKeyIntent {
  return {
    key: 'ArrowLeft',
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    inEditable: false,
    ...overrides,
  }
}

describe('stepFromKey', () => {
  it('maps the two arrow keys to the neighbours', () => {
    expect(stepFromKey(intent({ key: 'ArrowLeft' }))).toBe('prev')
    expect(stepFromKey(intent({ key: 'ArrowRight' }))).toBe('next')
  })

  it('ignores every other key', () => {
    expect(stepFromKey(intent({ key: 'ArrowUp' }))).toBeNull()
    expect(stepFromKey(intent({ key: 'a' }))).toBeNull()
  })

  it('leaves the key to the browser when a modifier is held', () => {
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      expect(stepFromKey(intent({ [modifier]: true }))).toBeNull()
    }
  })

  it('leaves the key to the field when focus is in one', () => {
    expect(stepFromKey(intent({ inEditable: true }))).toBeNull()
  })

  it('stays out of the way of a handler that already acted', () => {
    expect(stepFromKey(intent({ defaultPrevented: true }))).toBeNull()
  })
})

describe('stepFromSwipe', () => {
  it('pulls the next photo in when the finger drags left', () => {
    expect(stepFromSwipe(-120, 0)).toBe('next')
    expect(stepFromSwipe(120, 0)).toBe('prev')
  })

  it('ignores a movement too short to be meant', () => {
    expect(stepFromSwipe(-30, 0)).toBeNull()
  })

  it('ignores a mostly vertical movement, which is a scroll', () => {
    expect(stepFromSwipe(-60, -200)).toBeNull()
  })

  it('accepts a diagonal that is clearly more horizontal than vertical', () => {
    expect(stepFromSwipe(-120, 40)).toBe('next')
  })
})
