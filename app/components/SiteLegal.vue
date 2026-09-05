<template>
  <!-- § 5 DDG requires the legal notice to be permanently available, hence on
       every page. Stacked rather than on one line: two 10 px links side by side
       fall below the 24 px minimum target size. -->
  <nav class="legal t-meta" :aria-label="t('legal.aria')">
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
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-foot-ls);
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
