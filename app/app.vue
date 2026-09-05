<template>
  <div>
    <!-- First focusable element in the document: skips wordmark, nav and filter. -->
    <a class="skip-link" href="#content">{{ t('a11y.skip') }}</a>
    <!-- Announces the new page after a client-side navigation; without it the change goes unnoticed. -->
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
