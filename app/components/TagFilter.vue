<template>
  <nav ref="bar" class="filter" aria-label="Nach Motiv filtern">
    <p class="label">Filter</p>
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
 * Der Filter ist eine Liste von Links, kein Schalter mit Zustand. Damit
 * funktioniert er ohne JavaScript, steht schon im ausgelieferten HTML und
 * `aria-current="page"` (von NuxtLink gesetzt) ist keine Behauptung, sondern
 * wahr: der aktive Tag ist die Adresse.
 */
const { tags, knownTag } = usePhotos()
const route = useRoute()

const active = computed(() => knownTag(route.params.tag))

const items = computed(() => [
  { to: '/galerie', label: 'Alle', active: active.value === null },
  ...tags.map((entry) => ({
    to: `/galerie/${entry.tag}`,
    label: tagLabel(entry.tag),
    active: active.value === entry.tag,
  })),
])

const bar = useTemplateRef<HTMLElement>('bar')

/**
 * Mobil ist die Leiste horizontal scrollbar. Steht der aktive Chip außerhalb,
 * sähe die Seite ungefiltert aus — also nachziehen. Nur dort, wo tatsächlich
 * gescrollt wird, und ohne Sprung, wenn der Nutzer Bewegung abbestellt hat.
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
  letter-spacing: 0.16em;
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
  /* Spec sagt 7px; 8px hebt die Zielgröße über 24px, ohne dass sich am
     Rhythmus etwas Sichtbares ändert. */
  padding: 8px 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-filter-ls);
  text-transform: uppercase;
  color: var(--color-text);
  /* Spec: inaktiv rgba(244,246,248,0.55). Als Deckkraft auf der Tokenfarbe
     statt als zweiter Hexwert — dasselbe Ergebnis (5,8:1 auf dem Grund), aber
     ohne eine Farbe, die neben tokens.css lebt. */
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
  /* Horizontal scrollbare Reihe unter der Kopfleiste. Der Aktivzustand ist
     hier ein 2-px-Unterstrich statt des Punkts — ein 5-px-Quadrat neben
     jedem Chip kostet in einer Zeile zu viel Platz. */
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
