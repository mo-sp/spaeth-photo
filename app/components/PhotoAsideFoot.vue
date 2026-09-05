<template>
  <div v-if="nav.position > 0" class="foot">
    <!-- A filter can hold a single photo (`schwarzweiss` does). There are no
         neighbours then, and a landmark with nothing in it is a promise the
         page does not keep. -->
    <nav v-if="prevTo || nextTo" class="steps t-ui" :aria-label="t('photo.nav.aria')">
      <NuxtLink v-if="prevTo" class="step" :to="prevTo" rel="prev">
        <span aria-hidden="true">←</span>
        {{ t('photo.prev') }}
        <span v-if="nav.prev" class="sr-only">: {{ photoTitle(nav.prev, locale) }}</span>
      </NuxtLink>
      <NuxtLink v-if="nextTo" class="step" :to="nextTo" rel="next">
        {{ t('photo.next') }}
        <span aria-hidden="true">→</span>
        <span v-if="nav.next" class="sr-only">: {{ photoTitle(nav.next, locale) }}</span>
      </NuxtLink>
    </nav>

    <p class="counter">
      <!-- Short form visible, spoken form as its own text: many screen readers
           ignore an `aria-label` on a paragraph. -->
      <span aria-hidden="true">{{ padCounter(nav.position) }} / {{ padCounter(nav.total) }}</span>
      <span class="sr-only">{{ t('photo.counter', { n: nav.position, total: nav.total }) }}</span>
    </p>

    <!-- This foot replaces `SiteFoot`, so it carries the language switch and
         legal links itself; below 768 px the layout's page foot has them. -->
    <SiteLang class="lang" />
    <SiteLegal class="legal" />
  </div>
</template>

<script setup lang="ts">
/**
 * Prev/next, the position counter and the legal links. Neighbours come from the
 * same derivation as the page (`usePhotoNav`), filter context included, so the
 * pre-hydration render matches the prerendered HTML.
 */
const { nav, pathTo } = usePhotoNav()
const { locale, t } = useI18n()

const prevTo = computed(() => pathTo(nav.value.prev))
const nextTo = computed(() => pathTo(nav.value.next))
</script>

<style scoped>
.foot {
  padding: var(--space-3) var(--space-3) 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--color-text-muted);
}

.step {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  /* Minimum target size; the 11 px line alone would be half as tall. */
  min-height: 24px;
  transition: color var(--t-fast);
}

.step:hover,
.step:focus-visible {
  color: var(--color-text);
}

.counter {
  margin: 0;
  padding-top: var(--space-1);
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-meta-lh);
  letter-spacing: var(--text-foot-ls);
  /* Without tabular-nums the counter changes width while paging. */
  font-variant-numeric: tabular-nums;
  color: var(--color-text-faint);
}

.lang {
  margin-top: var(--space-3);
}

.legal {
  margin-top: var(--space-1);
}

@media (max-width: 767px) {
  .foot {
    padding: 0 var(--space-2) var(--space-2);
  }

  .lang,
  .legal {
    display: none;
  }
}
</style>
