<template>
  <!-- This foot replaces `SiteFoot`, so it carries the language switch and
       legal links itself; below 768 px the layout's page foot has them.
       Prev/next and the counter sit beside and below the image (`PhotoStepper`),
       not here. -->
  <div class="foot">
    <SiteLang class="lang" />
    <SiteLegal class="legal" />
  </div>
</template>

<style scoped>
.foot {
  padding: var(--space-3) var(--space-3) 0;
}

.legal {
  margin-top: var(--space-1);
}

@media (max-width: 767px) {
  .foot {
    padding: 0 var(--space-2) var(--space-2);
  }

  .lang,
  .legal {
    display: none;
  }
}
</style>
