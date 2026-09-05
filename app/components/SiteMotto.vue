<template>
  <component :is="as" class="motto">
    <button
      type="button"
      class="word light"
      :aria-label="label('light')"
      :aria-pressed="isCurrent('light')"
      @click="choose('light')"
    >
      {{ t('home.motto.light') }}
    </button>
    <span class="slash" aria-hidden="true">/</span>
    <button
      type="button"
      class="word shadow"
      :aria-label="label('shadow')"
      :aria-pressed="isCurrent('dark')"
      @click="choose('dark')"
    >
      {{ t('home.motto.shadow') }}
    </button>
  </component>
</template>

<script setup lang="ts">
import type { Theme } from '#shared/utils/theme'

/**
 * The duality the project is named for, and the theme switch at the same time:
 * light italic and bright, shadow upright and muted, a mono slash as the hinge.
 * Placeholder typography — P11 designs the display face and the contrast
 * between the two words.
 *
 * The same pair appears twice: as the home page's heading and as the choice in
 * the intro. Only the tag differs, so only the tag is a prop.
 */
withDefaults(defineProps<{ as?: string }>(), { as: 'h1' })

const emit = defineEmits<{ choose: [Theme] }>()

const { t } = useI18n()
const { setTheme, isCurrent } = useTheme()

/**
 * The visible word first, then what clicking it does. WCAG 2.5.3 asks for the
 * visible text to be part of the accessible name, so the label is composed from
 * the same string the button shows rather than replacing it.
 */
function label(word: 'light' | 'shadow'): string {
  const action = word === 'light' ? t('theme.toLight') : t('theme.toShadow')
  return `${t(`home.motto.${word}`)} – ${action}`
}

function choose(theme: Theme) {
  setTheme(theme)
  emit('choose', theme)
}
</script>

<style scoped>
.motto {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0;
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-title-size);
  line-height: var(--text-title-lh);
  letter-spacing: var(--text-title-ls);
}

/* A word, not a control: the button contributes nothing but its behaviour. */
.word {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  transition: color var(--t-fast);
}

.light {
  margin-right: 0.06em;
  font-style: italic;
  font-weight: 400;
  color: var(--color-text);
}

.shadow {
  font-weight: 600;
  color: var(--color-text-muted);
}

.shadow:hover,
.shadow:focus-visible {
  color: var(--color-text);
}

.light:hover,
.light:focus-visible {
  color: var(--color-text-muted);
}

.slash {
  margin: 0 0.5em;
  font-family: var(--font-mono);
  font-weight: 400;
  /* Half the motto's size — at the page's 22 px that is exactly the 11 px UI
     step of the handoff, and in the intro the hinge grows with the words. */
  font-size: 0.5em;
  color: var(--color-text-faint);
}
</style>
