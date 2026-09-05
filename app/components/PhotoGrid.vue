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
      <!-- The link is already named by the alt attribute; this line only
           repeats it visibly, so it stays out of the accessibility tree. -->
      <span class="caption t-meta" aria-hidden="true">
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

/** Tile width = content width (viewport minus sidebar, gaps and padding) divided by the column count of each step. */
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
 * The tile stays a link to the detail page — without JavaScript, on middle
 * click, in a new tab and for crawlers. Only a plain unmodified left click is
 * intercepted and opens the lightbox instead.
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
/* CSS columns instead of real masonry: `grid-template-rows: masonry` is not
   baseline in 2026. Consequence to know: tiles fill column by column, so tab
   order runs down the first column before the second. */
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
  color: var(--color-text);
}

/* `overflow: hidden` clips at the line box, and at `line-height: 1` that box is
   exactly the font size — umlaut dots were sheared off („LACHMÖWEN" rendered as
   „LACHMOWEN"). Line height 1.4 plus negative block margins keeps the geometry
   and lets the box reach over the dots. */
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

/* Visible is the default and hiding the exception: touch and keyboard have no
   hover, so only pointer devices fade the caption in. */
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
