<template>
  <div class="page">
    <template v-if="hero">
      <div class="hero">
        <PhotoImage
          :photo="hero"
          :alt="photoAlt(hero, locale)"
          :sizes="HERO_SIZES"
          eager
          priority
          lqip
        />
      </div>

      <div class="hero-caption">
        <p class="hero-title t-title-s">{{ photoTitle(hero, locale) }}</p>
        <p class="hero-year">{{ hero.year }}</p>
      </div>
    </template>

    <!-- The duality the project is named for: light italic and bright, shadow
         upright and muted, a mono slash as the hinge. This is the home page's
         heading — the wordmark in the sidebar is a link, not a heading. -->
    <h1 class="motto">
      <em>{{ t('home.motto.light') }}</em>
      <span class="slash" aria-hidden="true">/</span>
      <span class="shadow">{{ t('home.motto.shadow') }}</span>
    </h1>

    <section class="curated">
      <h2 class="label">{{ t('home.selection') }}</h2>
      <ul class="tiles">
        <li v-for="photo in selection" :key="photo.slug">
          <NuxtLink class="tile tile-focus" :to="path(`/photo/${photo.slug}`)">
            <PhotoImage :photo="photo" :alt="photoAlt(photo, locale)" :sizes="TILE_SIZES" eager />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="all t-ui">
      <NuxtLink class="all-link" :to="path('/gallery')">
        {{ t('home.all') }}
        <span aria-hidden="true">→</span>
      </NuxtLink>
      <p class="all-count">
        <span aria-hidden="true">{{
          tn('count.photos', photos.length, padCounter(photos.length))
        }}</span>
        <span class="sr-only">{{ tn('count.photos', photos.length) }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { photos, hero } = usePhotos()
const { locale, t, tn, path } = useI18n()

/** One full row of the five-column grid. */
const selection = curated(photos, 5)

/**
 * The hero is as wide as the content area, full width on mobile. Not 66vw as
 * originally planned: since the hero became width-driven (3:2) its display
 * width is exactly 100vw, and 66vw would pick too small a step for the LCP image.
 */
const HERO_SIZES = [
  '(max-width: 767px) 100vw',
  '(max-width: 1023px) calc(100vw - 180px)',
  'calc(100vw - 220px)',
].join(', ')

/** Five tiles: content width minus block padding and four 8 px gaps, divided by five. */
const TILE_SIZES = [
  '(max-width: 767px) calc(100vw - 28px)',
  '(max-width: 1023px) calc((100vw - 276px) / 5)',
  'calc((100vw - 316px) / 5)',
].join(', ')

useSiteSeo({ description: () => t('site.description'), ogType: 'website' })

useHead({
  // The home page carries the name itself; the `%s – Moritz Späth` template
  // would either repeat it or produce "Home – Moritz Späth".
  titleTemplate: null,
  title: () => t('site.title'),
})
</script>

<style scoped>
/* Every other page opens with the padding of its header block; without it the
   hero would sit flush against the top edge. The foot of the page already
   carries the same distance. */
.page {
  padding-top: var(--space-4);
}

/* Below 768 px `--hero-h: auto` makes the image width-driven (3:2): a height in
   vh cannot be expressed in `sizes`, and the browser would load the wrong step. */
.hero :deep(img) {
  height: var(--hero-h);
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.hero-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 22px var(--space-4);
  border-bottom: var(--border);
}

.hero-title {
  margin: 0;
}

.hero-year {
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

.motto {
  display: flex;
  align-items: baseline;
  gap: 0;
  margin: 0;
  padding: 22px var(--space-4);
  border-bottom: var(--border);
  font-family: var(--font-sans);
  font-size: var(--text-title-size);
  line-height: var(--text-title-lh);
  letter-spacing: var(--text-title-ls);
}

.motto em {
  margin-right: 0.06em;
  font-style: italic;
  font-weight: 400;
  color: var(--color-text);
}

.slash {
  margin: 0 0.5em;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  color: var(--color-text-faint);
}

.shadow {
  font-weight: 600;
  color: var(--color-text-muted);
}

.curated {
  display: flex;
  flex-direction: column;
  /* 24 px per spec; off the 8/14/28 token ladder, and a token for one place
     would cost more than it saves. */
  gap: 24px;
  padding: var(--space-5) var(--space-4) var(--space-6);
}

.label {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-label-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(var(--curated-cols), minmax(0, 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  display: block;
}

/* As in the hero: fixed height where there is one, width-driven on mobile. */
.tile :deep(img) {
  height: var(--curated-h);
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.all {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: var(--border);
}

.all-link {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 24px;
  color: var(--color-text-muted);
  transition: color var(--t-fast);
}

.all-link:hover,
.all-link:focus-visible {
  color: var(--color-text);
}

.all-count {
  flex: 0 0 auto;
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-faint);
}

@media (max-width: 767px) {
  /* The sticky top bar already separates the page from the edge here. */
  .page {
    padding-top: var(--space-2);
  }

  .hero-caption,
  .motto,
  .all {
    padding: var(--space-2);
  }

  .curated {
    padding: var(--space-3) var(--space-2) var(--space-4);
  }
}
</style>
