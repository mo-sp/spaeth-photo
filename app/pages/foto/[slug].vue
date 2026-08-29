<template>
  <div class="page">
    <h1>Foto: {{ slug }}</h1>
  </div>
</template>

<script setup lang="ts">
// Platzhalter — Detailseite folgt in P5.
const route = useRoute()
const slug = computed(() => String(route.params.slug))
useSeoMeta({ title: () => `Foto: ${slug.value}` })
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
