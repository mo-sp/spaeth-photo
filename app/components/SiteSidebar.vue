<template>
  <aside class="sidebar">
    <NuxtLink to="/" class="wordmark">Moritz<br />Späth</NuxtLink>

    <nav class="nav">
      <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-item">
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Platz für seitenspezifische Elemente, z. B. den Galerie-Filter (P4). -->
    <slot name="aside" />

    <footer class="foot">
      <p class="place">Wedel<br />53.58°N 9.70°E</p>
      <p class="legal">
        <NuxtLink to="/impressum">Impressum</NuxtLink>
        <span aria-hidden="true"> · </span>
        <NuxtLink to="/datenschutz">Datenschutz</NuxtLink>
      </p>
    </footer>
  </aside>
</template>

<script setup lang="ts">
const navigation = [
  { to: '/', label: 'Start' },
  { to: '/galerie', label: 'Galerie' },
  { to: '/ueber', label: 'Über' },
]
</script>

<style scoped>
.sidebar {
  flex: 0 0 var(--sidebar-w);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: sticky;
  top: 0;
  padding: var(--space-4) 0;
  border-right: var(--border);
}

.wordmark {
  padding: 0 var(--space-3);
  margin-bottom: 44px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: var(--text-nav-size);
  line-height: var(--text-nav-lh);
  letter-spacing: var(--text-nav-ls);
  text-transform: uppercase;
  color: var(--color-text);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
    color 120ms ease,
    border-color 120ms ease;
}

.nav-item:hover {
  color: var(--color-text);
}

.nav-item.router-link-exact-active {
  color: var(--color-text);
  border-left-color: var(--color-text);
}

.foot {
  margin-top: auto;
  padding: 0 var(--space-3);
}

.place,
.legal {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: 1.6;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-faint);
}

.legal {
  margin-top: var(--space-2);
}

.legal a {
  transition: color 120ms ease;
}

.legal a:hover {
  color: var(--color-text);
}
</style>
