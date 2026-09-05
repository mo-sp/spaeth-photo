<template>
  <div class="shell" :class="`shell--${asideKind}`">
    <SiteSidebar>
      <template #aside>
        <TagFilter v-if="asideKind === 'gallery'" />
        <PhotoAside v-else-if="asideKind === 'photo'" />
      </template>
      <template #asideFoot>
        <!-- Prev/Next und Zähler der Detailseite folgen in P5. -->
      </template>
    </SiteSidebar>

    <main id="inhalt" class="content" tabindex="-1">
      <slot />
    </main>

    <!-- Mobil ist der Sidebar-Fuß ausgeblendet; Ort und Rechtliches wandern
         ans Seitenende, damit sie nicht ganz verschwinden. -->
    <SiteFoot class="page-foot" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

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
