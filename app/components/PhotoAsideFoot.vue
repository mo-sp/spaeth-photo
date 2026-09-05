<template>
  <div v-if="nav.total > 0" class="foot">
    <nav class="steps" aria-label="Foto-Navigation">
      <NuxtLink v-if="prevTo" class="step" :to="prevTo" rel="prev">
        <span aria-hidden="true">←</span>
        Vorher
        <span class="sr-only">: {{ nav.prev?.title }}</span>
      </NuxtLink>
      <NuxtLink v-if="nextTo" class="step" :to="nextTo" rel="next">
        Nachher
        <span aria-hidden="true">→</span>
        <span class="sr-only">: {{ nav.next?.title }}</span>
      </NuxtLink>
    </nav>

    <p class="counter">
      <!-- Sichtbar bleibt die Kurzform; die gesprochene Fassung steht als
           eigener Text daneben. Ein `aria-label` auf einem Absatz wird von
           vielen Screenreadern ignoriert. -->
      <span aria-hidden="true">{{ padCounter(nav.position) }} / {{ padCounter(nav.total) }}</span>
      <span class="sr-only">Bild {{ nav.position }} von {{ nav.total }}</span>
    </p>

    <!-- Der Sidebar-Fuß dieser Seite ersetzt `SiteFoot`, trägt die Rechtslinks
         also selbst. Unter 768 px stehen sie im Seitenfuß des Layouts, hier
         also nicht — sonst stünden sie zweimal auf derselben Seite. -->
    <SiteLegal class="legal" />
  </div>
</template>

<script setup lang="ts">
/**
 * Der Fuß der Detail-Seitenleiste: Prev/Next in der aktuell gefilterten Liste,
 * der Positionszähler und die Rechtslinks.
 *
 * Die Nachbarn kommen aus derselben Ableitung wie auf der Seite selbst
 * (`usePhotoNav`) — inklusive des Filterkontexts, der erst nach der Hydration
 * zieht. Vor der Hydration zeigt der Fuß die Nachbarn im ungefilterten Bestand;
 * genau das steht auch im prerenderten HTML.
 */
const { nav, pathTo } = usePhotoNav()

const prevTo = computed(() => pathTo(nav.value.prev))
const nextTo = computed(() => pathTo(nav.value.next))
</script>

<style scoped>
.foot {
  padding: var(--space-3) var(--space-3) 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.step {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  /* Mindest-Zielgröße; die 11-px-Zeile allein wäre halb so hoch. */
  min-height: 24px;
  transition: color var(--t-fast);
}

.step:hover,
.step:focus-visible {
  color: var(--color-text);
}

.counter {
  margin: 0;
  padding-top: var(--space-1);
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-meta-lh);
  letter-spacing: var(--text-foot-ls);
  /* Ohne tabular-nums springt der Zähler beim Blättern in der Breite. */
  font-variant-numeric: tabular-nums;
  color: var(--color-text-faint);
}

.legal {
  margin-top: var(--space-3);
}

@media (max-width: 767px) {
  .foot {
    padding: 0 var(--space-2) var(--space-2);
  }

  .legal {
    display: none;
  }
}
</style>
