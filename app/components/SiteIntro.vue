<template>
  <!-- Present in the prerendered HTML but hidden by CSS: the overlay appears
       only once the head script has set `data-intro`, which needs JavaScript and
       a first visit. A crawler, a reader without scripts and everyone who has
       already chosen a side get the plain page. -->
  <div
    ref="root"
    class="intro"
    :class="[`intro--${phase}`, { 'intro--closing': closing }]"
    role="dialog"
    aria-modal="true"
    :aria-label="t('intro.aria')"
    tabindex="-1"
  >
    <p class="brand">{{ BRAND_NAME }}</p>
    <!-- Wrapped, so the fade sits on something other than the motto itself:
         a class on the component would land on its root and collide with it. -->
    <div class="choice">
      <SiteMotto as="p" @choose="close" />
    </div>
    <button type="button" class="skip" @click="skip">{{ t('intro.skip') }}</button>
  </div>
</template>

<script setup lang="ts">
import { BRAND_NAME } from '#shared/constants/brand'

/**
 * The start of a first visit: the wordmark, then the clip, then the choice
 * between light and shadow. An overlay rather than a route, so the page itself
 * stays in the document and in the index — the layout only stops painting it
 * (`html[data-intro]`) while this is on top.
 */

/** Milliseconds into the sequence at which the clip is released and the choice appears. */
const BEAT_CLIP = 1400
const BEAT_CHOICE = 2900

/** The fade-out, in step with `--t-intro`; after it the overlay is gone again. */
const FADE_MS = 900

const { t } = useI18n()
const { theme, setTheme } = useTheme()
const started = useVideoStarted()
const root = useTemplateRef<HTMLElement>('root')

/** 0 wordmark only · 1 clip running · 2 the choice is readable. */
const phase = ref(0)
const closing = ref(false)
const timers: ReturnType<typeof setTimeout>[] = []

onMounted(() => {
  const html = document.documentElement
  // `pending` is the head script's word for "first visit, home page". Anything
  // else — a stored choice, or the failsafe having given up on hydration —
  // means the page below is already the page, and this stays a hidden element.
  if (html.dataset.intro !== 'pending') return
  html.dataset.intro = 'running'
  root.value?.focus({ preventScroll: true })
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('focusin', onFocusIn)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // No beats: the poster stands still and the whole overlay is there at once.
    phase.value = 2
    return
  }
  timers.push(
    setTimeout(() => {
      phase.value = 1
      started.value = true
    }, BEAT_CLIP),
    setTimeout(() => {
      phase.value = 2
    }, BEAT_CHOICE),
  )
})

onBeforeUnmount(() => {
  clearTimers()
  release()
})

function clearTimers() {
  for (const timer of timers) clearTimeout(timer)
  timers.length = 0
}

function release() {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('focusin', onFocusIn)
}

/**
 * The controls the visitor can see. A phase that has not faded in yet is
 * `visibility: hidden`, and something one cannot see must not be tabbed to.
 */
function focusable(): HTMLElement[] {
  const element = root.value
  if (element === null) return []
  return [...element.querySelectorAll('button')].filter(
    (node) => getComputedStyle(node).visibility !== 'hidden',
  )
}

/**
 * Escape leaves, Tab stays. The page below is hidden and therefore out of the
 * tab order, but the skip link is not part of it and the browser's own chrome
 * is not either — so the overlay cycles the focus itself, as a modal must.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    skip()
    return
  }
  if (event.key !== 'Tab') return
  event.preventDefault()
  const targets = focusable()
  if (targets.length === 0) {
    root.value?.focus({ preventScroll: true })
    return
  }
  const step = event.shiftKey ? -1 : 1
  const at = targets.indexOf(document.activeElement as HTMLElement)
  const next = at === -1 ? (event.shiftKey ? targets.length - 1 : 0) : at + step
  targets[(next + targets.length) % targets.length]?.focus()
}

/** Anything that takes the focus from outside — a click, a return from the
 *  browser chrome — hands it straight back. */
function onFocusIn(event: FocusEvent) {
  const element = root.value
  if (element !== null && !element.contains(event.target as Node)) {
    element.focus({ preventScroll: true })
  }
}

/**
 * Drops the gate immediately — the page beneath becomes visible — and keeps the
 * overlay on screen for one fade, so the two mottos cross over rather than cut.
 */
function close() {
  if (closing.value) return
  clearTimers()
  release()
  closing.value = true
  delete document.documentElement.dataset.intro
  // Tracked like the beats: a navigation during the fade would otherwise leave
  // this firing into a component that no longer exists.
  timers.push(
    setTimeout(() => {
      closing.value = false
    }, FADE_MS),
  )
}

/**
 * Skipping stores the palette the visitor is already looking at. Without that
 * the gate would stand there again on the next visit, which is the one thing
 * the stored choice exists to prevent.
 */
function skip() {
  setTheme(theme.value)
  close()
}
</script>

<style scoped>
/* Hidden by default, in every context but the one the head script marks. The
   `visibility` line undoes the layout's blanket rule for this element only. */
.intro {
  display: none;
}

html[data-intro] .intro,
.intro--closing {
  display: flex;
  visibility: visible;
  position: fixed;
  inset: 0;
  z-index: 90;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  padding: var(--space-4);
}

/* Phase 0 is opaque: the clip and the page are both behind it, and the wordmark
   has the screen to itself. From phase 1 the background is gone and the clip,
   which lies below the overlay, is what one sees. */
.intro::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-bg);
  transition: opacity var(--t-intro);
}

.intro--1::before,
.intro--2::before {
  opacity: 0;
}

.intro > * {
  position: relative;
}

.brand {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 600;
  /* Placeholder size and face; the display face is P11's job. */
  font-size: clamp(28px, 7vw, 64px);
  line-height: 1.1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text);
  animation: intro-in var(--t-intro) both;
}

/* The choice fades in slowly and last. `visibility`, not only an opacity: an
   invisible control must not take a click *or* a keystroke, and
   `pointer-events` stops the pointer alone. */
.choice {
  opacity: 0;
  visibility: hidden;
  transition: opacity 1200ms ease;
}

.choice :deep(.motto) {
  font-size: clamp(32px, 9vw, 88px);
}

.intro--2 .choice {
  opacity: 1;
  visibility: visible;
}

/* Over a moving picture a change of colour is not a focus indicator. */
.choice :deep(.word:focus-visible) {
  outline: 1px solid var(--color-text);
  outline-offset: 6px;
}

.skip {
  position: absolute;
  bottom: var(--space-4);
  padding: var(--space-1) var(--space-2);
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--text-ui-size);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-faint);
  cursor: pointer;
  /* Visible from the first frame: for the length of the wordmark beat it is the
     only way out of a gate that covers the whole page, and a control one cannot
     see is worse than a visible one nobody uses. Its own ground, because from
     the second beat it stands over the clip. */
  background: var(--color-bg);
  transition: color var(--t-fast);
}

.skip:hover,
.skip:focus-visible {
  color: var(--color-text);
}

.intro--closing {
  opacity: 0;
  /* A click during the fade belongs to the page underneath. */
  pointer-events: none;
  transition: opacity var(--t-intro);
}

@keyframes intro-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Under `reduce` the whole overlay is simply there: no beats, no fades. The
   global rule in base.css already shortens every transition; these two undo the
   states that would otherwise leave the choice invisible. */
@media (prefers-reduced-motion: reduce) {
  .choice {
    opacity: 1;
    visibility: visible;
  }
}
</style>
