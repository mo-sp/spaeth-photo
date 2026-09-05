<template>
  <picture :class="{ 'has-lqip': lqip }" :data-lqip="lqip ? '' : undefined" :style="frame">
    <source
      v-for="source in sources"
      :key="source.type"
      :type="source.type"
      :srcset="source.srcset"
      :sizes="source.sizes"
    />
    <img
      ref="img"
      :src="src"
      :srcset="fallbackSrcset"
      :sizes="sizes"
      :alt="alt"
      :width="photo.width"
      :height="photo.height"
      :class="{ 'is-loaded': loaded }"
      :loading="eager || priority ? 'eager' : 'lazy'"
      :decoding="priority ? undefined : 'async'"
      :fetchpriority="fetchPriority"
      @load="loaded = true"
    />
  </picture>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * An index entry as a `<picture>`. `sizes` and `alt` are required: only the call
 * site knows the display width, and an undescribed image is a hole in the page.
 */
const props = withDefaults(
  defineProps<{
    photo: PhotoIndexEntry
    /** Repeated on every <source>; without it the browser assumes 100vw. */
    sizes: string
    alt: string
    /** `loading="eager"` — for anything visible without scrolling. */
    eager?: boolean
    /** LCP candidate: `fetchpriority="high"` and no `decoding="async"`. */
    priority?: boolean
    /** Caps the srcset where the layout already limits the display width. */
    variantMax?: number
    /** Blur-up from the 20 px preview. Hero and detail page only. */
    lqip?: boolean
  }>(),
  { eager: false, priority: false, variantMax: undefined, lqip: false },
)

/**
 * Eager is *when* the request starts, priority is who wins bandwidth once
 * several have. Nine eager tiles at default priority measured LCP 3.2 s on a
 * throttled mobile connection; `low` on every eager non-LCP image reorders them
 * behind the LCP candidate without deferring them.
 */
const fetchPriority = computed(() => {
  if (props.priority) return 'high'
  return props.eager ? 'low' : undefined
})

const loaded = ref(false)

const sources = computed(() => buildSources(props.photo, props.sizes, props.variantMax))
const src = computed(() => fallbackSrc(props.photo, props.variantMax))
const fallbackSrcset = computed(() =>
  srcSet(props.photo, fallbackFormat(props.photo), props.variantMax),
)

/**
 * Average colour and aspect ratio come from the data, so they ride on the
 * element. Custom properties rather than finished declarations, so a call site
 * can override the ratio (the home-page row crops to 3:2) — an inline
 * `aspect-ratio` could not be overridden.
 */
const frame = computed(() => ({
  '--photo-color': props.photo.color,
  '--photo-ratio': `${props.photo.width} / ${props.photo.height}`,
  ...(props.lqip ? { '--photo-lqip': `url("${props.photo.lqip}")` } : {}),
}))

const img = useTemplateRef<HTMLImageElement>('img')

// On a static page the image can already be complete before Vue attaches the
// listener, in which case `load` never fires.
onMounted(() => {
  if (img.value?.complete) loaded.value = true
})
</script>

<style scoped>
picture {
  display: block;
  background-color: var(--photo-color);
}

img {
  width: 100%;
  height: auto;
  aspect-ratio: var(--photo-ratio);
  background-color: var(--photo-color);
}

/* Blur-up: the 20 px preview sits below the real image, slightly over-scaled so
   the soft edges of the blur do not show as a bright seam. */
.has-lqip {
  position: relative;
  overflow: hidden;
}

.has-lqip::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--photo-lqip);
  background-position: center;
  background-size: cover;
  filter: blur(12px);
  transform: scale(1.06);
}

.has-lqip img {
  position: relative;
  opacity: 0;
  transition: opacity var(--t-slow);
}

.has-lqip img.is-loaded {
  opacity: 1;
}

/* Without JavaScript `is-loaded` is never set, so the image must not stay
   invisible; the blur-up is simply skipped. */
@media (scripting: none) {
  .has-lqip img {
    opacity: 1;
  }
}
</style>
