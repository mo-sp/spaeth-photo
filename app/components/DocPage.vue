<template>
  <div class="page">
    <div class="head">
      <h1 class="head-title">{{ title }}</h1>
      <p v-if="note" class="head-note">{{ note }}</p>
    </div>

    <div class="doc">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Rahmen der drei Textseiten (Über, Impressum, Datenschutz).
 *
 * Die Seiten unterscheiden sich nur im Text; Kopfleiste, Zeilenlänge und die
 * Typografie von Überschriften, Absätzen und Listen sind dieselben. Dreimal
 * dasselbe CSS wäre dreimal die Gelegenheit, es auseinanderlaufen zu lassen.
 * Die Regeln greifen über `:deep()` in den Slot-Inhalt hinein — die Seiten
 * schreiben deshalb einfaches HTML ohne Klassen; die einzige Klasse, die sie
 * kennen, ist `.todo` für offene Angaben.
 */
defineProps<{
  title: string
  /** Kurzer Zusatz rechts in der Kopfleiste, z. B. ein Stand-Datum. */
  note?: string
}>()
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: var(--border);
}

.head-title {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--text-title-s-size);
  line-height: var(--text-title-s-lh);
  letter-spacing: var(--text-title-s-ls);
  color: var(--color-text);
}

.head-note {
  flex: 0 0 auto;
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-ui-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* 62 Zeichen: die Spanne, in der eine Zeile ohne Springen gelesen wird. Die
   Spalte steht links, nicht zentriert — die Seite ist links ausgerichtet. */
.doc {
  max-width: 62ch;
  padding: var(--space-5) var(--space-4) var(--space-6);
  font-family: var(--font-sans);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  color: var(--color-text);
}

/* Abschnittsüberschriften sind Mikro-Labels wie überall sonst in der Seite,
   kein zweiter Titelgrad: Mono, 11 px, Versalien, mit Hairline darüber. */
.doc :deep(h2) {
  margin: var(--space-5) 0 var(--space-2);
  padding-top: var(--space-2);
  border-top: var(--border);
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-ui-size);
  line-height: var(--text-ui-lh);
  letter-spacing: var(--text-label-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* The first heading of a document sits directly under the page header, which
   already draws a hairline — without this the two stack into a double rule. */
.doc :deep(h2:first-child) {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.doc :deep(p) {
  margin: 0 0 var(--space-2);
  text-wrap: pretty;
}

.doc :deep(ul) {
  margin: 0 0 var(--space-2);
  padding: 0;
  list-style: none;
}

.doc :deep(li) {
  padding: var(--space-1) 0;
  border-top: var(--border);
}

/* Angaben mit Bezeichnung: das Label in Mono, der Wert im Fließtext. */
.doc :deep(dl) {
  display: grid;
  grid-template-columns: 12ch minmax(0, 1fr);
  gap: var(--space-1) var(--space-2);
  margin: 0 0 var(--space-3);
}

.doc :deep(dt) {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: var(--text-meta-size);
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-meta-ls);
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.doc :deep(dd) {
  margin: 0;
}

.doc :deep(a) {
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  text-decoration-color: var(--color-line-strong);
  transition: text-decoration-color var(--t-fast);
}

.doc :deep(a:hover),
.doc :deep(a:focus-visible) {
  text-decoration-color: var(--color-text);
}

/*
  Offene Angaben stehen als sichtbarer Text „TODO: …" auf der Seite, nicht als
  Kommentar im Quelltext: was fehlt, soll auffallen — beim Lesen wie beim
  Durchsuchen des erzeugten HTML.
*/
.doc :deep(.todo) {
  display: inline-block;
  padding: 2px var(--space-1);
  border: 1px solid var(--color-line-strong);
  font-family: var(--font-mono);
  font-size: var(--text-meta-size);
  line-height: var(--text-foot-lh);
  letter-spacing: var(--text-meta-ls);
  color: var(--color-text-muted);
}

@media (max-width: 767px) {
  .head {
    padding: var(--space-2);
  }

  .doc {
    padding: var(--space-3) var(--space-2) var(--space-4);
  }

  .doc :deep(dl) {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }

  .doc :deep(dd) {
    margin-bottom: var(--space-1);
  }
}
</style>
