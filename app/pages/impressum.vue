<template>
  <DocPage title="Impressum">
    <h2>Angaben gemäß § 5 DDG</h2>
    <dl>
      <dt>Name</dt>
      <dd>Moritz Späth</dd>
      <dt>Anschrift</dt>
      <dd>
        <span class="todo">TODO: Straße, Hausnummer</span>
        <br />
        <span class="todo">TODO: PLZ, Ort</span>
      </dd>
      <dt>E-Mail</dt>
      <dd><a href="mailto:TODO@example.org">TODO@example.org</a></dd>
      <dt>Telefon</dt>
      <dd><span class="todo">TODO: Telefonnummer oder Streichung</span></dd>
    </dl>
    <p>
      Diese Seite ist ein privates, nicht kommerzielles Fotoprojekt. Es werden keine Waren
      oder Dienstleistungen angeboten; eine Umsatzsteuer-Identifikationsnummer besteht nicht.
    </p>

    <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
    <p>Moritz Späth, Anschrift wie oben.</p>

    <h2>Urheberrecht</h2>
    <p>
      Alle Fotografien auf dieser Seite stammen von Moritz Späth und sind urheberrechtlich
      geschützt. Vervielfältigung, Bearbeitung und Verbreitung bedürfen der schriftlichen
      Zustimmung. Der Quelltext der Seite steht unter der MIT-Lizenz und liegt auf
      <a href="https://github.com/mo-sp/spaeth-photo">github.com/mo-sp/spaeth-photo</a>; die
      Bilder sind davon ausdrücklich nicht erfasst.
    </p>

    <h2>Haftung für Inhalte</h2>
    <p>
      Die Inhalte dieser Seite wurden mit Sorgfalt erstellt. Für ihre Richtigkeit,
      Vollständigkeit und Aktualität kann keine Gewähr übernommen werden. Als Diensteanbieter
      bin ich für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich, jedoch nicht
      verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
    </p>

    <h2>Haftung für Links</h2>
    <p>
      Diese Seite verweist an wenigen Stellen auf externe Seiten, auf deren Inhalte ich
      keinen Einfluss habe. Für sie ist stets der jeweilige Anbieter verantwortlich. Zum
      Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar; werden mir welche
      bekannt, entferne ich den Link.
    </p>

    <h2>Hinweis</h2>
    <p>
      <span class="todo">TODO: Rechtsprüfung</span> Dieser Text ist ein Entwurf und keine
      Rechtsberatung. Vor der Veröffentlichung unter einer eigenen Domain sind die Angaben zu
      vervollständigen und juristisch zu prüfen.
    </p>
  </DocPage>
</template>

<script setup lang="ts">
useSiteSeo({
  title: 'Impressum',
  description:
    'Anbieterkennzeichnung nach § 5 DDG für diese Seite.',
  path: '/impressum',
  ogType: 'website',
})
</script>
