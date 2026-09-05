<template>
  <div class="backdrop" aria-hidden="true">
    <video
      ref="clip"
      class="clip"
      :class="{ 'clip--swapping': swapping }"
      muted
      loop
      playsinline
      preload="none"
    >
      <source v-for="source in sources" :key="source.src" :src="source.src" :type="source.type" />
    </video>
    <div class="scrim"></div>
  </div>
</template>

<script setup lang="ts">
import { THEME_CLIPS } from '#shared/constants/video'
import type { VideoSource } from '#shared/utils/video'

/**
 * The start page's moving background. Poster first, clip second: the `<source>`
 * elements only appear once the page has decided to play, so reduced motion and
 * a data saver cost nothing but the poster frame — and a browser without
 * JavaScript sees exactly that poster.
 *
 * The slug comes from the palette, so a theme switch swaps the picture too. Only
 * ever the one that is on: the other clip is never preloaded, and the outgoing
 * one leaves through a fade rather than a cut.
 */
const props = defineProps<{ slug: string }>()

/**
 * The still frame is the stylesheet's, not the `poster` attribute's. The server
 * cannot know the palette, so a `poster` baked into the prerendered HTML is the
 * wrong picture for anyone whose system asks for the other one — and it is
 * fetched before the swap can correct it. As a background image the palette
 * picks it in CSS, before the first paint and without JavaScript, and exactly
 * one of the two is ever downloaded. Both come from the same constant the clips
 * do, so there is still one place where a slug is written down.
 */
const posterDark = `url("${posterUrl(THEME_CLIPS.dark)}")`
const posterLight = `url("${posterUrl(THEME_CLIPS.light)}")`

/** In step with `--t-clip`: how long the outgoing picture takes to go. */
const FADE_MS = 320

const started = useVideoStarted()
const clip = useTemplateRef<HTMLVideoElement>('clip')
const sources = ref<VideoSource[]>([])
const swapping = ref(false)
const allowed = ref(false)

/** Read once, on mount: the rendition is chosen for the viewport the visit began in. */
let viewport = 0
let fade: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  viewport = window.innerWidth
  allowed.value = !reducedMotion() && !savesData()
  // With an intro on screen the wordmark comes first and the intro releases the
  // clip; without one there is nothing to wait for.
  if (allowed.value && document.documentElement.dataset.intro === undefined) {
    started.value = true
  }
})

onBeforeUnmount(() => clearTimeout(fade))

watch([allowed, started, () => props.slug], ([mayPlay, wanted]) => {
  if (mayPlay && wanted) void show()
})

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function savesData(): boolean {
  return (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true
}

/**
 * Puts the current palette's clip on screen. A first start is immediate; a
 * switch takes the old picture out first, so the two never cut into each other.
 * The rendition is chosen here rather than through `<source media>`, which every
 * engine reads differently.
 */
async function show(): Promise<void> {
  // Chosen here rather than through `<source media>`: the picked rendition
  // depends on the viewport, and every engine reads that attribute differently.
  const next = videoSources(props.slug, viewport)
  if (next[0]?.src === sources.value[0]?.src) return

  if (sources.value.length > 0) {
    swapping.value = true
    await new Promise((resolve) => {
      fade = setTimeout(resolve, FADE_MS)
    })
  }

  sources.value = next
  await nextTick()
  const element = clip.value
  if (element === null) return
  // The attribute alone does not satisfy every engine's autoplay policy.
  element.muted = true
  element.load()
  try {
    await element.play()
  } catch {
    // A browser that refuses to autoplay keeps showing the poster, which is
    // the same picture standing still.
  }
  swapping.value = false
}
</script>

<style scoped>
/* Full-page background: behind the shell, which goes transparent for it
   (`shell--behind` in the layout), and fixed, so the page scrolls over it. */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.clip {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* `cover` twice over: the still and the moving picture have to sit in the
     frame the same way, or the clip jumps when its first frame arrives. */
  background: var(--color-surface) v-bind(posterDark) center / cover no-repeat;
  transition: opacity var(--t-clip);
}

@media (prefers-color-scheme: light) {
  html:not([data-theme='dark']) .clip {
    background-image: v-bind(posterLight);
  }
}

html[data-theme='light'] .clip {
  background-image: v-bind(posterLight);
}

/* The palette has changed and this picture belongs to the old one. */
.clip--swapping {
  opacity: 0;
}

.scrim {
  position: absolute;
  inset: 0;
  background: var(--video-scrim);
}

/* While the intro is up the page beneath it is not painted — the clip is the
   one part of it that has to be, because the intro fades to reveal it. */
html[data-intro] .backdrop {
  visibility: visible;
}
</style>
