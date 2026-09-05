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
    @keydown.escape="skip"
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

onBeforeUnmount(clearTimers)

function clearTimers() {
  for (const timer of timers) clearTimeout(timer)
  timers.length = 0
}

/**
 * Drops the gate immediately — the page beneath becomes visible — and keeps the
 * overlay on screen for one fade, so the two mottos cross over rather than cut.
 */
function close() {
  if (closing.value) return
  clearTimers()
  closing.value = true
  delete document.documentElement.dataset.intro
  setTimeout(() => {
    closing.value = false
  }, FADE_MS)
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

/* The choice fades in slowly and last, and is not clickable before it is
   readable — a target one cannot see yet must not take the click. */
.choice {
  opacity: 0;
  pointer-events: none;
  transition: opacity 1200ms ease;
}

.choice :deep(.motto) {
  font-size: clamp(32px, 9vw, 88px);
}

.intro--2 .choice {
  opacity: 1;
  pointer-events: auto;
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
  opacity: 0;
  transition:
    color var(--t-fast),
    opacity var(--t-intro);
}

.intro--2 .skip {
  opacity: 1;
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
    pointer-events: auto;
  }

  .skip {
    opacity: 1;
  }
}
</style>
