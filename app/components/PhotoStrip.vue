<template>
  <div
    ref="strip"
    class="strip"
    :class="{ 'strip--animated': animated }"
    @mouseenter="start"
    @mouseleave="stop"
    @wheel="onWheel"
  >
    <ul ref="track" class="track">
      <li
        v-for="(photo, position) in photos"
        :key="photo.slug"
        class="cell"
        :style="cellStyle(photo)"
      >
        <NuxtLink class="tile tile-focus" :to="path(`/photo/${photo.slug}`)">
          <PhotoImage
            :photo="photo"
            :alt="photoAlt(photo, locale)"
            :sizes="tileSizes(photo)"
            :variant-max="TILE_VARIANT_MAX"
            :eager="position < EAGER_TILES"
          />
        </NuxtLink>
      </li>

      <!-- The second copy exists only where the strip moves: the offset wraps
           once the first copy has scrolled out, and the copy is then standing
           exactly where the first one started. Hidden from assistive technology
           and from the tab order — the same links a second time are noise. -->
      <template v-if="animated">
        <li
          v-for="photo in photos"
          :key="`echo-${photo.slug}`"
          class="cell"
          :style="cellStyle(photo)"
          aria-hidden="true"
        >
          <NuxtLink class="tile" :to="path(`/photo/${photo.slug}`)" tabindex="-1">
            <PhotoImage
              :photo="photo"
              alt=""
              :sizes="tileSizes(photo)"
              :variant-max="TILE_VARIANT_MAX"
            />
          </NuxtLink>
        </li>
      </template>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * Every photo in gallery order as one horizontal row, scrolled freely by touch,
 * trackpad or wheel. Where a fine pointer can hover, the row also drifts by
 * itself while the pointer rests on it.
 */
const { photos } = usePhotos()
const { locale, path } = useI18n()

const strip = useTemplateRef<HTMLElement>('strip')
const track = useTemplateRef<HTMLElement>('track')
const { animated, start, stop, onWheel } = usePhotoStrip(strip, track)

/** Tile height in CSS px; mirrors `--curated-h` in `tokens.css`, which JS cannot read. Change both together. */
const TILE_H = 124

/** The widest tile is a 2:1 panorama at 248 px, so 960 covers even a 3× display. */
const TILE_VARIANT_MAX = 960

/** Roughly one screen of tiles; everything further right waits for the scroll. */
const EAGER_TILES = 6

/** Tile width in CSS px: the shared height times the photo's own aspect ratio. */
function tileWidth(photo: PhotoIndexEntry): number {
  return Math.round(TILE_H * photo.aspectRatio)
}

/**
 * The width sits on the cell rather than falling out of the image: the row is
 * then laid out before the first image has decoded, so nothing reflows and the
 * loop can measure its span at any time.
 */
function cellStyle(photo: PhotoIndexEntry) {
  return { width: `${tileWidth(photo)}px` }
}

function tileSizes(photo: PhotoIndexEntry): string {
  return `${tileWidth(photo)}px`
}
</script>

<style scoped>
/* Free horizontal scrolling, no snapping: the row is something to move through,
   not a carousel of positions. `overscroll-behavior` keeps a swipe that runs
   out of row from turning into the browser's back gesture.
   `strip--animated` is added only where a fine pointer can hover, reduced motion
   is not requested and the list is wider than the visible area. */
.strip {
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.strip--animated {
  /* The row moves under the pointer; a scrollbar beneath it would only jitter.
     Focus can still scroll the container, so no tile becomes unreachable. */
  scrollbar-width: none;
}

.track {
  display: flex;
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell {
  flex: 0 0 auto;
}

.tile {
  display: block;
}

/* One height for the whole row, the width from the cell. `cover` absorbs the
   half pixel the rounded cell width can differ from the exact ratio. */
.tile :deep(img) {
  height: var(--curated-h);
  object-fit: cover;
}
</style>
