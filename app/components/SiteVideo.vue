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
import type { ClipSwapAction } from '~/composables/useSiteVideo'

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
/** The slug the element carries sources for; empty until the first load. */
const showing = ref('')
const swapping = ref(false)
const allowed = ref(false)

/** Read once, on mount: the rendition is chosen for the viewport the visit began in. */
let viewport = 0
/** Runs of `show()`, so a run that wakes from its fade can tell it was overtaken. */
let latest = 0
/** Cuts short every fade still waiting; each run adds and removes its own. */
const fades = new Set<() => void>()

onMounted(() => {
  viewport = window.innerWidth
  allowed.value = !reducedMotion() && !savesData()
  // With an intro on screen the wordmark comes first and the intro releases the
  // clip; without one there is nothing to wait for.
  if (allowed.value && document.documentElement.dataset.intro === undefined) {
    started.value = true
  }
})

// Cut short rather than merely cancelled: a navigation during a fade must not
// leave a timer firing into a component that is gone, and must not leave the
// wait below pending either. Bumping the run first makes every waking run
// abandon, so none of them writes on the way out.
onBeforeUnmount(() => {
  latest += 1
  for (const cutShort of [...fades]) cutShort()
})

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
 * The decision is `clipSwapAction`, asked once here and again on the far side of
 * the fade — 320 ms in which the visitor can pick the other palette again.
 */
async function show(): Promise<void> {
  const run = (latest += 1)

  if (decide(run, false) === 'fade') {
    swapping.value = true
    await waitOutFade()
  }

  const action = decide(run, true)
  // Overtaken: the run that overtook this one owns the state now, including
  // whether the picture is faded out.
  if (action === 'abandon') return
  // The palette came back to the picture that is already on the element while
  // this run was fading it out. Nothing to load — just show it again.
  if (action === 'nothing') {
    swapping.value = false
    return
  }

  // Read now, not before the fade: the wanted palette may have changed twice
  // since this run started. The rendition is chosen here rather than through
  // `<source media>`, which every engine reads differently.
  const wanted = props.slug
  sources.value = videoSources(wanted, viewport)
  showing.value = wanted
  await nextTick()
  const element = clip.value
  if (element === null) return
  // The attribute alone does not satisfy every engine's autoplay policy.
  element.muted = true
  element.load()
  // Back on screen before the first frame arrives, not after. The still of the
  // new palette is this element's own background, so an element held at zero
  // opacity until playback starts shows neither the clip nor the still — on a
  // slow connection that is seconds of bare page background, and worst of all
  // at the reveal, where the visitor has just chosen the other palette.
  // Carrying that gap is exactly what the background still is for.
  swapping.value = false
  try {
    await element.play()
  } catch {
    // A browser that refuses to autoplay keeps showing the still, which is
    // the same picture standing still.
  }
}

function decide(run: number, faded: boolean): ClipSwapAction {
  return clipSwapAction({ showing: showing.value, wanted: props.slug, run, latest, faded })
}

function waitOutFade(): Promise<void> {
  return new Promise<void>((resolve) => {
    const cutShort = () => {
      clearTimeout(timer)
      fades.delete(cutShort)
      resolve()
    }
    const timer = setTimeout(cutShort, FADE_MS)
    fades.add(cutShort)
  })
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
