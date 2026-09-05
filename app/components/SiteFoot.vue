<template>
  <!--
    Ort, Koordinaten und die Rechtslinks. Auf der Detailseite tritt
    `PhotoAsideFoot` an diese Stelle — dort trägt der Sidebar-Fuß Prev/Next, und
    die Rechtslinks kommen von dort. Sichtbar ist immer genau eine der beiden
    Fassungen (mobil der Seitenfuß im Layout).
  -->
  <footer class="foot">
    <p class="place">
      Wedel<br />
      <span class="coords">53.58°N 9.70°E</span>
    </p>
    <SiteLang class="lang" />
    <SiteLegal class="legal" />
  </footer>
</template>

<style scoped>
.foot {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-foot-ls);
  text-transform: uppercase;
  color: var(--color-text-faint);
}

.place {
  margin: 0;
}

.lang {
  margin-top: var(--space-2);
}

.legal {
  margin-top: var(--space-1);
}
</style>
