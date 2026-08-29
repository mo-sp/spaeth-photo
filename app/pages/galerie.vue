<template>
  <div class="page">
    <h1>Galerie</h1>
  </div>
</template>

<script setup lang="ts">
// Platzhalter — Inhalte folgen in P4.
useSeoMeta({ title: 'Galerie' })
</script>

<style scoped>
.page {
  padding: var(--space-4);
}

h1 {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-s-size);
  line-height: var(--text-title-s-lh);
  letter-spacing: var(--text-title-s-ls);
  color: var(--color-text);
}
</style>
