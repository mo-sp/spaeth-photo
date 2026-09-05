<template>
  <div class="backdrop" :class="`backdrop--${variant}`" aria-hidden="true">
    <video ref="clip" class="clip" :poster="poster" muted loop playsinline preload="none">
      <source v-for="source in sources" :key="source.src" :src="source.src" :type="source.type" />
    </video>
    <div class="scrim"></div>
  </div>
</template>

<script setup lang="ts">
import type { VideoSource } from '#shared/utils/video'
import type { VideoVariant } from '~/composables/useSiteVideo'

/**
 * The start page's moving background. Poster first, clip second: the `<source>`
 * elements only appear once the page has decided to play, so reduced motion and
 * a data saver cost nothing but the poster frame — and a browser without
 * JavaScript sees exactly that poster.
 */
const props = defineProps<{ slug: string; variant: VideoVariant }>()

const started = useVideoStarted()
const clip = useTemplateRef<HTMLVideoElement>('clip')
const sources = ref<VideoSource[]>([])
const allowed = ref(false)

const poster = computed(() => posterUrl(props.slug))

onMounted(() => {
  allowed.value = !reducedMotion() && !savesData()
  // With an intro on screen the wordmark comes first and the intro releases the
  // clip; without one there is nothing to wait for.
  if (allowed.value && document.documentElement.dataset.intro === undefined) {
    started.value = true
  }
})

watch([allowed, started], ([mayPlay, wanted]) => {
  if (mayPlay && wanted) void play()
})

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function savesData(): boolean {
  return (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true
}

async function play(): Promise<void> {
  if (sources.value.length > 0) return
  // Chosen here rather than through `<source media>`: the picked rendition
  // depends on the viewport, and every engine reads that attribute differently.
  sources.value = videoSources(props.slug, window.innerWidth)
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
}
</script>

<style scoped>
.clip {
  display: block;
  width: 100%;
  object-fit: cover;
  background: var(--color-surface);
}

.scrim {
  position: absolute;
  inset: 0;
}

/* Full-page background: behind the shell, which goes transparent for it
   (`shell--behind` in the layout), and fixed, so the page scrolls over it. */
.backdrop--full {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.backdrop--full .clip {
  height: 100%;
}

.backdrop--full .scrim {
  background: var(--video-scrim);
}

/* While the intro is up the page beneath it is not painted — the clip is the
   one part of it that has to be, because the intro fades to reveal it. */
html[data-intro] .backdrop--full {
  visibility: visible;
}

/* Hero band: the clip stands exactly where the hero photograph stood. The
   second of the two treatments P12 asks Moritz to choose between. */
.backdrop--band {
  position: relative;
}

.backdrop--band .clip {
  height: var(--hero-h);
  aspect-ratio: 16 / 9;
}

.backdrop--band .scrim {
  background: var(--video-scrim-band);
}
</style>
