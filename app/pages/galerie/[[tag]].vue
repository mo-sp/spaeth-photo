<template>
  <div class="page">
    <div class="head">
      <h1 class="head-title">{{ heading }}</h1>
      <p class="head-count">
        <!-- Sichtbar zweistellig wie in der Spec, gesprochen als ganze Zahl:
             „null fünf Bilder" wäre eine Vorlesefassung des Layouts. -->
        <span aria-hidden="true">{{ padCounter(visible.length) }} Bilder</span>
        <span class="sr-only">{{ visible.length }} Bilder</span>
      </p>
    </div>

    <PhotoGrid :photos="visible" @open="onOpen" />

    <!-- Erst laden, wenn jemand sie öffnet: die Galerie ist die Seite, auf der
         das Bundle am wenigsten Gewicht vertragen kann. Der `hydrated`-Wächter
         hält den ersten Durchlauf im Browser deckungsgleich mit dem
         prerenderten HTML: `/galerie?foto=x` ist dieselbe statische Datei wie
         `/galerie`, und ohne den Wächter hinge es am Zufall des
         Async-Platzhalters, ob Vue den Baum verwirft. -->
    <LightboxAsync v-if="hydrated && isOpen" :photos="visible" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ aside: 'gallery' })

const LightboxAsync = defineAsyncComponent(() => import('~/components/LightboxRoot.vue'))

const route = useRoute()
const { photos, knownTag } = usePhotos()

/**
 * Der Tag steckt im Pfad, nicht in einer Query. Ein unbekannter Tag ist
 * deshalb keine leere Galerie, sondern eine Adresse, die es nicht gibt.
 */
const tag = computed(() => knownTag(route.params.tag))

if (route.params.tag && tag.value === null) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Diesen Filter gibt es nicht',
    fatal: true,
  })
}

const visible = computed(() => filterByTag(photos, tag.value))

const heading = computed(() => (tag.value === null ? 'Galerie' : tagLabel(tag.value)))

const { isOpen, open } = useLightbox(visible)

// Der Deep-Link `?foto=<slug>` darf erst nach der Hydration greifen — die
// prerenderte Seite kennt keine Query.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

function onOpen(slug: string) {
  void open(slug)
}

useSiteSeo({
  title: () => (tag.value === null ? 'Galerie' : tagLabel(tag.value)),
  description: () =>
    tag.value === null
      ? 'Alle Fotos: Tiere, Natur, Landschaft und Segeln.'
      : `Fotos zum Motiv ${tagLabel(tag.value)}.`,
  path: () => (tag.value === null ? '/galerie' : `/galerie/${tag.value}`),
  // The first photo of the current filter previews the filter, not the site.
  image: () => {
    const first = visible.value[0]
    return first === undefined ? null : { path: first.og, alt: first.alt ?? first.title }
  },
})
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: var(--border);
}

.head-title {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-s-size);
  line-height: var(--text-title-s-lh);
  letter-spacing: var(--text-title-s-ls);
  color: var(--color-text);
}

.head-count {
  flex: 0 0 auto;
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

@media (max-width: 767px) {
  .head {
    padding: var(--space-2);
  }
}
</style>
