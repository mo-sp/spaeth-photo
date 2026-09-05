<template>
  <nav ref="bar" class="filter" :aria-label="t('filter.aria')">
    <p class="label">{{ t('filter.label') }}</p>
    <ul class="items">
      <li v-for="item in items" :key="item.to">
        <NuxtLink
          :to="item.to"
          class="item"
          :class="{ 'is-active': item.active }"
          :data-active="item.active ? '' : undefined"
        >
          <span class="dot" aria-hidden="true"></span>
          <span class="text">{{ item.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
/**
 * A list of links, not a stateful control: it works without JavaScript, ships in
 * the static HTML, and `aria-current="page"` is true rather than asserted —
 * the active tag *is* the address.
 */
const { tags, knownTag } = usePhotos()
const route = useRoute()
const { t, path, tag: tagText } = useI18n()

const active = computed(() => knownTag(route.params.tag))

const items = computed(() => [
  { to: path('/gallery'), label: t('filter.all'), active: active.value === null },
  ...tags.map((entry) => ({
    to: path(`/gallery/${entry.tag}`),
    label: tagText(entry.tag),
    active: active.value === entry.tag,
  })),
])

const bar = useTemplateRef<HTMLElement>('bar')

/**
 * The mobile bar scrolls horizontally; an active chip out of view would make the
 * page look unfiltered. Only where it actually scrolls, and without motion under
 * `prefers-reduced-motion`.
 */
function revealActive() {
  const element = bar.value?.querySelector<HTMLElement>('[data-active]')
  if (!element || !bar.value) return
  const list = bar.value.querySelector<HTMLElement>('.items')
  if (!list || list.scrollWidth <= list.clientWidth) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'center',
  })
}

onMounted(revealActive)
watch(active, () => nextTick(revealActive))
</script>

<style scoped>
.filter {
  padding: 24px var(--space-3) 0;
  border-top: var(--border);
}

.label {
  margin: 0;
  padding-bottom: 12px;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-meta-lh);
  letter-spacing: var(--text-label-ls);
  text-transform: uppercase;
  color: var(--color-text-faint);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  /* Spec says 7px; 8px lifts the target size past 24px with no visible change. */
  padding: 8px 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-filter-ls);
  text-transform: uppercase;
  color: var(--color-text);
  /* Spec: inactive rgba(244,246,248,0.55). Expressed as opacity on the token
     colour — same result (5.8:1 on the ground), no colour outside tokens.css. */
  opacity: 0.55;
  transition: opacity var(--t-fast);
}

.item:hover,
.item:focus-visible,
.item.is-active {
  opacity: 1;
}

.dot {
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  background: var(--color-text);
  opacity: 0;
  transition: opacity var(--t-fast);
}

.item.is-active .dot {
  opacity: 1;
}

@media (max-width: 767px) {
  /* Horizontally scrollable row below the top bar; the active state is a 2px
     underline rather than the dot, which costs too much width in a single line. */
  .filter {
    padding: 0;
    background: var(--color-bg);
    border-top: 0;
    border-bottom: var(--border);
  }

  .label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .items {
    flex-direction: row;
    gap: 0;
    height: var(--filterbar-h);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .items::-webkit-scrollbar {
    display: none;
  }

  .item {
    height: 100%;
    padding: 0 var(--space-2);
    white-space: nowrap;
    border-bottom: 2px solid transparent;
  }

  .item.is-active {
    border-bottom-color: var(--color-text);
  }

  .dot {
    display: none;
  }
}
</style>
