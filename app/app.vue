<template>
  <div>
    <!-- Erste fokussierbare Stelle im Dokument: überspringt Wortmarke,
         Navigation und Filter. -->
    <a class="skip-link" href="#inhalt">{{ t('a11y.skip') }}</a>
    <!-- Sagt Screenreadern nach einer Client-Navigation an, welche Seite nun
         gilt — ohne ihn bleibt der Wechsel unbemerkt. -->
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
