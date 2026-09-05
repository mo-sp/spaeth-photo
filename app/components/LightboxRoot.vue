<template>
  <dialog ref="dialog" class="box" :aria-labelledby="titleId" @cancel.prevent="close()">
    <div class="head">
      <NuxtLink class="head-link" :to="detailPath">
        {{ t('lightbox.details') }}
        <span aria-hidden="true">→</span>
      </NuxtLink>
      <button ref="escape" type="button" class="head-link" autofocus @click="close()">
        <span aria-hidden="true">Esc</span>
        <span class="sr-only">{{ t('lightbox.close') }}</span>
      </button>
    </div>

    <div class="stage" @click.self="close()">
      <button type="button" class="step" :disabled="!nav.prev" @click="step(-1)">
        <span aria-hidden="true">←</span>
        <span class="sr-only">{{ t('lightbox.prev') }}</span>
      </button>

      <div class="frame" @click.self="close()">
        <PhotoImage
          :key="photo.slug"
          :photo="photo"
          :alt="photoAlt(photo, locale)"
          :sizes="STAGE_SIZES"
          eager
        />
      </div>

      <button type="button" class="step" :disabled="!nav.next" @click="step(1)">
        <span aria-hidden="true">→</span>
        <span class="sr-only">{{ t('lightbox.next') }}</span>
      </button>
    </div>

    <p class="caption">
      <span :id="titleId" class="caption-title">{{ photoTitle(photo, locale) }}</span>
      <span class="caption-meta">
        <span>{{ photo.year }}</span>
        <span aria-hidden="true"> · </span>
        <span aria-hidden="true">{{ padCounter(nav.position) }} / {{ padCounter(nav.total) }}</span>
        <span class="sr-only">{{
          t('photo.counter', { n: nav.position, total: nav.total })
        }}</span>
      </span>
    </p>
  </dialog>
</template>

<script setup lang="ts">
import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * Die Vollbildansicht als natives `<dialog>` mit `showModal()`.
 *
 * Damit übernimmt der Browser Fokusfalle, Inertisierung des Hintergrunds, die
 * Esc-Taste und die Rolle im Accessibility-Baum. Alles davon von Hand
 * nachzubauen, ist der klassische Weg zu einer Lightbox, aus der man mit der
 * Tastatur nicht mehr herauskommt.
 */
const props = defineProps<{ photos: PhotoIndexEntry[] }>()

const route = useRoute()
const { locale, t, path } = useI18n()
const { current, nav, go, close } = useLightbox(() => props.photos)

// Das v-if der Seite hängt an isOpen; solange dieses Bauteil lebt, gibt es ein
// Bild. Der Fallback hält TypeScript und den Moment des Schließens ruhig.
const photo = computed(() => current.value ?? props.photos[0]!)

const titleId = useId()

/**
 * Die Bühne ist so breit wie der Viewport minus der beiden Pfeilspalten und des
 * Bildrands: mobil 2×44 px Pfeil und 2×8 px Rand, auf dem Desktop 2×72 px
 * Pfeil und 2×32 px Rand.
 *
 * Ein `variantMax` gibt es hier nicht: anders als auf der Detailseite hat die
 * Bühne keine feste Höhe, aus der sich eine Höchstbreite ableiten ließe — sie
 * ist so hoch wie das Fenster. Ein geratener Deckel machte auf einem großen
 * Bildschirm genau das Bild unscharf, für das die Lightbox da ist.
 */
const STAGE_SIZES = '(max-width: 767px) calc(100vw - 104px), calc(100vw - 208px)'

const detailPath = computed(() => {
  const tag = route.params.tag
  return {
    path: path(`/photo/${photo.value.slug}`),
    // Der Filterkontext reist als weicher Zustand mit, damit Prev/Next auf der
    // Detailseite in derselben Auswahl bleiben.
    query: typeof tag === 'string' && tag !== '' ? { tag } : {},
  }
})


function step(direction: -1 | 1) {
  const target = direction === 1 ? nav.value.next : nav.value.prev
  if (target) void go(target.slug)
}

/* ---- Dialog öffnen und schließen ------------------------------------- */

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

/** Woher der Fokus kam — beim Schließen geht er dorthin zurück. */
const openedFrom = ref<string | null>(null)

onMounted(() => {
  openedFrom.value = photo.value.slug
  dialog.value?.showModal()
})

onBeforeUnmount(() => {
  const slug = openedFrom.value
  if (dialog.value?.open) dialog.value.close()
  if (!slug) return
  // Nach dem Schließen steht der Fokus sonst am Dokumentanfang. Die Kachel
  // trägt ihren Slug als Datenattribut, damit sie wiederzufinden ist.
  nextTick(() => {
    document.querySelector<HTMLElement>(`[data-slug="${CSS.escape(slug)}"]`)?.focus()
  })
})

// Der Fokusanker folgt dem Blättern: wer im Dialog weiterblättert und dann
// schließt, landet auf der Kachel, die er zuletzt gesehen hat.
watch(
  () => photo.value.slug,
  (slug) => {
    openedFrom.value = slug
  },
)

/* ---- Tastatur und Wischen -------------------------------------------- */

function onKey(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    step(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    step(1)
  }
}

const touchStart = ref<{ x: number; y: number } | null>(null)
const SWIPE_MIN = 40

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  touchStart.value = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function onTouchEnd(event: TouchEvent) {
  const start = touchStart.value
  const touch = event.changedTouches[0]
  touchStart.value = null
  if (!start || !touch) return
  const dx = touch.clientX - start.x
  const dy = touch.clientY - start.y
  // Nur waagerechte Gesten; senkrecht bleibt Scrollen und Zoomen.
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return
  step(dx < 0 ? 1 : -1)
}

onMounted(() => {
  dialog.value?.addEventListener('keydown', onKey)
  dialog.value?.addEventListener('touchstart', onTouchStart, { passive: true })
  dialog.value?.addEventListener('touchend', onTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  dialog.value?.removeEventListener('keydown', onKey)
  dialog.value?.removeEventListener('touchstart', onTouchStart)
  dialog.value?.removeEventListener('touchend', onTouchEnd)
})

/* ---- Nachbarn vorwärmen ---------------------------------------------- */

/**
 * Blättern soll nicht auf einen Ladebalken warten. Vorgewärmt wird die Stufe,
 * die die Bühne mit `variantMax` ohnehin höchstens anfordert — mehr wäre
 * geraten und im Zweifel umsonst geladen.
 */
function prewarm(entry: PhotoIndexEntry | null) {
  if (!import.meta.client || !entry) return
  const widths = variantWidths(entry.variants.avif, 1600)
  const width = widths.at(-1)
  if (width === undefined) return
  const image = new Image()
  image.src = imgUrl(entry, width, 'avif')
}

watch(
  () => photo.value.slug,
  () => {
    prewarm(nav.value.next)
    prewarm(nav.value.prev)
  },
  { immediate: true, flush: 'post' },
)
</script>

<style scoped>
.box {
  width: 100vw;
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--color-bg);
  color: var(--color-text);
  opacity: 1;
  transition: opacity var(--t-slow);
}

/* `display` erst im geöffneten Zustand, sonst überschriebe es die
   UA-Regel `dialog:not([open]) { display: none }` und der Dialog stünde
   für einen Frame als normaler Kasten in der Seite. */
.box[open] {
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.box::backdrop {
  background: var(--color-bg);
}

/* Nur Deckkraft, wie die Spec es erlaubt. @starting-style gibt dem geöffneten
   Dialog einen Anfangswert, ohne den es keinen Übergang gäbe. */
@starting-style {
  .box[open] {
    opacity: 0;
  }
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px var(--space-4);
  border-bottom: var(--border);
}

.head-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-width: 44px;
  min-height: 44px;
  padding: 0 var(--space-1);
  background: none;
  border: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--t-fast);
}

.head-link:hover,
.head-link:focus-visible {
  color: var(--color-text);
}

.stage {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 72px;
  align-items: center;
  min-height: 0;
  /* Senkrecht scrollen und zoomen bleibt dem Browser, waagerecht werten wir
     als Wischgeste aus. */
  touch-action: pan-y pinch-zoom;
}

.step {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  min-width: 44px;
  min-height: 44px;
  background: none;
  border: 0;
  font-family: var(--font-mono);
  font-size: var(--text-nav-size);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--t-fast);
}

.step:hover:not(:disabled),
.step:focus-visible {
  color: var(--color-text);
}

.step:disabled {
  opacity: 0.3;
  cursor: default;
}

.frame {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  padding: var(--space-4);
}

.frame :deep(picture) {
  display: flex;
  max-height: 100%;
}

.frame :deep(img) {
  width: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  padding: 22px var(--space-4);
  border-top: var(--border);
}

.caption-title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-s-size);
  line-height: var(--text-title-s-lh);
  letter-spacing: var(--text-title-s-ls);
  color: var(--color-text);
}

.caption-meta {
  flex: 0 0 auto;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

@media (max-width: 767px) {
  .head,
  .caption {
    padding: var(--space-2);
  }

  .stage {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
  }

  .frame {
    padding: var(--space-1);
  }
}
</style>
