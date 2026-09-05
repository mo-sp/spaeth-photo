<template>
  <DocPage :title="t('privacy.title')">
    <DocPrivacyDe v-if="locale === 'de'" />
    <DocPrivacyEn v-else />
  </DocPage>
</template>

<script setup lang="ts">
definePageMeta({ hasPlaceholders: true })

const { locale, t } = useI18n()

useSiteSeo({
  title: () => t('privacy.title'),
  description: () => t('privacy.description'),
  ogType: 'website',
})
</script>
