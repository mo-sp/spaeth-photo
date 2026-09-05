<template>
  <div v-if="photo" class="aside">
    <NuxtLink class="back t-ui" :to="backTo">
      <span aria-hidden="true">←</span>
      {{ t('photo.back') }}
    </NuxtLink>

    <!-- Visible title here, the page's <h1> hidden in <main>: a heading belongs
         to its content area, but the design wants it in the sidebar. -->
    <p class="title">{{ photoTitle(photo, locale) }}</p>
    <p class="year">{{ photo.year }}</p>

    <ul v-if="photo.tags.length > 0" class="tags">
      <li v-for="tag in photo.tags" :key="tag">{{ tagText(tag) }}</li>
    </ul>

    <!-- Camera and lens come from EXIF and are missing on some photos; the
         line then disappears rather than standing empty. -->
    <p v-if="gear" class="gear">{{ gear }}</p>
  </div>
</template>

<script setup lang="ts">
/** Photo metadata in the sidebar; prev/next and the counter live in `PhotoAsideFoot` so they can stick to the bottom. */
const { slug, backTo } = usePhotoNav()
const { locale, t, tag: tagText } = useI18n()

const photo = computed(() => findPhoto(slug.value))

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
  color: var(--color-text-muted);
  transition: color var(--t-fast);
}

.back:hover,
.back:focus-visible {
  color: var(--color-text);
}

.title {
  /* The gap between back link and title is specified explicitly. */
  margin: var(--space-back) 0 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-size);
  line-height: var(--text-title-lh);
  letter-spacing: var(--text-title-ls);
  color: var(--color-text);
  /* 220 px is narrow: these keep a long German compound inside the column
     instead of letting it stick out. */
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
