# Architektur & Entscheidungen

Ergänzt `PLAN.md`. Hier stehen die getroffenen Entscheidungen mit Begründung — und
insbesondere jede Abweichung vom Plan. Grundsatz für dieses öffentliche Repo:
Mechanismus beschreiben, kein Inventar von Hosts, Skripten oder Personen.

## Stack-Entscheidungen

- **SSG statt SSR.** Phase 1 ist reine Präsentation; ein statisches Verzeichnis ist
  billiger, schneller und sicherer zu betreiben. `nuxt generate` mit
  `nitro.prerender.crawlLinks` rendert alle über die Navigation erreichbaren Routen vor;
  Output ist `.output/public`. `ssr: true` bleibt gesetzt, weil Prerendering es
  voraussetzt — und weil sich damit später ohne Umbau hybrid (statisch + Nitro-Routen)
  fahren lässt, was Phase 2 braucht.
- **Eigenes Sharp-Skript statt @nuxt/image.** Das Prerendering von @nuxt/image im
  SSG-Modus ist unzuverlässig; ein eigenes Prebuild-Skript erzeugt die Varianten
  deterministisch vor dem Generate und legt sie als reine statische Dateien ab.
- **Generierte Daten als Single Source of Truth.** Beim Build entstehen das vollständige
  `photos.manifest.json` und daraus der schlanke Client-Index `app/data/photos.index.json`.
  Das Frontend liest ausschließlich den Index; Komponenten greifen nie auf das Dateisystem
  zu. Das hält den Wechsel des Rendering-Modus offen und macht die Daten testbar. Details
  unter „Datenmodell".
- **Zwei Repos, Fotos als Submodule.** Code steht unter MIT und ist öffentlich; die Fotos
  sind es nicht. Die Trennung Code/Rechte ist dadurch strukturell und nicht bloß eine
  Absprache. Ein fremder Clone ohne Submodule-Zugriff baut über den Demo-Fallback durch.
- **Kein Tailwind, kein UI-Framework.** Die Seite ist klein und die Bilder dominieren; die
  Design-Tokens aus dem Handoff liegen als CSS Custom Properties in einer Datei und sind
  die verbindliche Quelle.
- **Toolchain-Postinstalls freigegeben.** `pnpm-workspace.yaml` erlaubt die nativen
  Postinstall-Skripte von `esbuild` und `unrs-resolver` (Bestandteile der Nuxt- bzw.
  ESLint-Toolchain). Ohne diese Freigabe fehlt die plattformspezifische Binärdatei und der
  Build schlägt fehl — relevant auch für die Build-Umgebung des Hosters.

## Dependencies und warum

Jede Abhängigkeit kostet Angriffsfläche, Updates und Lesezeit. Diese fünf verdienen ihren
Platz:

- **sharp** (Laufzeit) — die Bildverarbeitung selbst, Bindung an libvips. Ohne sie gäbe es
  kein Projekt; eine Alternative in reinem JavaScript wäre um Größenordnungen langsamer.
  Sie steht bewusst unter `dependencies` und nicht unter `devDependencies`, weil
  `build-images` Teil des Build-Befehls ist.
- **zod** (Laufzeit) — Validierung der YAML-Metadaten und der erzeugten Artefakte gegen ein
  Schema, das zugleich die TypeScript-Typen klammert. Von Hand geschriebene Prüfungen
  wären länger und würden mit den Typen auseinanderlaufen.
- **yaml** (Laufzeit) — parst die Metadatendateien. Geschrieben werden sie von Hand, weil
  Feldreihenfolge und Schreibweise Teil der Konvention sind; Parsen ist der Teil, den man
  nicht selbst schreibt.
- **exif-reader** (Laufzeit) — liest den EXIF-Block, den sharp als Rohpuffer liefert.
  Klein, ohne eigene Abhängigkeiten, genau eine Aufgabe.
- **vitest** (Entwicklung) — Testlauf. Teilt sich die Vite-Toolchain mit Nuxt, bringt also
  keine zweite Transformationskette ins Projekt.
- **@types/node** (Entwicklung) — reine Typdeklarationen; ohne sie kann `tsc` die
  Node-Skripte nicht prüfen. Kein Laufzeit-Fußabdruck.

Bewusst **nicht** hinzugekommen: ein CLI-Framework (`node:util.parseArgs` reicht für ein
Dutzend Flags), eine Farbbibliothek (`node:util.styleText` prüft selbst, ob der Zielstream
Farbe kann) und ein TypeScript-Runner — siehe unten.

## Abweichungen vom Plan

- **Nuxt 4 statt Nuxt 3** (PLAN.md §2). Nuxt 4 ist die aktuelle Major-Version, bringt die
  `app/`-Verzeichnisstruktur und dieselben SSG-Fähigkeiten. Für ein neues Projekt gibt es
  keinen Grund, auf der Vorgängerversion zu starten.
- **Selbst gehostete Schriften statt Google Fonts** (Empfehlung des Design-Handoffs). Die
  woff2-Dateien liegen in `public/fonts/`, eingebunden über eigene `@font-face`-Regeln.
  Damit entsteht beim Seitenaufruf kein Request an Dritte — das ist Datenschutz (kein
  IP-Abfluss, konsistent mit „keine Tracker, keine Cookies") und zugleich schneller, weil
  eine Verbindung zu einer fremden Domain entfällt. Google liefert für beide Familien
  Variable Fonts aus: pro Familie und Stil eine Datei über den ganzen Gewichtsbereich,
  statt je einer Datei pro Schnitt. Die `@font-face`-Regeln geben den Bereich deshalb als
  `font-weight: 400 600` an. Lizenz beider Familien: SIL OFL 1.1, Nachweis in
  `public/fonts/LICENSE-OFL.txt`.
- **Repo-Name ≠ Domain.** Das Repo heißt `spaeth-photo`; `spaeth-photo.de` ist bereits
  vergeben, die Domain wird eine andere. Der Repo-Name ist bewusst kein Markenversprechen,
  und die Seite trägt ihren Namen im Inhalt, nicht in der Repository-URL.
- **Design-Integration sofort statt in einer Folge-Session** (PLAN.md §8). Der Handoff lag
  zu Beginn vor; die Tokens sind unverändert übernommen, ergänzt nur um die im Handoff
  empfohlenen responsiven Overrides.
- **Node 24 führt die Build-Skripte aus, `tsx` ist entfallen** (PLAN.md §12). Node entfernt
  seit Version 22 TypeScript-Typen selbst und führt `node scripts/build-images.ts` direkt
  aus; ab 24 ist das der Standardpfad. Ein zusätzlicher Runner im Build ist damit
  überflüssig. Node _entfernt_ dabei nur Typen, es transformiert nichts — deshalb setzt
  `tsconfig.scripts.json` `erasableSyntaxOnly` und verbietet genau die Konstrukte
  (`enum`, Parameter-Properties), die eine echte Transformation bräuchten. `engines.node`
  steht entsprechend auf `>= 24`.
- **Der Demo-Content wird mit geringerer Qualität exportiert** als die privaten
  Web-Quellen (q82 statt q95). Er ist kein Archiv, sondern der Beleg, dass ein Clone ohne
  Zugriff auf das private Submodule durchbaut; q95 hätte 4,4 statt 1,8 MB dauerhaft in
  dieses Repo gelegt.
- **Der Farb-Regressionstest erlaubt drei Stufen Abweichung je Kanal** statt exakter
  Gleichheit. Verlustbehaftete Encoder runden: reines Rot kommt als 254 statt 255 aus AVIF
  zurück. Eine falsche Farbraumkonvertierung läge um Dutzende Stufen daneben, der Test
  bleibt also scharf genug.
- **Prettier und ESLint teilen sich die Zuständigkeit.** Prettier formatiert, ESLint prüft.
  Wo beide dieselbe Stelle beanspruchten (`vue/html-self-closing`), ist die ESLint-Regel
  abgeschaltet; die aus dem Handoff übernommene `tokens.css` ist von Prettier ausgenommen,
  damit sie 1:1 der Vorlage entspricht.

## Bild-Pipeline

Zwei Skripte, klar getrennt. `export-sources` läuft von Hand und erzeugt aus den
Originalen (volle Auflösung, mit EXIF, außerhalb jedes Repositorys) die Web-Quellen des
Content-Repos. `build-images` läuft im Build und erzeugt daraus die Auslieferungsvarianten
unter `public/img/`. Alle Zahlen unten sind auf dem Bestand dieses Projekts gemessen
(26 Fotos, sharp 0.35 / libvips 8.18).

**Die Web-Quelle ist ein Archiv, kein Auslieferungsformat.** 2560 px lange Kante, JPEG
q95, und ausdrücklich `chromaSubsampling: 4:4:4`. 4:2:0 wirft drei Viertel der
Farbauflösung weg, bevor der eigentliche Encoder überhaupt anfängt; dieser Verlust
vererbt sich in jede AVIF- und WebP-Stufe und ist nicht rückholbar. Als einzige Datei im
Projekt trägt die Web-Quelle ein ICC-Profil (`withIccProfile('srgb')`) — ein Archiv soll
sich selbst beschreiben.

**4:4:4 auch in den Varianten.** Bei AVIF kostet volle Farbauflösung gegenüber 4:2:0
rund 4 % Dateigröße (104,9 statt 100,7 KB in der 1600er-Stufe eines typischen Fotos).
Dafür bleiben gesättigte Kanten — Takelage vor Himmel, Schilf im Gegenlicht — frei von
Farbsäumen. Vier Prozent sind der Preis wert; sichtbare Artefakte auf einer Fotoseite
sind es nicht.

**AVIF mit 10 Bit Farbtiefe.** Das ist kein Aufpreis, sondern ein Rabatt: dieselbe Stufe
misst mit `bitdepth: 10` 104,9 KB und mit 8 Bit 110,0 KB. Der Encoder rechnet intern
ohnehin mit höherer Präzision; 10 Bit vermeidet zusätzlich die Streifenbildung in weichen
Verläufen (Morgenhimmel, Nebel), die bei 8 Bit sichtbar wird.

**AVIF mit `effort: 3`.** Zwischen Stufe 3 und Stufe 6 liegen 1,6 % Dateigröße
(104,9 gegenüber 103,2 KB) und Faktor 12 an Rechenzeit (1,8 gegenüber 22,2 Sekunden für
ein einziges Bild einer einzigen Stufe). Bei 26 Fotos mal vier Stufen wäre Stufe 6 die
Differenz zwischen sechs Minuten und über einer Stunde Buildzeit. WebP steht mit
`effort: 5` aus demselben Grund eine Stufe unter dem Maximum.

**Qualitätsleiter mit Budget-Deckel.** Jede Stufe startet mit einer festen Qualität
(AVIF 60/57/54/52 von 480 bis 2560 px), und wenn das Ergebnis ein Größenbudget reißt,
sinkt die Qualität in Fünferschritten bis zu einer Untergrenze. Der Deckel greift nur bei
den Bildern, die für einen Encoder pathologisch sind — Laub, Wellen, Rauschen im
Nachthimmel. Das schlimmste Bild im Bestand (Feuerwerk über Bäumen) misst in der
2560er-Stufe mit Deckel 372 KB statt 573 KB ohne, ein Drittel weniger; 11 der 26 Fotos
lösen ihn überhaupt aus. Die Budgets sind an einem Querformat 3:2 gemessen und werden
nach Pixelzahl skaliert, sonst schlüge der Deckel bei jedem Hochformat grundlos zu.

**Kein Nachschärfen auf der größten Stufe.** Verkleinern kostet Schärfe, und zwar umso
mehr, je stärker verkleinert wird — die 480er-Stufe wird deshalb kräftiger nachgeschärft
als die 1600er. Die größte erzeugte Stufe wird auf großen Bildschirmen nahezu 1:1
dargestellt; dort erzeugt Nachschärfen nur Halos um Kanten.

**Native Breite als zusätzliche Stufe.** Ein Hochformat mit 2560 px Höhe ist nur rund
1707 px breit. Ohne Sonderregel wäre seine größte ausgelieferte Stufe 1600 px, und die
Detailseite müsste hochrechnen. Deshalb kommt die native Quellbreite als Stufe dazu,
sobald sie mehr als 32 px über der letzten Regelstufe liegt. Das Manifest führt die
tatsächlich erzeugten Breiten je Foto — ein `srcset` darf nie aus der Konstante gebaut
werden.

**LQIP: 20 px breites WebP plus Durchschnittsfarbe.** Das Base64-WebP misst rund 190 Byte
und steht im Client-Index, also im ausgelieferten JavaScript jeder Seite, auf der das Bild
vorkommt. Unter 20 px verliert die Vorschau ihre Form, darüber wächst der Index spürbar.
Zusätzlich steht die Durchschnittsfarbe als Hex im Index: in der Galerie ist ein einfarbiger
Kachelhintergrund ruhiger als zwanzig gleichzeitig aufblitzende Blur-Bilder, der
Blur-up bleibt dem Hero und der Detailseite vorbehalten.

**Farbmanagement über den Default, nicht dagegen.** Die Pipeline setzt bewusst kein
`toColorspace`, kein `keepMetadata`, kein `withMetadata`. Die Web-Quellen sind sRGB, libvips
rechnet intern korrekt, und die Ausgaben bleiben profillos — was jeder Browser als sRGB
liest und je Datei rund 500 Byte spart. Festgehalten wird das durch einen
Regressionstest (`pnpm test:integration`): ein Testbild aus vier Farbflächen, darunter ein
Mittelgrau, muss alle Formate mit einer Abweichung von höchstens drei Stufen je Kanal
überstehen. Eine falsche Farbraumkonvertierung läge um Dutzende Stufen daneben, gerade in
den mittleren Tönen.

**OpenGraph-Bild mit `position: attention`.** Das 1200×630-Bild wird nicht mittig
zugeschnitten, sondern auf die Region mit der höchsten Sättigung und Kantendichte. Bei
einem Horizont im unteren Drittel trifft ein zentrierter Schnitt sonst nur Himmel.

**Inkrementell über Inhalt, nicht über Zeitstempel.** Der Cache
(`.image-cache/manifest-cache.json`) merkt sich je Foto den Inhaltshash der Quelle, mtime
und Größe als Schnellpfad sowie einen Hash der Metadaten. Stimmen mtime und Größe, wird
der Inhalt gar nicht erst gelesen; weichen sie ab, entscheidet der Hash — ein frischer
Checkout setzt neue Zeitstempel, ohne eine Datei zu ändern. Ändert sich nur die
YAML-Datei, wird das Manifest neu geschrieben, aber kein Bild neu kodiert. Über allem
steht ein Hash aller Render-Einstellungen plus der libvips-Version: verschiebt sich dort
etwas, entsteht alles neu, statt dass sich in `public/img/` zwei Konfigurationen mischen.
Gemessen: erster Lauf 354 s für 26 Fotos und 286 Dateien (32,9 MB), zweiter Lauf 37 ms.

**Aufräumen ist die gefährlichste Operation im Projekt** und entsprechend abgesichert:
gelöscht wird ausschließlich unterhalb von `public/img` (jeder Pfad läuft durch
`assertInside`), ausschließlich in Verzeichnissen mit gültigem Slug-Namen und
ausschließlich Dateien, deren Name dem Muster der erzeugten Varianten entspricht. Alles
andere wird gemeldet und liegen gelassen. Ohne Quellbilder wird überhaupt nicht
aufgeräumt — ein leeres Quellverzeichnis ist viel wahrscheinlicher ein
Konfigurationsfehler als die Ansage, alles zu löschen. `--dry-run` zeigt den Plan.

**Sequenziell, nicht parallel.** libvips parallelisiert innerhalb einer Operation bereits
über alle Kerne; ein zusätzlicher Parallelismus auf Bildebene bringt kaum Durchsatz, macht
aber die Ausgabe unlesbar und den Speicherbedarf unvorhersehbar.

## Datenmodell

Je Foto eine `photos/meta/<slug>.yaml`, beim Build gegen ein zod-Schema validiert. Fehlender
Titel, ungültiges Datum, unbekanntes Tag oder ein unbekannter Schlüssel sind harte Fehler:
ein Tippfehler soll auffallen. Eine Auslassung dagegen stört nicht — alles außer Titel und
Datum hat einen dokumentierten Standardwert. Dateiname = Slug = URL; Slugs sind nach dem
Deploy unveränderlich, weil sie in Phase 2 zu Produkt-URLs werden.

**Zwei Artefakte statt einem, beide generiert und gitignored.**
`photos.manifest.json` in der Projektwurzel ist vollständig: jede geschriebene Datei mit
Pfad, Maßen und Größe, dazu Quellmaße und Inhaltshash. Es ist ein Build-Protokoll — für
Diagnose, für die Plausibilitätsprüfung in der CI und für das Aufräumen.
`app/data/photos.index.json` ist der Teil, den das Frontend braucht, und wird ins Bundle
importiert. Für 26 Fotos stehen 82 KB Manifest 17 KB Index gegenüber; das Frontend soll
kein Build-Protokoll ausliefern.

**Bild-URLs stehen nicht im Index, sie folgen einer Konvention:**
`/img/<slug>/<breite>.<endung>`, dazu `/img/<slug>/og.jpg`. Der Index führt nur die
tatsächlich erzeugten Breiten je Format (`variants: { avif: [...], webp: [...], jpeg: [...] }`).
Das spart gegenüber ausgeschriebenen Pfaden den größten Teil der Bytes und macht eine
Umbenennung zu einer Änderung an genau einer Stelle (`shared/constants/images.ts`).

**Typen und Schema klammern sich gegenseitig.** `shared/types/photo.ts` enthält
ausschließlich Typen und wird von den Build-Skripten wie vom Frontend importiert. Die
zod-Schemata in `scripts/lib/schema.ts` sind über eine `AssertExact`-Hilfe bidirektional
daran gebunden: wer nur eine Seite ändert, bekommt einen Typfehler, statt dass Compile- und
Laufzeitmodell still auseinanderlaufen.

**Sortierung: Datum absteigend, bei Gleichstand Slug aufsteigend.** Der zweite Schlüssel ist
keine Geschmacksfrage, sondern Determinismus — eine Galerie, die sich zwischen zwei Deploys
umsortiert, sieht wie ein Fehler aus.

**Hero-Regel.** Genau ein Foto trägt `hero: true`. Sind es zwei, ist das ein Fehler: hier
ist eine Entscheidung nötig, die das Skript nicht treffen darf. Ist es keines, wählt der
Build das neueste hervorgehobene Foto (sonst das neueste überhaupt) und warnt — eine
Startseite ohne Hero wäre kaputt, und ein harter Fehler dafür wäre eine unnötige Bremse.
Der aufgelöste Slug steht als `heroSlug` im Kopf, und das Feld `hero` je Foto wird aus der
Auflösung gesetzt statt aus der YAML abgeschrieben; beide können damit nicht auseinanderlaufen.
`featured` markiert die Kandidaten für die Startseiten-Auswahl, `order` ihre Reihenfolge dort.

**Tags** sind ein geschlossener Satz (`tiere`, `natur`, `landschaft`, `segeln`,
`schwarzweiss`), im Datenmodell kleingeschrieben und ASCII, weil sie in URLs auftauchen
(`?tag=schwarzweiss`). Reihenfolge und Anzeige-Label mit Umlaut stehen in
`shared/constants/tags.ts`. Der Index führt nur die tatsächlich vergebenen Tags mit ihrer
Anzahl.

**Demo-Fallback.** `build-images` wählt die Quelle in dieser Reihenfolge: expliziter
`--source-dir`, dann das private `content/`-Submodule (nur wenn es ausgecheckt ist _und_
Quellen enthält), sonst `demo-content/`. Der gewählte Modus steht als `sourceMode` im
Manifest. Die CI checkt das Submodule absichtlich nicht aus und prüft anschließend, dass
`sourceMode` gleich `demo` ist — damit ist der Fallback nicht behauptet, sondern bei jedem
Lauf bewiesen.

## Phase-2-Vorgriff

> Wird in P8 ausgefüllt.

Geplanter Flow: Produktseite → Stripe Checkout → Stripe-Webhook → Nitro-Route →
Print-on-Demand-API → Tracking-Webhook → Kundenmail. Das Rendering wird dafür hybrid
(statische Seiten plus einzelne Server-Routen); Datenmodell und URLs sind bereits jetzt so
angelegt, dass dieser Schritt keine Migration erzwingt.
