<template>
  <div class="aside">
    <NuxtLink class="back" :to="backTo">
      <span aria-hidden="true">←</span>
      Galerie
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
/**
 * Sidebar der Detailseite. In P4 trägt sie nur den Rückweg; Titel, Jahr, Tags
 * und Prev/Next folgen in P5.
 */
const route = useRoute()

/** Der Filterkontext reist als `?tag=` mit, damit der Rückweg dorthin führt. */
const backTo = computed(() => {
  const tag = parseTag(route.query.tag)
  return tag === null ? '/galerie' : `/galerie/${tag}`
})
</script>

<style scoped>
.aside {
  padding: 0 var(--space-3);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 24px;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
  transition: color var(--t-fast);
}

.back:hover,
.back:focus-visible {
  color: var(--color-text);
}

@media (max-width: 767px) {
  .aside {
    padding: var(--space-2);
  }
}
</style>
