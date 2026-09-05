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
      :fetchpriority="priority ? 'high' : undefined"
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

/**
 * Was am Element hängt, statt im Stylesheet zu stehen: die Durchschnittsfarbe
 * und das Seitenverhältnis kommen aus den Daten. Beides steht als Custom
 * Property, nicht als fertige Deklaration — so kann die Einsatzstelle das
 * Verhältnis überschreiben (die Auswahlreihe der Startseite schneidet auf 3:2),
 * was gegen ein Inline-`aspect-ratio` nicht möglich wäre. Zusammen mit den
 * `width`/`height`-Attributen hält es CLS bei 0.
 */
const frame = computed(() => ({
  '--photo-color': props.photo.color,
  '--photo-ratio': `${props.photo.width} / ${props.photo.height}`,
  ...(props.lqip ? { '--photo-lqip': `url("${props.photo.lqip}")` } : {}),
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
  background-color: var(--photo-color);
}

img {
  width: 100%;
  height: auto;
  aspect-ratio: var(--photo-ratio);
  background-color: var(--photo-color);
}

/*
  Blur-up: das 20-px-Vorschaubild liegt als Pseudo-Element unter dem echten
  Bild, unscharf und minimal überskaliert, damit die weichen Ränder des Blurs
  nicht als heller Saum stehen bleiben. `overflow: hidden` fängt diese
  Überskalierung. Das echte Bild blendet darüber ein, statt zu springen.
*/
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

/*
  Ohne JavaScript wird `is-loaded` nie gesetzt — dann darf das Bild nicht
  unsichtbar bleiben. Der Vorschauwisch entfällt in diesem Fall, das Bild ist
  sofort da.
*/
@media (scripting: none) {
  .has-lqip img {
    opacity: 1;
  }
}
</style>
