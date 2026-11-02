import type { ShallowRef } from 'vue'

/**
 * Longest frame gap the loop still integrates. A backgrounded tab resumes with a
 * gap of seconds, and without the clamp the strip would jump on return.
 */
const MAX_FRAME_MS = 100

/** Half-width of the still zone around the strip's centre, as a fraction of its width. */
export const DRIFT_DEAD_ZONE = 0.1

/** Drift speed with the pointer at either edge, in CSS pixels per second. */
export const DRIFT_MAX_SPEED = 320

/** Exponent of the ramp from the still zone to the edge: 2 keeps the inner part slow. */
export const DRIFT_CURVE = 2

/**
 * How far `scrollLeft` may sit from the drift's own position before it counts as
 * the reader's scroll. Browsers round the written offset (Chromium to whole
 * pixels), which moves it by less than this; a wheel notch or a drag moves it by more.
 */
export const RESYNC_PX = 1

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
 * The drift's velocity in px/s for a pointer `x` px from the strip's left edge:
 * negative left of the centre (the offset falls, the view travels left), positive
 * right of it, zero in the still zone, and steeper towards the edges.
 */
export function driftVelocity(
  x: number,
  width: number,
  deadZone = DRIFT_DEAD_ZONE,
  maxSpeed = DRIFT_MAX_SPEED,
  curve = DRIFT_CURVE,
): number {
  if (!(width > 0)) return 0
  const fromCentre = x - width / 2
  const still = deadZone * width
  const ramp = Math.min(1, Math.max(0, (Math.abs(fromCentre) - still) / (width / 2 - still)))
  return ramp === 0 ? 0 : Math.sign(fromCentre) * maxSpeed * ramp ** curve
}

/**
 * Where the drift continues from: its own position, unless `scrollLeft` has moved
 * away from it by a pixel or more — then the reader has scrolled, and the drift
 * takes over the reader's offset instead of pulling the row back.
 */
export function driftOrigin(position: number, scrollLeft: number): number {
  return Math.abs(scrollLeft - position) >= RESYNC_PX ? scrollLeft : position
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
 * where a fine pointer can hover, a drift steered by the pointer: towards the
 * side it is on, faster towards the edge, still around the centre. Both write
 * `scrollLeft`, so they compose instead of fighting, and the drift's wrap makes
 * the row endless in both directions.
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
  /**
   * The drift's offset as a float. `scrollLeft` cannot carry it: Chromium rounds
   * it to whole pixels, so a sub-pixel step per frame (0.4 px at 120 Hz) read back
   * from there is lost every frame and the row stands still.
   */
  let position = 0
  let velocity = 0
  /** Left edge and width of the strip, measured on entry and on resize rather than per event. */
  let bounds: { left: number; width: number } | null = null
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
    if (bounds !== null && strip.value !== null) bounds = measureBounds(strip.value)
  }

  function measureBounds(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, width: rect.width }
  }

  function step(now: number) {
    const element = strip.value
    if (element === null) return
    position = advanceStrip(
      driftOrigin(position, element.scrollLeft),
      now - last,
      velocity,
      measure(element).span,
    )
    element.scrollLeft = position
    last = now
    frame = requestAnimationFrame(step)
  }

  function start() {
    const element = strip.value
    if (frame !== 0 || element === null) return
    position = element.scrollLeft
    last = performance.now()
    frame = requestAnimationFrame(step)
  }

  function stop() {
    if (frame === 0) return
    cancelAnimationFrame(frame)
    frame = 0
  }

  /** Touch has no hover to steer with; its scrolling is the row's own. */
  function steer(event: PointerEvent) {
    if (!animated.value || event.pointerType === 'touch' || bounds === null) return
    velocity = driftVelocity(event.clientX - bounds.left, bounds.width)
  }

  function onPointerEnter(event: PointerEvent) {
    const element = strip.value
    if (!animated.value || event.pointerType === 'touch' || element === null) return
    bounds = measureBounds(element)
    steer(event)
    start()
  }

  function onPointerLeave() {
    bounds = null
    velocity = 0
    stop()
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

  return { animated, onPointerEnter, onPointerMove: steer, onPointerLeave, onWheel }
}
