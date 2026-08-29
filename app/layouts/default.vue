<template>
  <div class="shell">
    <SiteSidebar>
      <template #aside>
        <slot name="aside" />
      </template>
    </SiteSidebar>
    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* Grundgerüst laut Spec 1C: feste Seitenleiste links, randloser Inhalt rechts. */
.shell {
  display: flex;
  flex-direction: row;
  background: var(--color-bg);
}

.content {
  flex: 1;
  min-width: 0;
}
</style>
