<template>
  <article class="page">
    <!-- The visible title sits in the sidebar so the image owns the content
         area, but a page's heading belongs to its content: visible as a <p> in
         the sidebar, semantic here. -->
    <h1 class="sr-only">{{ title }}</h1>

    <div class="stage">
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

/**
 * ← and → page as in the lightbox. The guards are the point: with a modifier the
 * key belongs to the browser, in a field to the field, and while a dialog is
 * open to the lightbox.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const target = event.target as HTMLElement | null
  if (target?.isContentEditable) return
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
  if (document.querySelector('dialog[open]')) return

  const step =
    event.key === 'ArrowLeft' ? nav.value.prev : event.key === 'ArrowRight' ? nav.value.next : null
  const to = pathTo(step)
  if (!to) return

  event.preventDefault()
  void router.push(to)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

const title = computed(() => photoTitle(photo, locale.value))

useSiteSeo({
  title,
  description: () => t('photo.description', { title: title.value, year: photo.year }),
  ogType: 'article',
  image: () => ({ path: photo.og, alt: photoAlt(photo, locale.value) }),
})
</script>

<style scoped>
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
