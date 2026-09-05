<template>
  <article class="page">
    <!--
      Der sichtbare Titel steht laut Spec in der Seitenleiste, damit das Bild
      den Inhaltsbereich allein hat. Die Überschrift der Seite gehört trotzdem
      in ihren Inhalt: eine <h1> in der seitenübergreifenden Kopfpartie wäre
      keine Überschrift *dieser* Seite. Beides zusammen geht nur so — sichtbar
      in der Sidebar (dort als <p>), semantisch hier.
    -->
    <h1 class="sr-only">{{ photo.title }}</h1>

    <div class="stage">
      <PhotoImage
        :photo="photo"
        :alt="photo.alt ?? photo.title"
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
const found = usePhoto(String(route.params.slug))

if (!found) {
  throw createError({ statusCode: 404, statusMessage: 'Dieses Foto gibt es nicht', fatal: true })
}

const photo = found

/**
 * Anzeigebreite und `srcset`-Deckel folgen der Bühnengeometrie: `contain` in
 * einem 820 px hohen Kasten deckelt die Breite auf `820 · aspectRatio`.
 * Beides steht als reine Funktion in `shared/utils/img.ts` und ist dort
 * getestet.
 */
const sizes = detailSizes(photo.aspectRatio)
const variantMax = detailVariantMax(photo.aspectRatio)

const { nav, pathTo } = usePhotoNav()

/**
 * ← und → blättern wie in der Lightbox. Die Wächter sind der eigentliche
 * Inhalt: mit Modifier gehört der Tastendruck dem Browser (Verlauf, Wortsprung),
 * in einem Eingabefeld dem Feld, und solange ein Dialog offen ist, blättert die
 * Lightbox — nicht die Seite dahinter.
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

const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  title: photo.title,
  description: `${photo.title} – Fotografie von Moritz Späth, ${photo.year}.`,
  ogType: 'article',
  ogTitle: photo.title,
  ogDescription: `${photo.title} – Fotografie von Moritz Späth, ${photo.year}.`,
  ogImage: absoluteUrl(siteUrl, photo.og),
  // Die Maße stehen nicht im Client-Index; die Pipeline erzeugt jedes OG-Bild
  // mit genau 1200×630 (`fit: cover`), die Angabe ist also keine Schätzung.
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: photo.alt ?? photo.title,
  twitterCard: 'summary_large_image',
})

useHead({
  // Ohne Query: `?tag=` ist ein Anzeigekontext, keine eigene Seite.
  link: [{ rel: 'canonical', href: absoluteUrl(siteUrl, `/foto/${photo.slug}`) }],
})
</script>

<style scoped>
/*
  Die Bühne ist so hoch wie die Spec sagt und trägt den Seitenhintergrund: das
  Bild wird nie beschnitten, Hoch- und Querformat sitzen im selben Rahmen.
  Unter 768 px ist `--detail-h: auto` — dort bestimmt die Breite die Höhe.
*/
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
