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

**Bestehende Web-Quellen werden nie ungefragt überschrieben.** `export-sources` behandelt
die Web-Quelle wie die YAML-Datei: existiert sie, wird sie übersprungen und als
„übersprungen, existiert" gemeldet. Nur `--force` schreibt sie neu. Die Quelle ist die
Vorlage aller Varianten und kann von Hand nachbearbeitet worden sein; ein zweiter Lauf mit
anderer `--quality` würde diese Arbeit sonst stillschweigend verwerfen.

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
andere — `README.md`, `.gitkeep`, Symlinks, fremde Ordner — wird gemeldet und liegen
gelassen. Ohne Quellbilder wird überhaupt nicht aufgeräumt — ein leeres Quellverzeichnis
ist viel wahrscheinlicher ein Konfigurationsfehler als die Ansage, alles zu löschen.

**Aufgeräumt wird nur nach einem vollständigen, fehlerfreien Lauf.** Das Löschen richtet
sich nach dem Sollzustand des Laufs, und der ist in zwei Fällen unvollständig, obwohl die
Ausgaben auf der Platte gültig sind. **Erstens `--only`:** ein Teillauf betrachtet einen
Slug: alle anderen stehen nur dann im Sollzustand, wenn der Cache sie kennt — bei kaltem
Cache also gar nicht. Deshalb räumt ein Lauf mit `--only` überhaupt nicht auf und sagt das
in einer Zeile; die ausgelassenen Slugs gelten als unangetastet. **Zweitens Fehler:** ein
Foto mit kaputter YAML-Datei fällt aus dem Sollzustand heraus, und der Lauf schreibt wegen
des Fehlers ohnehin weder Manifest noch Index noch Cache — dann darf er erst recht nichts
löschen. Der Fehlerpfad ist nie destruktiv. Zusätzlich stehen die betroffenen Slugs auf
einer Schutzliste. **`--dry-run` durchläuft dieselbe Entscheidungslogik wie ein echter
Lauf** und hält nur vor jedem Schreiben und Löschen an: die Vorschau zeigt damit dieselben
Verdikte und dieselben Löschungen, die der echte Lauf vornähme. Die Funktion selbst liegt
in `scripts/lib/cleanup.ts` und wird gegen ein temporäres Verzeichnis getestet — ein
Löschpfad, den man nicht testen kann, ist ein Löschpfad, dem man nicht trauen sollte.

**JPEG-Untergrenze: kein Foto ohne `src`.** Der JPEG-Fallback entsteht auf den Stufen 960
und 1600. Bei einer Quelle unter 960 px greift keine davon, und `variants.jpeg` bliebe
leer — ein Browser ohne AVIF und WebP bekäme dann im `<img>` kein `src` und zeigte nichts.
Deshalb springt in diesem Fall die größte erzeugte Stufe bis 1600 px als JPEG ein.

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
`shared/utils/tags.ts`. Der Index führt nur die tatsächlich vergebenen Tags mit ihrer
Anzahl.

**Demo-Fallback.** `build-images` wählt die Quelle in dieser Reihenfolge: expliziter
`--source-dir`, dann das private `content/`-Submodule (nur wenn es ausgecheckt ist _und_
Quellen enthält), sonst `demo-content/`. Der gewählte Modus steht als `sourceMode` im
Manifest. Die CI checkt das Submodule absichtlich nicht aus und prüft anschließend, dass
`sourceMode` gleich `demo` ist — damit ist der Fallback nicht behauptet, sondern bei jedem
Lauf bewiesen.

## Frontend

Die Bilder dominieren, die Bedienung tritt an den Rand: feste Seitenleiste links, randloser
Inhalt rechts, Struktur nur über 1-px-Hairlines. Das Design kommt aus dem Handoff; die
Entscheidungen darunter sind die Stellen, an denen die Umsetzung von der Vorlage abweicht
oder eine Wahl hatte.

**Der Tag-Filter ist eine Pfadroute, keine Query** (Abweichung von PLAN.md §6 und vom
Handoff, der `?tag=segeln` vorschlägt). `/galerie` und `/galerie/segeln` sind zwei
prerenderte Seiten statt einer Seite mit clientseitiger Filterung. Der Unterschied ist
nicht kosmetisch: eine Query lässt sich nicht statisch vorrendern, also käme die gefilterte
Liste erst nach der Hydration — mit einem Moment ungefilterter Galerie davor, ohne
JavaScript gar nicht, und `aria-current="page"` auf dem aktiven Filter wäre eine
Behauptung statt einer Tatsache. Als Pfad ist der aktive Tag die Adresse: die Seite steht
fertig im HTML, jeder Filterlink ist ein echter Link, und ein unbekannter Tag ist ein 404
statt einer stillschweigend ungefilterten Ansicht. Eine clientseitige Middleware schreibt
`/galerie?tag=x` auf `/galerie/x` um, damit Links aus der Entwurfsphase am Ziel ankommen.

**Der Sidebar-Inhalt kommt aus den Routen-Metadaten, nicht aus einem Teleport.** Galerie
und Detailseite füllen denselben Platz in der Seitenleiste mit Unterschiedlichem. Der
naheliegende Weg — die Seite teleportiert ihren Block in die Sidebar — funktioniert im SSG
nicht: Teleports werden beim statischen Rendern verworfen, die Sidebar bliebe im
ausgelieferten HTML leer und füllte sich erst nach der Hydration. Stattdessen trägt jede
Seite `definePageMeta({ aside: 'gallery' | 'photo' })`, Nuxt liest den Schlüssel dank
`experimental.extraPageMetaExtractionKeys` schon zur Buildzeit aus, und das Layout
entscheidet daraus, was in der Seitenleiste steht — und mobil auch, an welcher Stelle des
Grids es steht (Filter über den Kacheln, Bildmetadaten unter dem Bild). Ein Store käme aus
demselben Grund nicht in Frage wie der Teleport.

**Masonry über CSS-Columns, mit einer dokumentierten Nebenwirkung.** `grid-template-rows:
masonry` ist 2026 noch nicht überall Baseline, also bleibt es bei `columns: 3`. Die Kacheln
füllen damit Spalte für Spalte statt Zeile für Zeile: die Tabulator-Reihenfolge läuft die
erste Spalte hinunter und dann die zweite, nicht in Leserichtung. Für eine Galerie ohne
inhaltliche Reihenfolge ist das vertretbar — die Alternative wäre ein Raster mit fester
Zeilenhöhe, und das beschnitte jedes Hochformat.

**Kachelhintergrund ist die Durchschnittsfarbe, kein Blur.** Jede Kachel trägt ihr
`aspect-ratio` und die Durchschnittsfarbe aus dem Index; CLS bleibt bei 0, ohne dass
26 Base64-Vorschauen im HTML stehen. Der Blur-up bleibt Hero und Detailseite vorbehalten,
wo es je Seite genau ein Bild ist. Wie viele Kacheln ohne `loading="lazy"` starten, ergibt
sich nicht aus einer geratenen Zahl, sondern aus einer Simulation des Spaltenumbruchs über
die Seitenverhältnisse — der Lazy-Loader des Browsers entscheidet erst nach dem Layout, und
bei CSS-Columns steht das Layout spät.

**Die Kachel bleibt ein Link.** `<a href="/foto/…">` mit abgefangenem Klick: nur der
einfache Linksklick ohne Modifier öffnet die Lightbox, alles andere (Mittelklick, Strg,
„In neuem Tab öffnen") führt zur Detailseite. Damit funktioniert die Galerie ohne
JavaScript, und die 26 Detailseiten stehen als echte Links im Quelltext.

**Die Lightbox ist ein natives `<dialog>` mit `showModal()`.** Der Browser übernimmt
Fokusfalle, Inertisierung des Hintergrunds, Esc und die Rolle im Accessibility-Baum —
alles davon von Hand nachzubauen ist der klassische Weg zu einer Lightbox, aus der man mit
der Tastatur nicht mehr herauskommt. Ihr Zustand steht in der URL (`?foto=<slug>`), nicht
in einem Store: teilbar, mit dem Zurück-Knopf schließbar, und Seite wie Dialog leiten ihren
Zustand aus derselben Quelle ab. Öffnen legt genau einen Verlaufseintrag an, Blättern
ersetzt ihn, Schließen geht genau einen Schritt zurück — und nur dann, wenn dieser Tab den
Eintrag selbst gelegt hat. Geladen wird die Komponente erst beim Öffnen
(`defineAsyncComponent` hinter einem `v-if`); die Galerie ist die Seite, die am wenigsten
Bundle verträgt.

**`payloadExtraction: 'client'`.** Der Client-Index liegt bereits im JavaScript-Bundle.
Ohne diese Einstellung legte Nuxt die im HTML gerenderten Daten ein zweites Mal als
`_payload.json` daneben — dieselben Bytes, zweimal ausgeliefert.

**Kein zod im Browser.** Der Index ist beim Build gegen das Schema geprüft worden; ihn im
Browser ein zweites Mal zu validieren, kostet eine Bibliothek im Bundle und beweist nichts,
was nicht schon bewiesen wäre. Genau ein `as unknown as PhotoIndexFile` in
`usePhotos.ts` bringt das strukturell typlose JSON auf das Datenmodell — eine Stelle,
absichtlich sichtbar. Die reine Logik darunter (Sortieren, Filtern, Nachbarn, `srcset`)
liegt in `shared/utils/` und ist ohne Vue testbar; nur Dateien direkt in `shared/utils/`
und `shared/types/` importiert Nuxt automatisch, deshalb liegen die Tests in einem
Unterordner `__tests__/`.

**Der faint-Ton ist angehoben: #5E6874 → #767F8B** (Abweichung vom Handoff, dessen Werte
sonst unverändert sind). `--color-text-faint` trägt genau die Elemente, die ohnehin am
kleinsten sind: 10-px-Labels, Zähler, Fußnoten. Auf dem Seitenhintergrund ergibt der
Handoff-Wert 3,52:1 und verfehlt WCAG AA (4,5:1) bei dieser Größe deutlich. #767F8B kommt
auf 4,9:1, bleibt im selben Grauton und liegt weiter erkennbar unter
`--color-text-muted` (5,3:1). Das ist eine Arbeitsannahme, keine Designentscheidung: die
Alternative wäre, `faint` ganz auf `muted` zu kollabieren und die Abstufung aufzugeben.
Die Korrektur steht als einzige Farbüberschreibung in einem klar markierten Projekt-Block
am Ende von `tokens.css`; der Handoff-Teil darüber ist unangetastet.

**Landmarken und Zielgrößen.** Die Seitenleiste ist ein `<header>`, kein `<aside>`; jede
`<nav>` trägt ein `aria-label` (Hauptnavigation / Nach Motiv filtern / Rechtliches); es
gibt genau ein `<main id="inhalt" tabindex="-1">` als Ziel der Sprungmarke und genau eine
`<h1>` je Seite. Zähler wie „03 / 14" stehen sichtbar als `aria-hidden`-Text neben einer
`.sr-only`-Fassung in ganzen Worten — ein `aria-label` auf einem Absatz oder Span wird von
vielen Screenreadern ignoriert. Die Rechtslinks stehen untereinander mit `min-height: 24px`
und das Filter-Padding ist 8 statt der 7 px der Spec, damit beide die Mindest-Zielgröße
erreichen; sichtbar ändert das nichts.

**Der Sidebar-Fuß ist ein `<footer>` neben dem `<header>`, nicht darin.** Ein `<footer>`
innerhalb eines `<header>` ist nicht erlaubt; als Geschwisterelement ist er gültig und
liefert die `contentinfo`-Landmarke, sodass auch Ort und Koordinaten in einer Landmarke
stehen. Mobil ist er ausgeblendet, dafür trägt ein Seitenfuß dieselben Angaben — es ist
immer genau einer sichtbar.

**Mobiles Menü: `<details>` als Schalter, Navigation als Geschwisterelement.** Unter 768 px
klappt die Navigation aus einer 56-px-Kopfleiste auf, darüber steht sie dauerhaft. Die
Liste liegt bewusst _neben_ dem `<details>` und wird über `[open] ~ .nav` eingeblendet,
statt in ihm zu stecken: ein geschlossenes `<details>` versteckt seine Kinder je nach
Engine über `display: none` auf einem Shadow-Slot oder über `content-visibility` auf
`::details-content`, und beides lässt sich nicht überall zuverlässig wieder aufheben. Eine
Hauptnavigation, die im falschen Browser verschwindet, ist kein akzeptabler Ausfall. Die
Zustandsanzeige (`aria-expanded`) liefert `<summary>` weiterhin selbst; Vue schließt das
Menü nur bei Routenwechsel und auf Esc.

**Prefetch nur bei Absicht.** `nuxtLink.prefetchOn` steht auf `interaction` statt
`visibility`: in einer Galerie mit 26 Kacheln lädt „sichtbar" sofort jede Detailseite vor.
Beim Hovern oder Fokussieren ist die Absicht belegt, und die Zeit bis zum Klick reicht.

**`sizes` steht auf jeder `<source>`.** Ohne das Attribut rechnet der Browser je Quelle mit
100vw und lädt für eine Kachel von 260 px die 2560er-Stufe. Es ist die häufigste stille
Fehlerquelle in einem `<picture>` und deshalb ein Pflicht-Prop von `<PhotoImage>` — ebenso
wie `alt`: welcher Text das ist, entscheidet die Einsatzstelle, dass es einen gibt, nicht.

**Optionales `alt` im YAML.** Ein guter Titel („Delfine vor dem Bug") und eine gute
Bildbeschreibung sind selten derselbe Satz. Das Metadaten-Schema kennt deshalb ein
optionales Feld `alt`, das durch Manifest und Index bis zur Komponente durchläuft; fehlt
es, tritt der Titel an seine Stelle. Kein Skript kann es erfinden, also bleibt es leer, bis
jemand es schreibt.

## Phase-2-Vorgriff

> Wird in P8 ausgefüllt.

Geplanter Flow: Produktseite → Stripe Checkout → Stripe-Webhook → Nitro-Route →
Print-on-Demand-API → Tracking-Webhook → Kundenmail. Das Rendering wird dafür hybrid
(statische Seiten plus einzelne Server-Routen); Datenmodell und URLs sind bereits jetzt so
angelegt, dass dieser Schritt keine Migration erzwingt.
