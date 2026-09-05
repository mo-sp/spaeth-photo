<template>
  <div class="backdrop" aria-hidden="true">
    <video
      ref="clip"
      class="clip"
      :class="{ 'clip--swapping': swapping }"
      :poster="poster"
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

const poster = computed(() => posterUrl(props.slug))

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
  background: var(--color-surface);
  transition: opacity var(--t-clip);
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
