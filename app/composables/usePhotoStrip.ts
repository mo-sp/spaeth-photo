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
 */
export function advanceStrip(offset: number, dtMs: number, speed: number, span: number): number {
  if (!(span > 0)) return 0
  const dt = Math.min(Math.max(dtMs, 0), MAX_FRAME_MS)
  const next = offset + (speed * dt) / 1000
  return ((next % span) + span) % span
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
  let span = 0

  onMounted(() => {
    const element = strip.value
    if (element === null) return
    animated.value =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      element.scrollWidth > element.clientWidth
  })

  function step(now: number) {
    const element = strip.value
    if (element === null) return
    element.scrollLeft = advanceStrip(element.scrollLeft, now - last, STRIP_SPEED, span)
    last = now
    frame = requestAnimationFrame(step)
  }

  function start() {
    const element = strip.value
    if (!animated.value || frame !== 0 || element === null || track.value === null) return
    // Both copies are in the flow, so one copy plus its trailing gap is half of
    // the scroll width plus half a gap.
    const gap = Number.parseFloat(getComputedStyle(track.value).columnGap) || 0
    span = (element.scrollWidth + gap) / 2
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
   * the row instead — but only while the row can still go that way. At either
   * end the gesture belongs to the page again, which is what keeps the strip
   * from swallowing the scroll of everyone who wanted to read on.
   */
  function onWheel(event: WheelEvent) {
    const element = strip.value
    if (element === null || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const next = element.scrollLeft + event.deltaY
    if (next < 0 || next > element.scrollWidth - element.clientWidth) return
    event.preventDefault()
    element.scrollLeft = next
  }

  onBeforeUnmount(stop)

  return { animated, start, stop, onWheel }
}
