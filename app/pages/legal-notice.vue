<template>
  <DocPage :title="t('legalNotice.title')">
    <DocLegalNoticeDe v-if="locale === 'de'" />
    <DocLegalNoticeEn v-else />
  </DocPage>
</template>

<script setup lang="ts">
definePageMeta({ hasPlaceholders: true })

const { locale, t } = useI18n()

useSiteSeo({
  title: () => t('legalNotice.title'),
  description: () => t('legalNotice.description'),
  ogType: 'website',
})
</script>
