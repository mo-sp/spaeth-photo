<template>
  <div class="page">
    <div class="head">
      <h1 class="head-title">{{ heading }}</h1>
      <p class="head-count">{{ pad(visible.length) }} Bilder</p>
    </div>

    <PhotoGrid :photos="visible" @open="onOpen" />

    <!-- Erst laden, wenn jemand sie öffnet: die Galerie ist die Seite, auf der
         das Bundle am wenigsten Gewicht vertragen kann. -->
    <LightboxAsync v-if="isOpen" :photos="visible" />
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

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const { isOpen, open } = useLightbox(visible)

function onOpen(slug: string) {
  void open(slug)
}

useSeoMeta({
  title: () => (tag.value === null ? 'Galerie' : `${tagLabel(tag.value)} – Galerie`),
  description: () =>
    tag.value === null
      ? 'Alle Fotos: Tiere, Natur, Landschaft und Segeln.'
      : `Fotos zum Motiv ${tagLabel(tag.value)}.`,
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
