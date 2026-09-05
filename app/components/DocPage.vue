<template>
  <div class="page">
    <div class="head">
      <h1 class="head-title t-title-s">{{ title }}</h1>
      <p v-if="note" class="head-note t-ui">{{ note }}</p>
    </div>

    <div class="doc">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Frame for the three text pages. The rules reach into the slot via `:deep()`,
 * so the pages write plain HTML without classes; `.todo` is the only class they
 * know.
 */
defineProps<{
  title: string
  /** Short addendum on the right of the header, e.g. a revision date. */
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
}

.head-note {
  flex: 0 0 auto;
  margin: 0;
  color: var(--color-text-muted);
}

/* 62 characters: the span a line is read across without the eye jumping. */
.doc {
  max-width: 62ch;
  padding: var(--space-5) var(--space-4) var(--space-6);
  font-family: var(--font-sans);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  color: var(--color-text);
}

/* Section headings are micro-labels like everywhere else on the site, not a
   second title size. */
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
   already draws a hairline — without this the two stack into a double rule.
   Direct children only: an h2 inside a wrapped block (the German body of the
   English legal notice) keeps its rule. */
.doc > :deep(h2:first-child) {
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

/* Labelled entries: label in mono, value in body type. */
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

/* Open items are visible "TODO: …" text rather than a source comment, so a gap
   shows up both when reading and when grepping the generated HTML. */
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
