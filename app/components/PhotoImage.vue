<template>
  <picture>
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
      :loading="eager || priority ? 'eager' : 'lazy'"
      :decoding="priority ? undefined : 'async'"
      :fetchpriority="priority ? 'high' : undefined"
      :data-lqip="showLqip ? '' : undefined"
      :style="style"
      @load="loaded = true"
    />
  </picture>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * Ein Index-Eintrag als `<picture>`.
 *
 * `sizes` und `alt` sind Pflicht: die richtige Breite kennt nur das Layout an
 * der Einsatzstelle, und ein Bild ohne Beschreibung ist für einen Screenreader
 * ein Loch in der Seite. Welcher Text das ist, entscheidet der Aufrufer —
 * meist `photo.alt ?? photo.title`.
 */
const props = withDefaults(
  defineProps<{
    photo: PhotoIndexEntry
    /** Wird auf jeder <source> wiederholt; ohne sie rechnet der Browser mit 100vw. */
    sizes: string
    alt: string
    /** `loading="eager"` — für alles, was ohne Scrollen sichtbar ist. */
    eager?: boolean
    /** LCP-Kandidat: `fetchpriority="high"` und kein `decoding="async"`. */
    priority?: boolean
    /** Deckelt das srcset, wo das Layout die Anzeigebreite ohnehin begrenzt. */
    variantMax?: number
    /** Blur-up aus dem 20-px-Vorschaubild. Nur für Hero und Detailseite. */
    lqip?: boolean
  }>(),
  { eager: false, priority: false, variantMax: undefined, lqip: false },
)

const loaded = ref(false)

const sources = computed(() => buildSources(props.photo, props.sizes, props.variantMax))
const src = computed(() => fallbackSrc(props.photo, props.variantMax))
const fallbackSrcset = computed(() =>
  srcSet(props.photo, fallbackFormat(props.photo), props.variantMax),
)

const showLqip = computed(() => props.lqip && !loaded.value)

/**
 * Die Durchschnittsfarbe steht immer als Hintergrund: sie kommt aus den Daten,
 * nicht aus einem Token, und füllt den reservierten Kasten, bevor das Bild da
 * ist. `aspect-ratio` plus width/height halten CLS bei 0.
 */
const style = computed(() => ({
  backgroundColor: props.photo.color,
  aspectRatio: `${props.photo.width} / ${props.photo.height}`,
  ...(showLqip.value
    ? {
        backgroundImage: `url("${props.photo.lqip}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {}),
}))

const img = useTemplateRef<HTMLImageElement>('img')

// Bei einer statisch ausgelieferten Seite kann das Bild schon vollständig sein,
// bevor Vue den Listener hängt — dann feuert `load` nie.
onMounted(() => {
  if (img.value?.complete) loaded.value = true
})
</script>

<style scoped>
picture {
  display: block;
}

img {
  width: 100%;
  height: auto;
}
</style>
