<template>
  <DocPage :title="t('about.title')">
    <DocAboutDe v-if="locale === 'de'" />
    <DocAboutEn v-else />
  </DocPage>
</template>

<script setup lang="ts">
definePageMeta({ hasPlaceholders: true })

const { locale, t } = useI18n()

useSiteSeo({
  title: () => t('about.title'),
  description: () => t('about.description'),
  ogType: 'profile',
})
</script>
