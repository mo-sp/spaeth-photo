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
 * Hover-driven motion for `PhotoStrip`. `animated` stays false where the strip
 * must not move by itself — a coarse pointer has no hover to leave, reduced
 * motion is a request rather than a preference, and a list that does not even
 * fill the visible width would show a gap at every wrap. The component then
 * renders a plain scrollable row without the second copy of the list.
 */
export function usePhotoStrip(track: Readonly<ShallowRef<HTMLElement | null>>) {
  const animated = ref(false)
  const offset = ref(0)

  let frame = 0
  let last = 0
  let span = 0

  onMounted(() => {
    const element = track.value
    if (element === null) return
    animated.value =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      element.scrollWidth > element.clientWidth
  })

  function step(now: number) {
    offset.value = advanceStrip(offset.value, now - last, STRIP_SPEED, span)
    last = now
    frame = requestAnimationFrame(step)
  }

  function start() {
    const element = track.value
    if (!animated.value || frame !== 0 || element === null) return
    // Both copies are in the flow, so one copy plus its trailing gap is half of
    // the scroll width plus half a gap.
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0
    span = (element.scrollWidth + gap) / 2
    last = performance.now()
    frame = requestAnimationFrame(step)
  }

  function stop() {
    if (frame === 0) return
    cancelAnimationFrame(frame)
    frame = 0
  }

  onBeforeUnmount(stop)

  return { animated, offset, start, stop }
}
