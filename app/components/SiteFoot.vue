<template>
  <!-- Exactly one foot is ever visible: `PhotoAsideFoot` replaces this one on
       the detail page, and the layout's page foot replaces it on mobile. -->
  <footer class="foot t-meta">
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
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-foot-ls);
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
