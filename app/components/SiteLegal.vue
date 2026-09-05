<template>
  <!-- § 5 DDG verlangt „leicht erkennbar, unmittelbar erreichbar und ständig
       verfügbar" — deshalb auf jeder Seite, nicht nur im Impressum. Untereinander
       statt „Impressum · Datenschutz": zwei 10-px-Links in einer Zeile liegen
       unter der Mindest-Zielgröße von 24 px. Vertikal mit `min-height` reicht
       jeder Link an 24 px heran, ohne dass die Schrift wächst. -->
  <nav class="legal" :aria-label="t('legal.aria')">
    <NuxtLink :to="path('/legal-notice')">{{ t('legal.notice') }}</NuxtLink>
    <NuxtLink :to="path('/privacy')">{{ t('legal.privacy') }}</NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const { t, path } = useI18n()
</script>

<style scoped>
.legal {
  display: flex;
  flex-direction: column;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-foot-ls);
  text-transform: uppercase;
  color: var(--color-text-faint);
}

.legal a {
  display: flex;
  align-items: center;
  min-height: 24px;
  transition: color var(--t-fast);
}

.legal a:hover,
.legal a:focus-visible {
  color: var(--color-text);
}
</style>
