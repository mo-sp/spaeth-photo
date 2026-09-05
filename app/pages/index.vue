<template>
  <div class="page">
    <template v-if="hero">
      <div class="hero">
        <PhotoImage
          :photo="hero"
          :alt="hero.alt ?? hero.title"
          :sizes="HERO_SIZES"
          eager
          priority
          lqip
        />
      </div>

      <div class="hero-caption">
        <p class="hero-title">{{ hero.title }}</p>
        <p class="hero-year">{{ hero.year }}</p>
      </div>
    </template>

    <!--
      Die Dualität, die dem Projekt den Namen gibt: Licht kursiv und hell,
      Schatten aufrecht und gedämpft, dazwischen ein Mono-Schrägstrich als
      Scharnier. Das ist die Überschrift der Startseite — die Wortmarke in der
      Seitenleiste ist ein Link, keine Überschrift.
    -->
    <h1 class="motto">
      <em>Licht</em>
      <span class="slash" aria-hidden="true">/</span>
      <span class="shadow">Schatten</span>
    </h1>

    <section class="curated">
      <h2 class="label">Auswahl</h2>
      <ul class="tiles">
        <li v-for="photo in selection" :key="photo.slug">
          <NuxtLink class="tile tile-focus" :to="`/foto/${photo.slug}`">
            <PhotoImage
              :photo="photo"
              :alt="photo.alt ?? photo.title"
              :sizes="TILE_SIZES"
              eager
            />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="all">
      <NuxtLink class="all-link" to="/galerie">
        Alle Bilder
        <span aria-hidden="true">→</span>
      </NuxtLink>
      <p class="all-count">
        <span aria-hidden="true">{{ padCounter(photos.length) }} Bilder</span>
        <span class="sr-only">{{ photos.length }} Bilder</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { photos, hero } = usePhotos()

/** Eine volle Reihe des fünfspaltigen Rasters. */
const selection = curated(photos, 5)

/**
 * Der Hero ist so breit wie der Inhaltsbereich: Viewport minus Seitenleiste
 * (220 bzw. 180 px), mobil die volle Breite.
 *
 * Abweichung vom Urteil, das hier 66vw vorsah: die 66vw stammen aus der
 * Fassung, in der der Hero mobil 60vh hoch war und `cover` die Breite vom
 * Viewport entkoppelte. Seit er breitengetrieben ist (3:2), ist die
 * Anzeigebreite exakt 100vw — 66vw ließe den Browser eine zu kleine Stufe
 * wählen, ausgerechnet für das LCP-Bild.
 */
const HERO_SIZES = [
  '(max-width: 767px) 100vw',
  '(max-width: 1023px) calc(100vw - 180px)',
  'calc(100vw - 220px)',
].join(', ')

/**
 * Fünf Kacheln: Contentbreite (Viewport minus Seitenleiste) minus dem Padding
 * des Blocks (2×32, mobil 2×14) minus vier Lücken à 8 px, geteilt durch fünf.
 * Mobil ist es eine Spalte über die volle Breite.
 */
const TILE_SIZES = [
  '(max-width: 767px) calc(100vw - 28px)',
  '(max-width: 1023px) calc((100vw - 276px) / 5)',
  'calc((100vw - 316px) / 5)',
].join(', ')

const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  description:
    'Fotografien von Moritz Späth aus Wedel an der Elbe: Tiere, Natur, Landschaft und Segeln.',
  ogType: 'website',
  ogTitle: 'Moritz Späth – Fotografie',
  ogDescription:
    'Fotografien von Moritz Späth aus Wedel an der Elbe: Tiere, Natur, Landschaft und Segeln.',
  ogImage: hero ? absoluteUrl(siteUrl, hero.og) : undefined,
  ogImageWidth: hero ? 1200 : undefined,
  ogImageHeight: hero ? 630 : undefined,
  ogImageAlt: hero ? (hero.alt ?? hero.title) : undefined,
  twitterCard: 'summary_large_image',
})

useHead({
  // Die Startseite trägt den Namen selbst; die Vorlage „%s – Moritz Späth"
  // machte daraus „Start – Moritz Späth" oder eine Wiederholung.
  titleTemplate: null,
  title: 'Moritz Späth – Fotografie',
  link: [{ rel: 'canonical', href: absoluteUrl(siteUrl, '/') }],
})
</script>

<style scoped>
/*
  Der Hero füllt den Inhaltsbereich in voller Breite und fester Höhe. Unter
  768 px ist `--hero-h: auto` und das Bild breitengetrieben (3:2): eine Höhe in
  vh ließe sich in `sizes` nicht ausdrücken, und der Browser lüde die falsche
  Stufe.
*/
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
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-s-size);
  line-height: var(--text-title-s-lh);
  letter-spacing: var(--text-title-s-ls);
  color: var(--color-text);
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
  /* 24 px stehen so in der Spec und liegen nicht auf der 8/14/28-Leiter der
     Tokens; ein eigenes Token für genau eine Stelle wäre mehr Aufwand als
     Nutzen. */
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

/* Wie im Hero: feste Höhe, solange es eine gibt — mobil bestimmt die Breite
   das Format. */
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
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
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
