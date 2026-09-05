<template>
  <div v-if="nav.position > 0" class="foot">
    <!-- One row: previous left, next right, position between them. The counter
         sits inside the landmark because it says where in the sequence this
         photo is — and it keeps the landmark from being empty when a filter
         holds a single photo and there is no neighbour to link to. -->
    <nav class="steps" :aria-label="t('photo.nav.aria')">
      <NuxtLink v-if="prevTo" class="step step--prev" :to="prevTo" rel="prev">
        <svg
          class="chevron"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m14.5 5-7 7 7 7" />
        </svg>
        <!-- The arrow is drawn, so this text is the link's whole accessible name. -->
        <span class="sr-only">{{ prevLabel }}</span>
      </NuxtLink>

      <p class="counter">
        <!-- Short form visible, spoken form as its own text: many screen readers
             ignore an `aria-label` on a paragraph. -->
        <span aria-hidden="true">{{ padCounter(nav.position) }} / {{ padCounter(nav.total) }}</span>
        <span class="sr-only">{{ t('photo.counter', { n: nav.position, total: nav.total }) }}</span>
      </p>

      <NuxtLink v-if="nextTo" class="step step--next" :to="nextTo" rel="next">
        <svg
          class="chevron"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m9.5 5 7 7-7 7" />
        </svg>
        <span class="sr-only">{{ nextLabel }}</span>
      </NuxtLink>
    </nav>

    <!-- This foot replaces `SiteFoot`, so it carries the language switch and
         legal links itself; below 768 px the layout's page foot has them. -->
    <SiteLang class="lang" />
    <SiteLegal class="legal" />
  </div>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * Prev/next, the position counter and the legal links. Neighbours come from the
 * same derivation as the page (`usePhotoNav`), filter context included, so the
 * pre-hydration render matches the prerendered HTML.
 */
const { nav, pathTo } = usePhotoNav()
const { locale, t } = useI18n()

const prevTo = computed(() => pathTo(nav.value.prev))
const nextTo = computed(() => pathTo(nav.value.next))

/** The word plus the neighbour's title, as the two stacked spans used to read. */
function stepLabel(key: 'photo.prev' | 'photo.next', photo: PhotoIndexEntry | null) {
  const word = t(key)
  return photo === null ? word : `${word}: ${photoTitle(photo, locale.value)}`
}

const prevLabel = computed(() => stepLabel('photo.prev', nav.value.prev))
const nextLabel = computed(() => stepLabel('photo.next', nav.value.next))
</script>

<style scoped>
.foot {
  padding: var(--space-3) var(--space-3) 0;
}

/* Fixed columns rather than `space-between`: a missing neighbour then leaves its
   cell empty instead of pulling the counter off centre. */
.steps {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  color: var(--color-text-muted);
}

.step {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Touch target; the drawn arrow alone would be 18 px. The inline padding stays
     small because the whole row has 124 px at the 180 px sidebar width. */
  min-height: 44px;
  padding-inline: var(--space-1);
  transition: color var(--t-fast);
}

.step--prev {
  grid-column: 1;
  justify-self: start;
}

.step--next {
  grid-column: 3;
  justify-self: end;
}

.step:hover,
.step:focus-visible {
  color: var(--color-text);
}

.counter {
  grid-column: 2;
  margin: 0;
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
