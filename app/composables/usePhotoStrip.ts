import type { ShallowRef } from 'vue'

/**
 * Longest frame gap the loop still integrates. A backgrounded tab resumes with a
 * gap of seconds, and without the clamp the strip would jump on return.
 */
const MAX_FRAME_MS = 100

/** Scroll speed of the strip in CSS pixels per second. */
export const STRIP_SPEED = 48

/**
 * The strip's offset after `dtMs`, wrapped into `[0, span)`. `span` is the width
 * of one copy of the list including its trailing gap, so wrapping there puts the
 * second copy exactly where the first one stood — the seam is never visible.
 *
 * The wrap is a jump of one whole copy in `scrollLeft`, and it is invisible for
 * that reason alone: at offset `span` the pixels under the viewport are the
 * second copy, at offset 0 they are the first, and the two are the same list at
 * the same widths. Nothing on screen moves; only the number does.
 */
export function advanceStrip(offset: number, dtMs: number, speed: number, span: number): number {
  if (!(span > 0)) return 0
  const dt = Math.min(Math.max(dtMs, 0), MAX_FRAME_MS)
  const next = offset + (speed * dt) / 1000
  return ((next % span) + span) % span
}

/**
 * Where a wheel gesture leaves the strip: the offset plus the vertical delta,
 * clamped to the scrollable range. Clamped rather than refused — the last
 * fraction of a notch at either end has to be reachable too.
 */
export function nextStripScroll(scrollLeft: number, deltaY: number, max: number): number {
  return Math.max(0, Math.min(max, scrollLeft + deltaY))
}

/**
 * The width of one copy of the list including its trailing gap. Both copies are
 * in the flow, so one copy plus its gap is half of the scroll width plus half a
 * gap — which is the distance the drift wraps at.
 */
export function stripSpan(scrollWidth: number, gap: number): number {
  return (scrollWidth + gap) / 2
}

/**
 * The gallery strip's motion. Two things move the same position: the reader —
 * by touch, trackpad or wheel, which is the row's own native scrolling — and,
 * where a fine pointer can hover, a slow drift while the pointer rests on it.
 * Both write `scrollLeft`, so they compose instead of fighting, and the drift's
 * wrap makes the row endless in the direction it travels.
 *
 * `animated` stays false where the drift must not run: a coarse pointer has no
 * hover to leave, reduced motion is a request rather than a preference, and a
 * list that does not even fill the visible width would show a gap at every
 * wrap. The component then renders a plain scrollable row without the second
 * copy of the list.
 */
export function usePhotoStrip(
  strip: Readonly<ShallowRef<HTMLElement | null>>,
  track: Readonly<ShallowRef<HTMLElement | null>>,
) {
  const animated = ref(false)

  let frame = 0
  let last = 0
  let metrics: { span: number; max: number } | null = null

  onMounted(() => {
    const element = strip.value
    if (element === null) return
    animated.value =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      element.scrollWidth > element.clientWidth
    window.addEventListener('resize', forget, { passive: true })
  })

  /**
   * Both measurements come from the layout, and a wheel event is not the place
   * to ask for them: read once per gesture series and kept until the width the
   * visible part is measured against can have changed.
   */
  function measure(element: HTMLElement) {
    if (metrics === null) {
      const gap =
        track.value === null ? 0 : Number.parseFloat(getComputedStyle(track.value).columnGap) || 0
      metrics = {
        span: stripSpan(element.scrollWidth, gap),
        max: Math.max(0, element.scrollWidth - element.clientWidth),
      }
    }
    return metrics
  }

  function forget() {
    metrics = null
  }

  function step(now: number) {
    const element = strip.value
    if (element === null) return
    element.scrollLeft = advanceStrip(
      element.scrollLeft,
      now - last,
      STRIP_SPEED,
      measure(element).span,
    )
    last = now
    frame = requestAnimationFrame(step)
  }

  function start() {
    const element = strip.value
    if (!animated.value || frame !== 0 || element === null) return
    last = performance.now()
    frame = requestAnimationFrame(step)
  }

  function stop() {
    if (frame === 0) return
    cancelAnimationFrame(frame)
    frame = 0
  }

  /**
   * A plain mouse wheel has no horizontal axis, so its vertical delta drives
   * the row instead. The gesture is taken only where it moves something: at
   * either end the row is already there and the scroll belongs to the page
   * again, which is what keeps the strip from swallowing the scroll of everyone
   * who wanted to read on.
   */
  function onWheel(event: WheelEvent) {
    const element = strip.value
    if (element === null || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const next = nextStripScroll(element.scrollLeft, event.deltaY, measure(element).max)
    if (next === element.scrollLeft) return
    event.preventDefault()
    element.scrollLeft = next
  }

  onBeforeUnmount(() => {
    stop()
    window.removeEventListener('resize', forget)
  })

  return { animated, start, stop, onWheel }
}
