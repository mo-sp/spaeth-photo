<template>
  <!-- One sticky block on the desktop; below 768 px `display: contents`
       dissolves it so the three parts become their own shell-grid areas. A
       <div> on purpose: `display: contents` would strip it of semantics, and
       the landmarks sit on the parts inside. -->
  <div class="side" :class="{ 'side--photo': isPhotoPage }">
    <header class="side-top" @keydown.escape="closeMenu">
      <NuxtLink :to="path('/')" class="wordmark">
        <span>Moritz</span>
        <span>Späth</span>
      </NuxtLink>

      <!-- The <details> carries only the toggle; the list is a sibling shown
           via `[open] ~ .panel`. A closed <details> hides its children through
           a shadow slot or ::details-content depending on the engine, and
           neither can be undone reliably in every browser. <summary> still
           provides aria-expanded itself. -->
      <details ref="menu" class="menu">
        <summary class="menu-toggle" aria-controls="main-navigation">
          <span aria-hidden="true">≡</span>
          {{ t('nav.menu') }}
        </summary>
      </details>
      <!-- The panel is `display: contents` above 768 px, so the nav sits in
           the sidebar exactly as before; below it, the panel is the drop-down
           and carries the language switch as its last block. -->
      <div class="panel">
        <nav id="main-navigation" class="nav" :aria-label="t('nav.aria')">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="path(item.to)"
            class="nav-item t-ui"
            :aria-current="currentState(item.to)"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
        <SiteLang class="panel-lang" />
      </div>
    </header>

    <!-- One element rather than two siblings: below 768 px this moves as a
         single grid area, and siblings would stack inside it. -->
    <div class="side-main">
      <div class="side-extra">
        <slot name="aside" />
      </div>
      <div class="side-bottom">
        <slot name="asideFoot" />
      </div>
    </div>

    <!-- On the detail page `PhotoAsideFoot` takes this slot and brings the
         legal links with it; two feet would mean two "Impressum" links on one page. -->
    <SiteFoot v-if="!isPhotoPage" class="side-foot" />
  </div>
</template>

<script setup lang="ts">
const { t, path } = useI18n()

/** Unprefixed targets; `path()` puts them into the current language tree. */
const navigation = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: '/gallery', label: t('nav.gallery') },
  { to: '/about', label: t('nav.about') },
])

const menu = useTemplateRef<HTMLDetailsElement>('menu')
const route = useRoute()

/** Read from the route meta the layout already uses to pick the sidebar content. */
const isPhotoPage = computed(() => route.meta.aside === 'photo')

/**
 * Section-wide active state: `/gallery/sailing` is a gallery page, but NuxtLink
 * sets `aria-current` only on an exact match. `page` stays reserved for the
 * exact page so a filtered gallery does not report two current pages.
 */
function currentState(to: string): 'page' | 'true' | undefined {
  // Compared unprefixed: `/de` is the German home page, and a prefix test
  // against the raw path would mark Home as current on every German page.
  const raw = stripLocale(route.path)
  const current = raw.length > 1 ? raw.replace(/\/$/, '') : raw
  if (current === to) return 'page'
  return to !== '/' && current.startsWith(`${to}/`) ? 'true' : undefined
}

function closeMenu() {
  if (menu.value) menu.value.open = false
}

// A <details> does not close itself after a click; without this the menu
// would stay open over the new page.
watch(() => route.fullPath, closeMenu)
</script>

<style scoped>
.side {
  grid-area: brand;
  display: flex;
  flex-direction: column;
  /* `align-self` keeps the grid from stretching the column to gallery height —
     otherwise `position: sticky` would have nothing to stick to. */
  align-self: flex-start;
  position: sticky;
  top: 0;
  height: 100dvh;
  padding: var(--space-4) 0;
}

.wordmark {
  display: block;
  padding: 0 var(--space-3);
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: var(--text-nav-size);
  line-height: var(--text-nav-lh);
  letter-spacing: var(--text-nav-ls);
  text-transform: uppercase;
  color: var(--color-text);
}

/* Two spans rather than a <br>: stacked on the desktop, side by side in the
   mobile top bar, with no markup change. */
.wordmark span {
  display: block;
}

.menu {
  display: none;
}

/* Above 768 px the wrapper is not there as far as layout is concerned. */
.panel {
  display: contents;
}

/* The language switch lives in the sidebar foot on the desktop; in the mobile
   menu it is the second half of the drop-down. */
.panel-lang {
  display: none;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: var(--space-brand);
}

/* Size only; the mono capitals and their letter spacing come from `.t-ui`. */
.nav-item {
  padding: 12px var(--space-3);
  font-size: var(--text-nav-item-size);
  border-left: var(--nav-marker) solid transparent;
  color: var(--color-text-muted);
  transition:
    color var(--t-fast),
    border-color var(--t-fast);
}

.nav-item:hover,
.nav-item:focus-visible {
  color: var(--color-text);
}

/* Section active state, not just the exact address. For `/` the rule still
   matches only the home page: vue-router compares matched routes, not path prefixes. */
.nav-item.router-link-active {
  color: var(--color-text);
  border-left-color: var(--color-text);
}

.side-main {
  display: flex;
  flex-direction: column;
  /* Takes the free space so `.side-bottom` can sit at the bottom. */
  flex: 1 1 auto;
  min-height: 0;
  margin-top: var(--space-brand);
}

.side-extra {
  /* Lets the filter scroll if the list outgrows the sidebar, keeping the foot visible. */
  min-height: 0;
  overflow-y: auto;
}

.side-bottom {
  margin-top: auto;
}

/* `:empty` would not match: an unfilled slot leaves a comment node behind. */
.side-extra:not(:has(*)),
.side-bottom:not(:has(*)) {
  display: none;
}

.side-foot {
  margin-top: auto;
  padding: var(--space-3) var(--space-3) 0;
}

/* The nav list goes away on the detail page, but only above 768 px: on mobile
   it is the top-bar menu and the only way to the other pages. */
@media (min-width: 768px) {
  .side--photo .nav {
    display: none;
  }
}

@media (max-width: 767px) {
  .side {
    display: contents;
  }

  .side-top {
    grid-area: brand;
    position: sticky;
    /* Containing block for the drop-down menu. */
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: var(--topbar-h);
    padding: 0 var(--space-1) 0 0;
    isolation: isolate;
    /* Opaque, or the tiles show through while scrolling. */
    background: var(--color-bg);
    border-bottom: var(--border);
  }

  .wordmark {
    padding: 0 var(--space-2);
  }

  .wordmark span {
    display: inline;
  }

  .wordmark span + span::before {
    content: ' ';
  }

  .menu {
    display: block;
  }

  .menu-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 44px;
    padding: 0 var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-ui-size);
    letter-spacing: var(--text-ui-ls);
    text-transform: uppercase;
    color: var(--color-text-muted);
    cursor: pointer;
    list-style: none;
  }

  .menu-toggle::-webkit-details-marker {
    display: none;
  }

  .menu[open] .menu-toggle {
    color: var(--color-text);
  }

  .panel {
    display: none;
    position: absolute;
    top: var(--topbar-h);
    right: 0;
    z-index: 20;
    min-width: 180px;
    padding: var(--space-1) 0;
    background: var(--color-bg);
    border: var(--border);
  }

  .menu[open] ~ .panel {
    display: block;
  }

  .nav {
    margin-top: 0;
  }

  .panel-lang {
    display: flex;
    gap: 0 var(--space-2);
    margin-top: var(--space-1);
    padding: var(--space-1) var(--space-3) 0;
    border-top: var(--border);
  }

  .side-main {
    grid-area: aside;
    display: block;
    margin-top: 0;
  }

  .side-extra {
    overflow: visible;
  }

  /* On mobile, place and legal links live in the page foot (layout), not here. */
  .side-foot {
    display: none;
  }
}
</style>
