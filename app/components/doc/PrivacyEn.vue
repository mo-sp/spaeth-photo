<template>
  <p>
    This site is a private photo project. It works without cookies, without tracking and
    without third-party embeds: there is no counting pixel, no map service, no embedded
    video and no font from someone else’s server. That is also why there is no consent
    banner — there would be nothing to consent to.
  </p>
  <p>
    <span class="todo">TODO: Rechtsprüfung</span> This is a translation for convenience.
    The <NuxtLink :to="localePath('/privacy', 'de')" lang="de">German version</NuxtLink>
    is the authoritative one.
  </p>

  <h2>Controller</h2>
  <p>
    Moritz Späth; address and contact details in the
    <NuxtLink :to="path('/legal-notice')">legal notice</NuxtLink>.
  </p>

  <h2>Server log files</h2>
  <p>
    When you open a page, your browser transmits technically necessary data to the hosting
    provider's server, which stores it in log files: IP address, date and time, the address
    requested, the amount of data transferred, the status code, the identifier your browser
    sends and, where applicable, the referring page. This processing is necessary to
    operate and secure the site; the legal basis is Art. 6(1)(f) GDPR. The data is not
    combined with any other source.
  </p>
  <p>
    <span class="todo">TODO: Hoster, Speicherdauer, Auftragsverarbeitung</span>
    Provider, server location, log retention period and the data processing agreement will
    be filled in once the host is settled.
  </p>

  <h2>Encryption</h2>
  <p>
    The site is served over HTTPS only, so the connection between your browser and the
    server is encrypted.
  </p>

  <h2>Fonts served locally</h2>
  <p>
    The two typefaces used here (Archivo and JetBrains Mono) sit on the same server as the
    site and are loaded from there. There is no connection to Google Fonts or any other
    font service, and therefore no transfer of your IP address to a third party when a font
    loads.
  </p>

  <h2>Images without metadata</h2>
  <p>
    Every image delivered by this site has had its metadata stripped: no EXIF, IPTC or XMP
    blocks, and in particular no GPS coordinates, serial numbers or capture times inside
    the file. The year, camera and lens appear only where they are deliberately shown.
  </p>

  <h2>Contact by e-mail</h2>
  <p>
    If you write to me, I process what you send in order to answer it (Art. 6(1)(b) or (f)
    GDPR). I delete messages once they are no longer needed and no retention obligation
    stands in the way. There is no contact form.
  </p>

  <h2>Your rights</h2>
  <p>
    You have the right of access, rectification, erasure, restriction of processing, data
    portability and objection. Please use the address given in the legal notice.
  </p>
  <p>
    You may also lodge a complaint with a supervisory authority. The competent one is the
    Independent Centre for Privacy Protection Schleswig-Holstein (ULD).
    <span class="todo">TODO: Anschrift der Aufsichtsbehörde prüfen</span>
  </p>

  <h2>Note</h2>
  <p>
    <span class="todo">TODO: Rechtsprüfung</span> This text is a draft and not legal
    advice. Before the site goes live under its own domain, the open items have to be
    filled in and the text checked by a lawyer.
  </p>
</template>

<script setup lang="ts">
const { path } = useI18n()
</script>
