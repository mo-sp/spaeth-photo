<template>
  <!--
    Die linke Spalte ist auf dem Desktop ein einziger klebender Block. Unter
    768 px löst `display: contents` diesen Block auf, und die drei Teile werden
    zu eigenen Feldern des Shell-Grids: Kopfleiste oben, Sidebar-Inhalt
    darunter (oder unter dem Bild), Fuß aus. Der Wrapper ist bewusst ein
    <div> — er verliert durch `display: contents` keine Semantik, die
    Landmarken sitzen auf den Teilen darin.
  -->
  <div class="side">
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
        <summary class="menu-toggle" aria-controls="hauptnavigation">
          <span aria-hidden="true">≡</span>
          Menü
        </summary>
      </details>
      <nav id="hauptnavigation" class="nav" aria-label="Hauptnavigation">
        <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-item">
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <div class="side-extra">
      <slot name="aside" />
      <slot name="asideFoot" />
    </div>

    <SiteFoot class="side-foot" />
  </div>
</template>

<script setup lang="ts">
const navigation = [
  { to: '/', label: 'Start' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/ueber', label: 'Über' },
]

const menu = useTemplateRef<HTMLDetailsElement>('menu')
const route = useRoute()

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

.nav-item.router-link-exact-active {
  color: var(--color-text);
  border-left-color: var(--color-text);
}

.side-extra {
  margin-top: var(--space-brand);
  /* Der Filterblock darf scrollen, wenn die Liste einmal länger wird als die
     Sidebar hoch ist; der Fuß bleibt dabei sichtbar. */
  min-height: 0;
  overflow-y: auto;
}

/* `:empty` griffe hier nicht: ein nicht befüllter Slot hinterlässt einen
   Kommentarknoten. `:has(*)` fragt nach echten Elementen. */
.side-extra:not(:has(*)) {
  display: none;
}

.side-foot {
  margin-top: auto;
  padding: var(--space-3) var(--space-3) 0;
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

  .nav {
    display: none;
    position: absolute;
    top: var(--topbar-h);
    right: 0;
    z-index: 20;
    min-width: 180px;
    margin-top: 0;
    padding: var(--space-1) 0;
    background: var(--color-bg);
    border: var(--border);
  }

  .menu[open] ~ .nav {
    display: flex;
  }

  .side-extra {
    grid-area: aside;
    margin-top: 0;
    overflow: visible;
  }

  /* Ort und Rechtliches stehen mobil im Seitenfuß (Layout), nicht hier. */
  .side-foot {
    display: none;
  }
}
</style>
