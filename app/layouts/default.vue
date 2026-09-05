<template>
  <div class="shell" :class="`shell--${asideKind}`">
    <SiteSidebar>
      <template #aside>
        <TagFilter v-if="asideKind === 'gallery'" />
        <PhotoAside v-else-if="asideKind === 'photo'" />
      </template>
      <template #asideFoot>
        <PhotoAsideFoot v-if="asideKind === 'photo'" />
      </template>
    </SiteSidebar>

    <main id="inhalt" class="content" tabindex="-1">
      <slot />
    </main>

    <!-- Mobil ist der Sidebar-Fuß ausgeblendet; Ort, Sprache und Rechtliches
         wandern ans Seitenende, damit sie nicht ganz verschwinden. -->
    <SiteFoot class="page-foot" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const { siteUrl } = useRuntimeConfig().public

/**
 * `definePageMeta({ aside })` steuert, was in der Sidebar steht — und mobil
 * auch, wo der Sidebar-Inhalt im Grid landet: der Galerie-Filter gehört über
 * die Kacheln, die Metadaten eines Fotos unter das Bild.
 *
 * Der Weg über die Routen-Metadaten ersetzt einen Teleport aus der Seite in
 * die Sidebar: Teleports werden beim statischen Rendern verworfen, die Sidebar
 * bliebe im ausgelieferten HTML leer und füllte sich erst nach der Hydration.
 */
const asideKind = computed(() => route.meta.aside ?? 'none')

/*
 * Per-locale head block for the whole site. Derived from `route.path` (never
 * `fullPath`: `?tag=`/`?foto=` are views), so canonical, hreflang and og:url
 * cannot disagree with the page they are on.
 */

/** The page's address in the unprefixed form both trees share. */
const basePath = computed(() => stripLocale(route.path))

const canonical = computed(() => absoluteUrl(siteUrl, localePath(basePath.value, locale.value)))

/** Draft pages stay out of the index, and with it out of the hreflang pairing. */
const indexable = computed(() => route.meta.hasPlaceholders !== true)

const alternates = computed(() => {
  if (!indexable.value) return []
  const links = LOCALES.map((code) => ({
    rel: 'alternate' as const,
    hreflang: LOCALE_TAGS[code],
    href: absoluteUrl(siteUrl, localePath(basePath.value, code)),
  }))
  // x-default is the page for a crawler with no better match: English.
  return [
    ...links,
    {
      rel: 'alternate' as const,
      hreflang: 'x-default',
      href: absoluteUrl(siteUrl, localePath(basePath.value, DEFAULT_LOCALE)),
    },
  ]
})

useHead({
  htmlAttrs: { lang: () => LOCALE_TAGS[locale.value] },
  link: () => [{ rel: 'canonical' as const, href: canonical.value }, ...alternates.value],
  meta: () =>
    indexable.value
      ? []
      : // `follow`, because the links on a draft lead to finished pages.
        [{ name: 'robots', content: 'noindex, follow' }],
})

useSeoMeta({
  ogUrl: canonical,
  ogLocale: () => OG_LOCALES[locale.value],
  ogLocaleAlternate: () =>
    LOCALES.filter((code) => code !== locale.value).map((code) => OG_LOCALES[code]),
})
</script>

<style scoped>
/*
  Grundgerüst laut Spec 1C: feste Seitenleiste links, randloser Inhalt rechts.
  Als Grid mit benannten Feldern statt Flexbox, weil unter 768 px dieselben drei
  Teile in unterschiedlicher Reihenfolge stehen müssen.
*/
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  grid-template-areas: 'brand main';
  align-items: start;
  min-height: 100dvh;
  background: var(--color-bg);
}

.content {
  grid-area: main;
  min-width: 0;
  /* Die Hairline sitzt auf dem Inhalt, nicht auf der Sidebar: die Sidebar ist
     nur 100 dvh hoch, der Strich soll aber über die volle Seitenlänge laufen. */
  border-left: var(--border);
  min-height: 100dvh;
}

.page-foot {
  display: none;
}

@media (max-width: 767px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'brand'
      'aside'
      'main'
      'foot';
  }

  /* Auf der Detailseite steht das Bild zuerst, die Metadaten darunter. */
  .shell--photo {
    grid-template-areas:
      'brand'
      'main'
      'aside'
      'foot';
  }

  .content {
    border-left: 0;
    min-height: 0;
  }

  .page-foot {
    grid-area: foot;
    display: block;
    padding: var(--space-3) var(--space-2);
    border-top: var(--border);
  }
}
</style>
