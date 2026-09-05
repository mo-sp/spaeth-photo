<template>
  <div class="stepper">
    <!-- The stage is slotted rather than rendered here: the swipe handlers and
         the per-photo `sizes` belong to the page that knows the photo. -->
    <slot />

    <!-- `display: contents` so the three parts can be grid cells of the frame
         around the image, while the landmark still names them as one group.
         The counter sits inside it because it says where in the sequence this
         photo is — and it keeps the landmark from being empty when a filter
         holds a single photo and there is no neighbour to link to. -->
    <nav v-if="nav.position > 0" class="steps" :aria-label="t('photo.nav.aria')">
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
  </div>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * The frame around the image stage: previous to its left, next to its right,
 * the position counter underneath. Neighbours come from the same derivation as
 * the page (`usePhotoNav`), filter context included, so the pre-hydration
 * render matches the prerendered HTML.
 */
const { nav, pathTo } = usePhotoNav()
const { locale, t } = useI18n()

const prevTo = computed(() => pathTo(nav.value.prev))
const nextTo = computed(() => pathTo(nav.value.next))

/** The word plus the neighbour's title — the arrows carry no visible text. */
function stepLabel(key: 'photo.prev' | 'photo.next', photo: PhotoIndexEntry | null) {
  const word = t(key)
  return photo === null ? word : `${word}: ${photoTitle(photo, locale.value)}`
}

const prevLabel = computed(() => stepLabel('photo.prev', nav.value.prev))
const nextLabel = computed(() => stepLabel('photo.next', nav.value.next))
</script>

<style scoped>
/* Fixed outer columns rather than `space-between`: a missing neighbour leaves
   its cell empty instead of shifting the image off centre. The arrows stand
   beside the picture, never over it. */
.stepper {
  /* Minimum target size, and the width `detailSizes` subtracts from the stage
     (`STEPPER_GUTTER` in `shared/utils/img.ts` — change both together). */
  --step-w: 44px;
  display: grid;
  grid-template-columns: var(--step-w) minmax(0, 1fr) var(--step-w);
  column-gap: var(--space-1);
  align-items: center;
}

/* Placed here, not in the page: the slotted stage is the middle cell. */
:slotted(*) {
  grid-area: 1 / 2;
}

.steps {
  display: contents;
}

.step {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Minimum target size; the drawn arrow alone would be 18 px. */
  width: var(--step-w);
  min-height: var(--step-w);
  color: var(--color-text-muted);
  transition: color var(--t-fast);
}

.step--prev {
  grid-area: 1 / 1;
}

.step--next {
  grid-area: 1 / 3;
}

.step:hover,
.step:focus-visible {
  color: var(--color-text);
}

.counter {
  grid-area: 2 / 2;
  margin: var(--space-2) 0 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-meta-lh);
  letter-spacing: var(--text-foot-ls);
  /* Without tabular-nums the counter changes width while paging. */
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--color-text-faint);
}

/* Below 768 px the image is the full width and there is no room beside it:
   the two arrows drop into the counter's row and flank it. */
@media (max-width: 767px) {
  .stepper {
    grid-template-columns: 1fr auto 1fr;
    column-gap: 0;
  }

  :slotted(*) {
    grid-area: 1 / 1 / 2 / 4;
  }

  .step--prev {
    grid-area: 2 / 1;
    justify-self: start;
  }

  .step--next {
    grid-area: 2 / 3;
    justify-self: end;
  }
}
</style>
