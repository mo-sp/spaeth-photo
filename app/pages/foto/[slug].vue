<template>
  <article class="page">
    <div class="head">
      <h1 class="head-title">{{ photo.title }}</h1>
      <p class="head-year">{{ photo.year }}</p>
    </div>

    <div class="stage">
      <PhotoImage
        :photo="photo"
        :alt="photo.alt ?? photo.title"
        :sizes="SIZES"
        :variant-max="1600"
        eager
        priority
        lqip
      />
    </div>
  </article>
</template>

<script setup lang="ts">
// Gerüst für P5: genug, damit die Route existiert, verlinkbar ist und
// prerendert. Metadaten in der Sidebar, Prev/Next und Zähler folgen dort.
definePageMeta({ aside: 'photo' })

const route = useRoute()
const found = usePhoto(String(route.params.slug))

if (!found) {
  throw createError({ statusCode: 404, statusMessage: 'Dieses Foto gibt es nicht', fatal: true })
}

const photo = found
const SIZES = '(max-width: 767px) 100vw, calc(100vw - 220px)'

useSeoMeta({ title: photo.title })
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 22px var(--space-4);
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

.head-year {
  flex: 0 0 auto;
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  color: var(--color-text-muted);
}

.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--detail-h);
  background: var(--color-bg);
}

.stage :deep(picture) {
  display: flex;
  max-height: 100%;
}

.stage :deep(img) {
  width: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

@media (max-width: 767px) {
  .head {
    padding: var(--space-2);
  }

  .stage {
    height: auto;
  }
}
</style>
