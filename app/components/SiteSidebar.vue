<template>
  <!--
    Die linke Spalte ist auf dem Desktop ein einziger klebender Block. Unter
    768 px löst `display: contents` diesen Block auf, und die drei Teile werden
    zu eigenen Feldern des Shell-Grids: Kopfleiste oben, Sidebar-Inhalt
    darunter (oder unter dem Bild), Fuß aus. Der Wrapper ist bewusst ein
    <div> — er verliert durch `display: contents` keine Semantik, die
    Landmarken sitzen auf den Teilen darin.
  -->
  <div class="side" :class="{ 'side--photo': isPhotoPage }">
    <header class="side-top" @keydown.escape="closeMenu">
      <NuxtLink to="/" class="wordmark">
        <span>Moritz</span>
        <span>Späth</span>
      </NuxtLink>

      <!--
        Unter 768 px ist die Navigation ein aufklappbares Menü, oberhalb davon
        eine dauerhaft sichtbare Liste. Das <details> trägt nur den Schalter,
        die Liste steht als Geschwisterelement daneben und wird über
        `[open] ~ .nav` eingeblendet. Grund: ein geschlossenes <details>
        versteckt seine Kinder je nach Engine über `display: none` auf einem
        Shadow-Slot oder über `content-visibility` auf ::details-content —
        beides lässt sich nicht in allen Browsern zuverlässig wieder
        aufheben, und eine Navigation, die im falschen Browser verschwindet,
        ist kein akzeptabler Ausfall. Die Zustandsanzeige (aria-expanded)
        liefert <summary> weiterhin selbst.
      -->
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
            class="nav-item"
            :aria-current="currentState(item.to)"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
        <SiteLang class="panel-lang" />
      </div>
    </header>

    <!--
      Der Mittelteil trägt beides: den Sidebar-Inhalt oben und den Sidebar-Fuß
      der Seite (Prev/Next) unten. Er ist ein eigenes Element, weil er unter
      768 px als ein Grid-Feld an eine andere Stelle wandert — zwei Geschwister
      landeten dort im selben Feld übereinander.
    -->
    <div class="side-main">
      <div class="side-extra">
        <slot name="aside" />
      </div>
      <div class="side-bottom">
        <slot name="asideFoot" />
      </div>
    </div>

    <!-- Auf der Detailseite steht im Sidebar-Fuß Prev/Next samt Rechtslinks
         (`PhotoAsideFoot`); Ort und Koordinaten sind laut Handoff ohnehin eine
         Zutat der Startseite. Zwei Füße übereinander wären zwei Mal
         „Impressum" auf derselben Seite. -->
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

/**
 * Auf der Detailseite trägt die Seitenleiste die Bildmetadaten; die
 * Navigationsliste entfällt dort und der Fuß gehört Prev/Next. Woran die Seite
 * das erkennt, steht schon in den Routen-Metadaten — dieselbe Quelle, aus der
 * das Layout den Sidebar-Inhalt wählt.
 */
const isPhotoPage = computed(() => route.meta.aside === 'photo')

/**
 * Der Aktivzustand der Navigation deckt den ganzen Abschnitt ab, nicht nur die
 * genaue Adresse: `/galerie/segeln` ist eine Galerie-Seite. `NuxtLink` setzt
 * `aria-current` von sich aus nur bei exakter Übereinstimmung — deshalb hier
 * ausgeschrieben. `page` bleibt der genauen Seite vorbehalten, der Abschnitt
 * bekommt das allgemeine `true`; sonst gäbe es auf `/galerie/segeln` zwei
 * „aktuelle Seiten" (die Navigation und den Filter-Chip).
 */
function currentState(to: string): 'page' | 'true' | undefined {
  // Compared in the unprefixed form, never on the raw path: `/de` is the
  // German home page, and a prefix test against it would mark „Home" as the
  // current section on every German page.
  const raw = stripLocale(route.path)
  const current = raw.length > 1 ? raw.replace(/\/$/, '') : raw
  if (current === to) return 'page'
  return to !== '/' && current.startsWith(`${to}/`) ? 'true' : undefined
}

function closeMenu() {
  if (menu.value) menu.value.open = false
}

// Ein <details> schließt sich nach einem Klick nicht von selbst; ohne diesen
// Wächter bliebe das Menü über der neuen Seite stehen.
watch(() => route.fullPath, closeMenu)
</script>

<style scoped>
.side {
  grid-area: brand;
  display: flex;
  flex-direction: column;
  /* Die Spalte klebt über die volle Viewporthöhe, statt mit dem Inhalt zu
     wandern. `align-self` verhindert, dass das Grid sie auf die Höhe der
     Galerie streckt — sonst hätte `position: sticky` nichts, woran es klebt. */
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

/* Zwei Spans statt <br>: auf dem Desktop stehen sie untereinander, in der
   mobilen Kopfleiste nebeneinander — ohne dass das Markup sich ändert. */
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
  gap: 2px;
  margin-top: var(--space-brand);
}

.nav-item {
  padding: 12px var(--space-3);
  border-left: var(--nav-marker) solid transparent;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
  transition:
    color var(--t-fast),
    border-color var(--t-fast);
}

.nav-item:hover,
.nav-item:focus-visible {
  color: var(--color-text);
}

/* Abschnitts-Aktivzustand, nicht nur exakte Adresse: auf `/galerie/segeln`
   bleibt „Galerie" markiert. `router-link-active` trifft für „/" nur die
   Startseite selbst — vue-router vergleicht die getroffenen Routen, nicht das
   Pfad-Präfix. */
.nav-item.router-link-active {
  color: var(--color-text);
  border-left-color: var(--color-text);
}

.side-main {
  display: flex;
  flex-direction: column;
  /* Nimmt den freien Platz, damit `.side-bottom` unten kleben kann und der
     Seitenfuß darunter bleibt. */
  flex: 1 1 auto;
  min-height: 0;
  margin-top: var(--space-brand);
}

.side-extra {
  /* Der Filterblock darf scrollen, wenn die Liste einmal länger wird als die
     Sidebar hoch ist; der Fuß bleibt dabei sichtbar. */
  min-height: 0;
  overflow-y: auto;
}

.side-bottom {
  margin-top: auto;
}

/* `:empty` griffe hier nicht: ein nicht befüllter Slot hinterlässt einen
   Kommentarknoten. `:has(*)` fragt nach echten Elementen. */
.side-extra:not(:has(*)),
.side-bottom:not(:has(*)) {
  display: none;
}

.side-foot {
  margin-top: auto;
  padding: var(--space-3) var(--space-3) 0;
}

/* Die Navigationsliste entfällt auf der Detailseite — nur oberhalb von 768 px:
   mobil ist sie das Menü der Kopfleiste und damit der einzige Weg zu den
   übrigen Seiten. Die Wortmarke bleibt in beiden Fällen als Weg zur
   Startseite. */
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
    /* Bezugsrahmen für das ausgeklappte Menü. */
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: var(--topbar-h);
    padding: 0 var(--space-1) 0 0;
    isolation: isolate;
    /* Deckend, sonst scrollen die Kacheln sichtbar hindurch. */
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

  /* Ort und Rechtliches stehen mobil im Seitenfuß (Layout), nicht hier. */
  .side-foot {
    display: none;
  }
}
</style>
