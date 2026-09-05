<template>
  <!-- Links, not a toggle: the other language is a different address. No
       flags — a flag is a country, not a language. -->
  <nav class="lang t-meta" :aria-label="t('lang.aria')">
    <NuxtLink
      v-for="item in items"
      :key="item.locale"
      :to="item.to"
      class="lang-item"
      :lang="item.tag"
      :hreflang="item.tag"
      :aria-current="item.active ? 'true' : undefined"
      :class="{ 'is-active': item.active }"
    >
      {{ item.name }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { locale, t } = useI18n()

// `aria-current="true"` rather than `"page"`: the navigation entry owns `page`.
const items = computed(() => localeLinks(route.path, locale.value))
</script>

<style scoped>
.lang {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-2);
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-foot-ls);
  color: var(--color-text-faint);
}

.lang-item {
  display: flex;
  align-items: center;
  /* Minimum target size, as on the legal links below. */
  min-height: 24px;
  transition: color var(--t-fast);
}

.lang-item:hover,
.lang-item:focus-visible {
  color: var(--color-text);
}

/* Marked like the active navigation entry; faint vs muted would be a 2 % step. */
.lang-item.is-active {
  color: var(--color-text);
}
</style>
