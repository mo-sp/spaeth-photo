<template>
  <DocPage title="Über">
    <p>
      Ich fotografiere als Hobby, seit
      <span class="todo">TODO: Startjahr</span> — meistens im Umkreis von Wedel an der Elbe:
      Tiere, Natur und Landschaft, dazu Segeln, wenn ich auf dem Wasser bin.
    </p>
    <p>
      Was hier steht, ist eine Auswahl. Keine Serien, keine Aufträge, kein Auftrag an das
      Motiv, etwas darzustellen: die Bilder sind entstanden, weil das Licht gerade so stand.
    </p>

    <h2>Ausrüstung</h2>
    <p>
      Sony Alpha 7 IV, dazu einige Festbrennweiten und ein Telezoom — welche Kamera und
      welches Objektiv ein Bild gemacht haben, steht bei den meisten Fotos in der
      Seitenleiste. Entwickelt wird in darktable; die ausgelieferten Bilder sind aus den
      entwickelten Fassungen erzeugt und tragen keine Metadaten mehr.
    </p>

    <h2>Beruflich</h2>
    <p>
      Hauptberuflich entwickle ich Software. Diese Seite ist entsprechend selbst gebaut —
      Nuxt, eigenes CSS, eine eigene Bild-Pipeline, kein Tracking und keine Cookies. Der
      Quelltext liegt offen:
      <a href="https://github.com/mo-sp/spaeth-photo">github.com/mo-sp/spaeth-photo</a>.
    </p>

    <h2>Kontakt</h2>
    <p>
      Fragen zu einem Bild, Hinweise, Nutzungsanfragen:
      <a href="mailto:TODO@example.org">TODO@example.org</a>
      <span class="todo">TODO: Kontaktadresse</span>
    </p>

    <h2>Stand</h2>
    <p>
      <span class="todo">TODO: Texte gegenlesen</span> Die Texte dieser Seite sind ein
      Entwurf; Jahreszahl, Ausrüstung und Kontaktadresse stehen noch nicht fest.
    </p>
  </DocPage>
</template>

<script setup lang="ts">
const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  title: 'Über',
  description:
    'Moritz Späth fotografiert als Hobby rund um Wedel an der Elbe: Tiere, Natur, Landschaft und Segeln.',
  ogType: 'profile',
})

useHead({ link: [{ rel: 'canonical', href: absoluteUrl(siteUrl, '/ueber') }] })
</script>
