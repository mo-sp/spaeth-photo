/** The neighbour a gesture asks for. */
export type PhotoStep = 'prev' | 'next'

/**
 * What the decision needs of a `KeyboardEvent` — a plain object, so the rule is
 * testable without a DOM.
 */
export interface StepKeyIntent {
  key: string
  defaultPrevented: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  /** Focus sits in a text field: there the arrows move the caret. */
  inEditable: boolean
}

/** Which neighbour an arrow key asks for, or `null` if the key is not ours. */
export function stepFromKey(intent: StepKeyIntent): PhotoStep | null {
  if (intent.defaultPrevented || intent.inEditable) return null
  // With a modifier the key belongs to the browser (history, word jumps).
  if (intent.altKey || intent.ctrlKey || intent.metaKey || intent.shiftKey) return null
  if (intent.key === 'ArrowLeft') return 'prev'
  if (intent.key === 'ArrowRight') return 'next'
  return null
}

/** Distance a swipe must cover, and how much straighter than a scroll it must run. */
const SWIPE_MIN_PX = 48
const SWIPE_RATIO = 1.6

/** Which neighbour a finger movement asks for, or `null` if it was a scroll or a tap. */
export function stepFromSwipe(dx: number, dy: number): PhotoStep | null {
  if (Math.abs(dx) < SWIPE_MIN_PX) return null
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return null
  // The photo follows the finger: dragging left pulls the next one in.
  return dx < 0 ? 'next' : 'prev'
}

/**
 * Arrow keys on the document and a horizontal swipe on whatever the returned
 * handlers are bound to. `go` reports whether it navigated — only then is the
 * key ours to swallow.
 */
export function usePhotoStepKeys(go: (step: PhotoStep) => boolean) {
  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    const step = stepFromKey({
      key: event.key,
      defaultPrevented: event.defaultPrevented,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      inEditable:
        target !== null &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)),
    })
    if (step === null) return
    if (go(step)) event.preventDefault()
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

  let start: { x: number; y: number } | null = null

  function onTouchStart(event: TouchEvent) {
    // A second finger means a pinch zoom, not a page turn.
    const touch = event.touches.length === 1 ? event.touches[0] : undefined
    start = touch === undefined ? null : { x: touch.clientX, y: touch.clientY }
  }

  function onTouchEnd(event: TouchEvent) {
    const from = start
    start = null
    const touch = event.changedTouches[0]
    if (from === null || touch === undefined) return
    const step = stepFromSwipe(touch.clientX - from.x, touch.clientY - from.y)
    if (step !== null) go(step)
  }

  return { onTouchStart, onTouchEnd }
}
