<template>
  <p>
    Diese Seite ist ein privates Fotoprojekt. Sie kommt ohne Cookies, ohne Tracking und ohne
    Einbindungen Dritter aus: Es gibt keinen Zählpixel, keine Kartendienste, keine eingebetteten
    Videos und keine Schriften von fremden Servern. Deshalb gibt es hier auch kein Zustimmungsbanner
    — es gäbe nichts, dem zuzustimmen wäre.
  </p>

  <h2>Verantwortlicher</h2>
  <p>
    Moritz Späth, Anschrift und Kontakt siehe
    <NuxtLink :to="path('/legal-notice')">Impressum</NuxtLink>.
  </p>

  <h2>Server-Logdateien</h2>
  <p>
    Beim Abruf der Seite überträgt Ihr Browser technisch notwendige Daten an den Server des
    Hosting-Anbieters, der sie in Logdateien speichert: IP-Adresse, Datum und Uhrzeit, abgerufene
    Adresse, übertragene Datenmenge, Statuscode sowie die von Ihrem Browser übermittelte Kennung und
    gegebenenfalls die verweisende Seite. Diese Verarbeitung ist für den Betrieb und die Sicherheit
    der Seite erforderlich; Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Eine Zusammenführung mit
    anderen Daten findet nicht statt.
  </p>
  <p>
    <span class="todo">TODO: Hoster, Speicherdauer, Auftragsverarbeitung</span>
    Anbieter, Serverstandort, Aufbewahrungsfrist der Logs und der Vertrag zur Auftragsverarbeitung
    sind einzutragen, sobald der Hoster feststeht.
  </p>

  <h2>Verschlüsselung</h2>
  <p>
    Die Seite wird ausschließlich über HTTPS ausgeliefert; die Verbindung zwischen Ihrem Browser und
    dem Server ist damit verschlüsselt.
  </p>

  <h2>Schriften lokal</h2>
  <p>
    Die verwendeten Schriften (Archivo und JetBrains Mono) liegen auf demselben Server wie die Seite
    und werden von dort geladen. Es gibt keine Verbindung zu Google Fonts oder einem anderen
    Schriftendienst, und damit auch keine Übermittlung Ihrer IP-Adresse an Dritte beim Laden der
    Schrift.
  </p>

  <h2>Bilder ohne Metadaten</h2>
  <p>
    Aus allen ausgelieferten Bildern sind die Metadaten entfernt: keine EXIF-, IPTC- oder
    XMP-Blöcke, insbesondere keine GPS-Koordinaten, Seriennummern oder Aufnahmezeiten in der
    Bilddatei. Aufnahmejahr, Kamera und Objektiv stehen nur dort, wo sie bewusst angezeigt werden.
  </p>

  <h2>Kontakt per E-Mail</h2>
  <p>
    Wenn Sie mir schreiben, verarbeite ich Ihre Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1
    lit. b bzw. f DSGVO). Ich lösche die Nachrichten, sobald sie nicht mehr benötigt werden und
    keine Aufbewahrungspflichten entgegenstehen. Ein Kontaktformular gibt es nicht.
  </p>

  <h2>Ihre Rechte</h2>
  <p>
    Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
    Datenübertragbarkeit und Widerspruch. Wenden Sie sich dafür an die im Impressum genannte
    Adresse.
  </p>
  <p>
    Außerdem können Sie sich bei einer Aufsichtsbehörde beschweren. Zuständig ist das Unabhängige
    Landeszentrum für Datenschutz Schleswig-Holstein (ULD).
    <span class="todo">TODO: Anschrift der Aufsichtsbehörde prüfen</span>
  </p>

  <h2>Hinweis</h2>
  <p>
    <span class="todo">TODO: Rechtsprüfung</span> Dieser Text ist ein Entwurf und keine
    Rechtsberatung. Vor der Veröffentlichung unter einer eigenen Domain sind die offenen Angaben zu
    ergänzen und der Text juristisch zu prüfen.
  </p>
</template>

<script setup lang="ts">
const { path } = useI18n()
</script>
