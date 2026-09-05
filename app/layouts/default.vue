<template>
  <div class="shell" :class="[`shell--${asideKind}`, { 'shell--behind': behindClip }]">
    <SiteSidebar>
      <template #aside>
        <TagFilter v-if="asideKind === 'gallery'" />
        <PhotoAside v-else-if="asideKind === 'photo'" />
      </template>
      <template #asideFoot>
        <PhotoAsideFoot v-if="asideKind === 'photo'" />
      </template>
    </SiteSidebar>

    <main id="content" class="content" tabindex="-1">
      <slot />
    </main>

    <!-- The sidebar foot is hidden on mobile; place, language and legal links
         move to the end of the page instead of disappearing. -->
    <SiteFoot class="page-foot" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const { siteUrl } = useRuntimeConfig().public

/**
 * `definePageMeta({ aside })` picks the sidebar content and, on mobile, its grid
 * slot. Route meta rather than a teleport: teleports are dropped during static
 * rendering, leaving the sidebar empty until hydration.
 */
const asideKind = computed(() => route.meta.aside ?? 'none')

/**
 * With the clip as a full-page background the shell's own background would
 * simply cover it: the clip lies behind the shell so the page can scroll over
 * it, and behind means behind the background too.
 */
const { active: clipActive, variant: clipVariant } = useSiteVideo()
const behindClip = computed(() => clipActive.value && clipVariant.value === 'full')

// One instance for the page and both sidebar components, which are siblings of
// the page rather than its descendants.
providePhotoNav()

/* Derived from `route.path`, never `fullPath` (`?tag=` is a view), so
   canonical, hreflang and og:url cannot disagree with the page. */

/** The page's address in the unprefixed form both trees share. */
const basePath = computed(() => stripLocale(route.path))

const canonical = computed(() => absoluteUrl(siteUrl, localePath(basePath.value, locale.value)))

const error = useError()

/**
 * Draft pages stay out of the index, and with it out of the hreflang pairing.
 * So does the error shell, which has no matched route: `404.html` is served for
 * addresses that do not exist, and pointing a canonical at one would be a lie.
 * A route that matched and then threw (an unknown tag, a missing slug) counts
 * as an error page too, hence `useError()` on top of `route.matched`.
 */
const indexable = computed(
  () => route.meta.hasPlaceholders !== true && route.matched.length > 0 && error.value == null,
)

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
  link: () =>
    indexable.value
      ? [{ rel: 'canonical' as const, href: canonical.value }, ...alternates.value]
      : [],
  // Stated either way, because `app.head` sets `noindex` as the default for the
  // routeless shells (404.html/200.html); a real page has to say so explicitly.
  meta: () =>
    indexable.value
      ? [{ name: 'robots', content: 'index, follow' }]
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
/* Named grid areas rather than flexbox: below 768 px the same three parts have
   to appear in a different order. */
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  grid-template-areas: 'brand main';
  align-items: start;
  min-height: 100dvh;
  background: var(--color-bg);
}

.shell--behind {
  background: none;
}

/* While the intro overlay is up, the page stays in the document — that is the
   whole point of an overlay — but is not painted. `visibility`, not `display`:
   the overlay and the clip sit inside this subtree and undo it for themselves.
   A hidden subtree also drops out of the tab order, which is most of a modal
   but not all of it — the overlay traps the focus itself. */
html[data-intro] .shell {
  visibility: hidden;
}

.content {
  grid-area: main;
  min-width: 0;
  /* The hairline sits on the content, not the sidebar: the sidebar is only
     100 dvh tall, the rule has to run the full page height. */
  border-left: var(--border);
  min-height: 100dvh;
}

.page-foot {
  display: none;
}

/* Below 768 px the sidebar dissolves and its foot moves here; over the clip it
   needs the same ground the column gets on the desktop. */
.shell--behind .page-foot {
  background: var(--color-bg);
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

  /* On the detail page the image comes first, the metadata below it. */
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
