<template>
  <NuxtLayout>
    <div class="head">
      <h1 class="head-title t-title-s">{{ heading }}</h1>
      <p class="head-note">{{ error.statusCode }}</p>
    </div>
    <div class="body">
      <p>{{ error.statusCode === 404 ? t('error.404.text') : t('error.other.text') }}</p>
      <nav class="links t-ui" :aria-label="t('error.nav.aria')">
        <NuxtLink :to="path('/')">{{ t('error.home') }}</NuxtLink>
        <NuxtLink :to="path('/gallery')">{{ t('error.gallery') }}</NuxtLink>
      </nav>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t, path } = useI18n()

const heading = computed(() =>
  props.error.statusCode === 404
    ? t('error.title')
    : t('error.status', { status: props.error.statusCode ?? 500 }),
)

useHead({
  title: () => heading.value,
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: var(--border);
}

.head-title {
  margin: 0;
}

.head-note {
  flex: 0 0 auto;
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.body {
  max-width: 62ch;
  padding: var(--space-5) var(--space-4) var(--space-6);
  font-family: var(--font-sans);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  color: var(--color-text);
}

.body p {
  margin: 0 0 var(--space-3);
  text-wrap: pretty;
}

.links {
  display: flex;
  gap: var(--space-3);
  color: var(--color-text-muted);
}

.links a {
  display: flex;
  align-items: center;
  min-height: 24px;
  transition: color var(--t-fast);
}

.links a:hover,
.links a:focus-visible {
  color: var(--color-text);
}

@media (max-width: 767px) {
  .head {
    padding: var(--space-2);
  }

  .body {
    padding: var(--space-3) var(--space-2) var(--space-4);
  }
}
</style>
