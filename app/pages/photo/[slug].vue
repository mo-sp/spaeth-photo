<template>
  <article class="page">
    <!-- The visible title sits in the sidebar so the image owns the content
         area, but a page's heading belongs to its content: visible as a <p> in
         the sidebar, semantic here. -->
    <h1 class="sr-only">{{ title }}</h1>

    <div class="stage" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
      <PhotoImage
        :photo="photo"
        :alt="photoAlt(photo, locale)"
        :sizes="sizes"
        :variant-max="variantMax"
        eager
        priority
        lqip
      />
    </div>
  </article>
</template>

<script setup lang="ts">
definePageMeta({ aside: 'photo' })

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const found = findPhoto(String(route.params.slug))

if (!found) {
  throw createError({
    statusCode: 404,
    statusMessage: translate(localeOf(route.path), 'photo.notFound'),
    fatal: true,
  })
}

const photo = found

/** Display width and `srcset` cap follow the stage geometry; both are pure and tested in `shared/utils/img.ts`. */
const sizes = detailSizes(photo.aspectRatio)
const variantMax = detailVariantMax(photo.aspectRatio)

const { nav, pathTo } = usePhotoNav()

/** Arrow keys and a swipe reach the same neighbours the sidebar links to. */
const { onTouchStart, onTouchEnd } = usePhotoStepKeys((step) => {
  const to = pathTo(nav.value[step])
  if (to === null) return false
  void router.push(to)
  return true
})

const title = computed(() => photoTitle(photo, locale.value))

useSiteSeo({
  title,
  description: () => t('photo.description', { title: title.value, year: photo.year }),
  ogType: 'article',
  image: () => ({ path: photo.og, alt: photoAlt(photo, locale.value) }),
})
</script>

<style scoped>
/* Every other page opens with the padding of its header block; without it the
   stage would sit flush against the top edge. */
.page {
  padding-block: var(--space-4);
}

/* The stage carries the page background so the image is never cropped and both
   orientations sit in the same frame. Below 768 px width drives the height. */
.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--detail-h);
  background: var(--color-bg);
}

.stage :deep(picture) {
  display: flex;
  max-height: 100%;
}

.stage :deep(img) {
  width: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

@media (max-width: 767px) {
  /* The sticky top bar already separates the page from the edge here. */
  .page {
    padding-block: var(--space-2);
  }

  .stage {
    height: auto;
  }

  .stage :deep(picture) {
    width: 100%;
  }

  .stage :deep(img) {
    width: 100%;
    height: auto;
  }
}
</style>
