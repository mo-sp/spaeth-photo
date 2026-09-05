<template>
  <div class="grid">
    <a
      v-for="(photo, position) in photos"
      :key="photo.slug"
      class="tile tile-focus"
      :data-slug="photo.slug"
      :href="`${path(`/photo/${photo.slug}`)}${tagQuery}`"
      :style="{ aspectRatio: `${photo.width} / ${photo.height}`, backgroundColor: photo.color }"
      @click="onTileClick($event, photo.slug)"
    >
      <PhotoImage
        :photo="photo"
        :alt="photoAlt(photo, locale)"
        :sizes="TILE_SIZES"
        :eager="position < eager"
        :priority="position === 0"
        :variant-max="1600"
      />
      <!-- Der Link trägt den Namen bereits über das alt-Attribut; die Zeile
           wiederholt ihn nur sichtbar. Für Screenreader wäre sie ein zweiter,
           halber Name. -->
      <span class="caption" aria-hidden="true">
        <span class="caption-title">{{ photoTitle(photo, locale) }}</span>
        <span class="caption-year">{{ photo.year }}</span>
      </span>
    </a>
  </div>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

const props = defineProps<{ photos: PhotoIndexEntry[] }>()

const { locale, path } = useI18n()

const emit = defineEmits<{ open: [slug: string] }>()

/**
 * Aus dem Urteil P2/P3 übernommen: die Kachelbreite ergibt sich aus der
 * Contentbreite (Viewport minus Sidebar minus Gaps und Padding) geteilt durch
 * die Spaltenzahl der jeweiligen Stufe.
 */
const TILE_SIZES = [
  '(max-width: 767px) calc(100vw - 16px)',
  '(max-width: 1023px) calc((100vw - 204px) / 2)',
  '(max-width: 1439px) calc((100vw - 252px) / 3)',
  'calc((100vw - 260px) / 4)',
].join(', ')

const eager = computed(() => eagerCount(props.photos))

/**
 * The href carries the active filter, the click does not need to.
 *
 * A middle click, "open in new tab" and a visit without JavaScript all follow
 * the href, so without the query they would land on the unfiltered neighbours
 * while a plain click keeps the filter. `parseTag` is the guard: on routes
 * without a tag parameter (the home page uses this grid too) it yields null.
 * The detail page's canonical link stays query-free, and
 * `nitro.prerender.ignore` keeps `?tag=` out of the generated files.
 */
const route = useRoute()
const tagQuery = computed(() => {
  const tag = parseTag(route.params.tag)
  return tag === null ? '' : `?tag=${tag}`
})

/**
 * Die Kachel ist und bleibt ein Link auf die Detailseite: ohne JavaScript,
 * mit Mittelklick, mit „In neuem Tab öffnen" und im Quelltext für Crawler.
 * Nur der einfache Linksklick ohne Modifier wird abgefangen und öffnet
 * stattdessen die Lightbox.
 */
function onTileClick(event: MouseEvent, slug: string) {
  if (event.defaultPrevented) return
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('open', slug)
}
</script>

<style scoped>
/*
  CSS-Columns statt eines echten Masonry-Layouts: `grid-template-rows: masonry`
  ist 2026 noch nicht überall Baseline. Folge, die man kennen muss: die Kacheln
  füllen Spalte für Spalte, nicht Zeile für Zeile — die Tabulator-Reihenfolge
  läuft also die erste Spalte hinunter, dann die zweite. Für eine Galerie ohne
  inhaltliche Reihenfolge ist das vertretbar; ein Raster mit fester Zeilenhöhe
  wäre die Alternative und würde jedes Hochformat beschneiden.
*/
.grid {
  columns: var(--grid-cols);
  column-gap: var(--grid-gap);
  padding: var(--grid-gap);
}

.tile {
  position: relative;
  display: block;
  width: 100%;
  margin-bottom: var(--grid-gap);
  break-inside: avoid;
}

.caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1);
  padding: 14px;
  background: var(--overlay-caption);
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-meta-lh);
  letter-spacing: var(--text-meta-ls);
  text-transform: uppercase;
  color: var(--color-text);
}

/*
  `overflow: hidden` schneidet am Rand des Zeilenkastens ab — und bei
  `line-height: 1` ist dieser Kasten genau so hoch wie die Schriftgröße. Die
  Punkte über Ü und Ö ragen darüber hinaus: aus „LACHMÖWEN" wurde
  „LACHMOWEN". Die Zeile bekommt deshalb 1,4 Zeilenhöhe und holt die
  Differenz über negative Blockränder wieder herein — die Geometrie der
  Unterschrift bleibt dieselbe, der Kasten reicht nur über die Umlautpunkte.
*/
.caption-title {
  line-height: 1.4;
  margin-block: -0.2em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caption-year {
  flex: 0 0 auto;
}

/*
  Auf Zeigergeräten blendet die Unterschrift erst beim Hovern ein — das Bild
  soll dominieren. Auf Touch und bei Tastaturbedienung gibt es kein Hovern,
  dort bleibt sie sichtbar. Deshalb ist „sichtbar" der Standard und das
  Ausblenden die Ausnahme, nicht umgekehrt.
*/
@media (hover: hover) and (pointer: fine) {
  .caption {
    opacity: 0;
    transition: opacity var(--t-slow);
  }

  .tile:hover .caption,
  .tile:focus-within .caption,
  .tile:focus-visible .caption {
    opacity: 1;
  }
}
</style>
