<template>
  <div v-if="photo" class="aside">
    <NuxtLink class="back" :to="backTo">
      <span aria-hidden="true">←</span>
      {{ t('photo.back') }}
    </NuxtLink>

    <!--
      Der Titel steht sichtbar hier, die <h1> der Seite steht unsichtbar im
      <main> (siehe pages/foto/[slug].vue): die Überschrift einer Seite gehört
      in ihren Inhaltsbereich, das Design will sie aber in der Seitenleiste.
    -->
    <p class="title">{{ photoTitle(photo, locale) }}</p>
    <p class="year">{{ photo.year }}</p>

    <ul v-if="photo.tags.length > 0" class="tags">
      <li v-for="tag in photo.tags" :key="tag">{{ tagText(tag) }}</li>
    </ul>

    <!-- Kamera und Objektiv kommen aus dem EXIF und fehlen bei einigen
         Bildern; dann fällt die Zeile ganz weg statt leer dazustehen. -->
    <p v-if="gear" class="gear">{{ gear }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * Die Metadaten des Fotos in der Seitenleiste: Rückweg, Titel, Jahr, Tags und
 * — wenn vorhanden — Kamera und Objektiv. Prev/Next und der Zähler stehen im
 * Sidebar-Fuß (`PhotoAsideFoot`), weil sie dort unten kleben sollen.
 */
const { slug, backTo } = usePhotoNav()
const { locale, t, tag: tagText } = useI18n()

const photo = computed(() => usePhoto(slug.value))

const gear = computed(() => {
  const parts = [photo.value?.camera, photo.value?.lens].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
})
</script>

<style scoped>
.aside {
  padding: 0 var(--space-3);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 24px;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
  transition: color var(--t-fast);
}

.back:hover,
.back:focus-visible {
  color: var(--color-text);
}

.title {
  /* Der Abstand des Rückwegs zum Titel ist in der Spec eigens genannt. */
  margin: var(--space-back) 0 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-size);
  line-height: var(--text-title-lh);
  letter-spacing: var(--text-title-ls);
  color: var(--color-text);
  /* 220 px sind schmal: `pretty` verhindert Schusterjungen, `hyphens` und
     `overflow-wrap` halten lange Wörter („Weihnachtsmarktbeleuchtung") in
     der Spalte, statt sie herausragen zu lassen. */
  text-wrap: pretty;
  hyphens: auto;
  overflow-wrap: break-word;
}

.year {
  margin: var(--space-1) 0 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.tags {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: var(--space-3) 0 0;
  padding: 12px 0 0;
  border-top: var(--border);
  list-style: none;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-meta-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.gear {
  margin: var(--space-2) 0 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-meta-ls);
  color: var(--color-text-faint);
}

@media (max-width: 767px) {
  .aside {
    padding: var(--space-2);
  }
}
</style>
