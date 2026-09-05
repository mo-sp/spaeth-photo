<template>
  <component :is="as" class="motto" :class="{ 'motto--flat': !overClip }">
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
 * a script "Light", a mono slash as the hinge, "Shadow" in Archivo's heaviest
 * capitals. The two words keep their colours whichever palette is on — what
 * changes is which of them is filled in and which is faded or drawn as an
 * outline, and that is decided entirely in CSS (see tokens.css, "Motto"), so it
 * is already right in the prerendered HTML.
 *
 * The same pair appears twice: as the home page's heading and as the choice in
 * the intro. Only the tag differs, so only the tag is a prop; the intro's larger
 * scale is one custom property, set by the intro.
 */
withDefaults(defineProps<{ as?: string }>(), { as: 'h1' })

const emit = defineEmits<{ choose: [Theme] }>()

const { t } = useI18n()
const { setTheme, isCurrent } = useTheme()

/**
 * Whether a clip is playing behind these words. The motto only ever appears on
 * the start page and in its intro, so `active` answers exactly that — and it is
 * a build value, so the class is the same on the server and after hydration.
 */
const { active: overClip } = useSiteVideo()

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
/* One size drives the line: the upright word and the hinge are both a fixed
   fraction of the script word (`--motto-caps-size`), so the composition holds
   at every viewport. Baselines, not boxes, because the two faces sit very
   differently in their em. */
.motto {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0;
  margin: 0;
  font-size: var(--motto-size);
  /* The script has long ascenders and descenders; 1 would let them out of the
     line box and into the hairline below the row. */
  line-height: 1.2;
}

/* No clip behind the words, so the five colour roles swap to their groundless
   set (tokens.css). The substitution has to happen here rather than in
   `:root` — a custom property that references another one is resolved where it
   is declared, so an override further down the tree would come too late. */
.motto--flat {
  --motto-script-color: var(--motto-script-color-flat);
  --motto-script-color-hover: var(--motto-script-color-hover-flat);
  --motto-script-glow: var(--motto-script-glow-flat);
  --motto-caps-color: var(--motto-caps-color-flat);
  --motto-caps-fallback: var(--motto-caps-fallback-flat);
}

/* A word, not a control: the button contributes nothing but its behaviour. */
.word {
  padding: 0;
  border: 0;
  background: none;
  line-height: inherit;
  cursor: pointer;
  transition:
    color var(--t-slow),
    -webkit-text-stroke-color var(--t-slow);
}

/* Over a moving picture a change of colour is not a focus indicator. */
.word:focus-visible {
  outline: 1px solid var(--color-text);
  outline-offset: 6px;
}

/* "Light". The letter spacing is the most the script takes before its joins
   come apart. */
.light {
  font-family: var(--font-motto);
  font-weight: 400;
  font-size: 1em;
  letter-spacing: 0.06em;
  color: var(--motto-script-color);
  text-shadow: var(--motto-script-glow);
}

.light:hover {
  color: var(--motto-script-color-hover);
}

/* "Shadow". Archivo at 900 — a second file under the same family name, which
   the body's 400–600 range never reaches (see fonts.css). */
.shadow {
  font-family: var(--font-sans);
  font-weight: 900;
  font-size: var(--motto-caps-size);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--motto-caps-color);
  -webkit-text-stroke: var(--motto-caps-stroke-width) var(--motto-caps-stroke-color);
}

.shadow:hover {
  -webkit-text-stroke-color: var(--motto-caps-stroke-color-hover);
}

/* Where the outline cannot be drawn the transparent fill would be an invisible
   word, not a subtler one. */
@supports not (-webkit-text-stroke: 1px currentcolor) {
  .shadow {
    color: var(--motto-caps-fallback);
  }
}

/* The hinge, in the mono face of the labels and at the height of the upright
   word, so the three parts read as one line rather than as two words with a
   mark between them.

   The margin resolves against this element's own size, which is 0.385 of the
   script's — so the canvas's 28 px gap at a 165 px script is 28/(165 × 0.385)
   = 0.44em, and it stays that proportion at every scale. Measured 27.9 px at
   the reference; 0.5em, the figure the placeholder motto used, came out at
   31.8 px and read as two words with a mark between them. */
.slash {
  margin: 0 0.44em;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--motto-caps-size);
  color: var(--motto-slash-color);
}
</style>
