<template>
  <div class="page">
    <div class="head">
      <h1 class="head-title t-title-s">{{ heading }}</h1>
      <p class="head-count">
        <!-- Two digits visually, a plain number when spoken: "zero five photos"
             would be reading out the layout. -->
        <span aria-hidden="true">{{
          tn('count.photos', visible.length, padCounter(visible.length))
        }}</span>
        <span class="sr-only">{{ tn('count.photos', visible.length) }}</span>
      </p>
    </div>

    <PhotoGrid :photos="visible" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ aside: 'gallery' })

const route = useRoute()
const { photos, knownTag } = usePhotos()
const { locale, t, tn, tag: tagText } = useI18n()

/** The tag is in the path, so an unknown tag is a missing address, not an empty gallery. */
const tag = computed(() => knownTag(route.params.tag))

if (route.params.tag && tag.value === null) {
  throw createError({
    statusCode: 404,
    statusMessage: translate(localeOf(route.path), 'gallery.unknownTag'),
    fatal: true,
  })
}

const visible = computed(() => filterByTag(photos, tag.value))

const heading = computed(() => (tag.value === null ? t('gallery.title') : tagText(tag.value)))

useSiteSeo({
  // The document title names the section as well; the visible <h1> is just the
  // tag, because the page is already inside the gallery.
  title: () =>
    tag.value === null ? t('gallery.title') : t('gallery.tagTitle', { tag: tagText(tag.value) }),
  description: () =>
    tag.value === null
      ? t('gallery.description.all')
      : t('gallery.description.tag', { tag: tagText(tag.value) }),
  // The first photo of the current filter previews the filter, not the site.
  image: () => {
    const first = visible.value[0]
    return first === undefined ? null : { path: first.og, alt: photoAlt(first, locale.value) }
  },
})
</script>

<style scoped>
/* The top padding is the shared, fluid page-top token, so the first content
   element sits at the same height as on every other page. */
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-page-top) var(--space-4) var(--space-4);
  border-bottom: var(--border);
}

.head-title {
  margin: 0;
}

.head-count {
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

@media (max-width: 767px) {
  .head {
    padding: var(--space-page-top) var(--space-2) var(--space-2);
  }
}
</style>
