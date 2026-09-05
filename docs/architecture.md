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

**Die `<h1>` der Detailseite steht unsichtbar im `<main>`.** Das Design gibt den Titel der
Seitenleiste und lässt den Inhaltsbereich dem Bild allein. Eine Überschrift in der
seitenübergreifenden Kopfpartie wäre aber keine Überschrift *dieser* Seite: sie stünde
außerhalb des `<main>`, in einem Block, der auf jeder Seite gleich aussieht. Deshalb trägt
das `<main>` eine `.sr-only`-`<h1>` mit dem Bildtitel, und die Seitenleiste zeigt denselben
Titel sichtbar als `<p>`. Der Preis ist eine Wiederholung für Screenreader — die Alternative
(die Seitenleiste bekommt die `<h1>`) verlegt die Dokumentstruktur in die Navigation, und
das wiegt schwerer. Die Kopfleiste mit Titel und Jahr, die das P4-Gerüst über dem Bild
hatte, ist damit entfallen; sie stand so auch nicht in der Spec.

**Anzeigebreite des Detailbilds folgt der Bühnengeometrie — mit zwei Aufschlägen.**
`object-fit: contain` in einem 820 px hohen Kasten deckelt die Breite auf `820 · aspect`;
ein Hochformat wird nie breiter als 547 px, egal wie groß der Bildschirm ist. Dieser Deckel
steht in `sizes` (`min(calc(100vw - 220px), 547px)`) und spart dort die großen Stufen. Für
das `srcset` (`variantMax`) ist derselbe Wert allerdings zu klein: `sizes` nennt
CSS-Pixel, der Browser multipliziert selbst mit der Pixeldichte — daher der Faktor 2. Und
er darf nicht unter das fallen, was ein Telefon braucht, denn dort ist die Bühne höhenlos
und das Bild volle 100vw breit (bis 767 CSS-px, bei doppelter Dichte rund 1534): die
Untergrenze ist deshalb die 1600er-Stufe. In Zahlen: ein Querformat bekommt 480/960/1600
statt zusätzlich 2560, ein Hochformat 480/960/1600 statt zusätzlich 1707. Beide Funktionen
(`detailSizes`, `detailVariantMax`) liegen in `shared/utils/img.ts` und sind getestet; die
820 stehen dort als Konstante neben dem Hinweis auf `--detail-h`.

**Der Tag-Kontext der Detailseite ist weicher Zustand — und wird geprüft.** `/foto/<slug>`
ist ohne Query prerendert. Läse die Seite `?tag=` schon beim ersten Rendern, unterschiede
sich der hydrierte Baum vom ausgelieferten HTML. Ein `hydrated`-Flag aus `onMounted` hält
den ersten Durchlauf deckungsgleich (ungefilterte Nachbarn), danach zieht der Filter;
`import.meta.client` reicht dafür nicht, es ist beim Hydrieren schon wahr. Zusätzlich gilt
der Filter nur, wenn das Bild in ihm vorkommt: `/foto/anleger-im-gegenlicht?tag=segeln`
ist ein von Hand gebauter oder alt gewordener Link, und ohne diese Prüfung stünde dort
„00 / 04" ohne Nachbarn und ein Rückweg in eine Galerie ohne dieses Bild. Prev/Next reichen
`?tag=` weiter, die Pfeiltasten ← und → tun dasselbe — mit Wächtern gegen Modifier,
Eingabefelder und einen offenen Dialog. Das Canonical steht ohne Query.

**Auf der Detailseite tauscht die Seitenleiste ihren Fuß, statt einen zweiten zu bekommen.**
Dort unten stehen Prev/Next, der Zähler und die Rechtslinks (`PhotoAsideFoot`); `SiteFoot`
mit Ort und Koordinaten entfällt — im Handoff ist er ohnehin eine Zutat der Startseite.
Stünden beide, stünde „Impressum" zweimal auf derselben Seite. Mobil ist es umgekehrt: dort
trägt der Seitenfuß des Layouts Ort und Rechtliches, und `PhotoAsideFoot` blendet seine
Rechtslinks aus. Sichtbar ist damit in jeder Breite genau ein Satz. Dieselbe Routen-Meta
(`aside === 'photo'`) blendet die Navigationsliste aus — aber nur oberhalb von 768 px:
mobil ist sie das Menü der Kopfleiste und der einzige Weg zu den übrigen Seiten. Die
Wortmarke bleibt in beiden Fällen der Weg zur Startseite.

**Blur-up als Pseudo-Element, nicht als Bildhintergrund.** Das 20-px-Vorschaubild liegt
unter dem echten Bild (`picture::before`, `blur(12px)`, `scale(1.06)` gegen den hellen
Saum, den ein Blur an der Kante hinterlässt), und das echte Bild blendet mit 160 ms darüber
ein. Als `background-image` auf dem `<img>` selbst — die naheliegende Fassung — ließe sich
das Bild nicht über dem Blur einblenden, weil beide dasselbe Element wären. Unter
`prefers-reduced-motion` entfällt das Pseudo-Element ganz; dann steht bis zum Laden die
ruhige Durchschnittsfarbe. Ohne JavaScript (`@media (scripting: none)`) ist das Bild sofort
sichtbar, statt auf ein `load`-Ereignis zu warten, das niemand mehr auswertet.

**Bekannte Abweichung: mobil steht der Metadatenblock der Detailseite im DOM vor dem Bild,
sichtbar aber darunter.** Die Seitenleiste ist auf dem Desktop ein zusammenhängender,
klebender Block und muss dafür ein Element sein; unter 768 px löst `display: contents` ihn
in Grid-Felder auf, und dann liegt das Feld mit den Metadaten zwangsläufig vor dem
`<main>`. Die Reihenfolge im DOM (Titel, Jahr, Tags, Prev/Next, dann Bild) bleibt eine
sinnvolle Lesefolge — sie liest sich wie eine vorangestellte Bildunterschrift, und die
Fokusreihenfolge folgt ihr —, deckt sich aber nicht mit der visuellen. Die saubere Lösung
wäre, den Block zweimal zu rendern und je Breite einen auszublenden; das dupliziert Inhalt
im HTML und wurde bewusst nicht gemacht. Vermerkt für P7.

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

**Der Caption-Gradient ist zweistufig statt linear** (zweite Abweichung vom Handoff, in
demselben Projekt-Block). Die Vorlage blendet von 85 % Deckkraft linear auf 0 aus. Der
Titel steht aber nicht am unteren Rand des Streifens, sondern in seiner Mitte — dort ist
vom Verlauf nur noch rund ein Drittel bis die Hälfte übrig, und über einem hellen Foto
(Watt, Wolkenbank) fällt der Kontrast des weißen 10-px-Texts unter AA. Eine Stützstelle
bei 60 % hält die Deckkraft dort, wo der Text steht, und lässt den Verlauf darüber
weiterhin weich auslaufen; sichtbar ändert sich nur, dass die Unterschrift lesbar bleibt.

**Die Startseite zeigt fünf kuratierte Bilder, nicht sechs bis neun** (Abweichung von
PLAN.md). Das Raster der Spec hat fünf Spalten; sechs Bilder brechen in eine zweite Reihe
um, in der vier Plätze leer bleiben. Fünf ist die einzige Zahl, die eine volle Reihe ergibt
— und eine Auswahl, die man auf einen Blick fasst, ist ohnehin der Punkt. Welche Bilder es
sind und in welcher Reihenfolge, steht als `featured` und `order` im YAML: eine Entscheidung
des Fotografen, keine des Codes (`curated()` in `shared/utils/photos.ts`, mit Tests).

**Der Hero ist mobil breitengetrieben — und `sizes` sagt 100vw, nicht 66vw.** Der Handoff
setzt unter 768 px `--hero-h: 60vh`. Eine Höhe in Viewporthöhen koppelt aber bei
`object-fit: cover` die Anzeigebreite vom Viewport ab, und genau diese Breite ist das
Einzige, was `sizes` ausdrücken kann: der Browser wählte die Stufe nach einer Zahl, die
nicht stimmt — ausgerechnet für das LCP-Bild. Mobil ist der Hero deshalb 3:2 bei
`height: auto` (`--hero-h` im Projekt-Block überschrieben). Damit ist seine Breite exakt
100vw, und das steht auch in `sizes`; die im Vorurteil genannten 66vw stammen aus der
60vh-Fassung und wären jetzt ein Drittel zu wenig. Dieselbe Überlegung gilt für die
Auswahlreihe: unter 768 px wird sie einspaltig (`--curated-cols: 1`, `--curated-h: auto`,
3:2) statt fünf Kacheln à 70 px.

**„Licht / Schatten" ist die `<h1>` der Startseite.** Das Motiv des Projekts steht als
eigene Bande unter der Hero-Caption: `Licht` kursiv in 400 und voller Textfarbe, ein
Mono-Schrägstrich in 11 px als Scharnier, `Schatten` aufrecht in 600 und gedämpft. Die
Überschrift der Startseite ist damit die Aussage der Seite und nicht das Wort „Start"; die
Wortmarke in der Seitenleiste bleibt ein Link. Der Seitentitel wird hier ausnahmsweise ohne
die Vorlage `%s – Moritz Späth` gesetzt (`titleTemplate: null`), sonst stünde im Tab
„Start – Moritz Späth" oder der Name zweimal.

**Die drei Textseiten teilen eine Komponente, nicht drei Stylesheets.** `<DocPage title>`
bringt die Kopfleiste und die Spalte mit 62 Zeichen Zeilenlänge mit; die Typografie von
Überschriften, Absätzen, Listen und Definitionslisten greift über `:deep()` in den
Slot-Inhalt. Die Seiten selbst enthalten deshalb nur Text in einfachem HTML — was sie
unterscheidet, ist ihr Inhalt, und das soll man auch beim Lesen des Quelltexts sehen.
Abschnittsüberschriften sind Mikro-Labels in Mono mit Hairline, kein zweiter Titelgrad: die
Seite kennt nur eine Textgröße für Fließtext und eine für Labels. Offene Angaben stehen als
sichtbarer Text „TODO: …" mit Rahmen auf der Seite, nicht als Kommentar im Quelltext — was
fehlt, soll beim Lesen auffallen und sich im erzeugten HTML finden lassen. Impressum und
Datenschutz sind ausdrücklich Entwürfe: § 5 DDG ohne ODR-Klausel (die Schlichtungsstelle
gilt für Verbraucherverträge, die es hier nicht gibt), Datenschutz mit Server-Logs,
lokalen Schriften, metadatenfreien Bildern und der Aufsichtsbehörde — jeweils mit einem
TODO für die Rechtsprüfung.

**Kein `overflow: hidden` auf Mono-Versalien mit `line-height: 1`.** Die Spec setzt die
Mikro-Labels auf 10 bzw. 11 px bei Zeilenhöhe 1; der Zeilenkasten ist damit genau so hoch
wie die Schrift, und `overflow: hidden` schneidet ab, was darüber hinausragt — die Punkte
über Ü und Ö. Im Grid stand deshalb „LACHMOWEN" statt „LACHMÖWEN". Wo eine Zeile beides
braucht (Kürzen mit Ellipse *und* die enge Geometrie), bekommt sie `line-height: 1.4` und
holt die Differenz über `margin-block: -0.2em` zurück: sichtbar ändert sich nichts, der
Kasten reicht nur wieder über die Umlautpunkte. Deutsche Titel sind hier der Regelfall,
nicht der Sonderfall.

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

## SEO

*New sections are written in English from P7 on; the German ones above are translated in P8.*

**`NUXT_PUBLIC_SITE_URL` is a build variable, not a runtime one.** A statically generated
site has no server left at request time to substitute a host, so the absolute URLs are
baked in by `nuxt generate`. On Coolify it therefore has to be set as a *build* variable
(the checkbox matters), not just as an environment variable. It feeds four things: the
canonical link and `og:url` of every page, `og:image` (social crawlers ignore a relative
one), the `<loc>` entries of the sitemap, and the `Sitemap:` line of robots.txt.
`.env.example` documents it.

Unset, everything still builds and renders — URLs stay relative, the sitemap comes out
empty with a build warning, robots.txt omits its `Sitemap:` line. That is deliberate:
inventing a domain would put wrong canonical URLs in front of a crawler, and failing the
build would break the rule that a clone without the private content still builds. The
default stays `''`.

**Sitemap and robots.txt are Nitro routes, not files in `public/`.** Both need the absolute
site URL, which a static file cannot know. `server/routes/sitemap.xml.ts` sets
`content-type: application/xml` explicitly — with the default `text/html` the prerenderer
would file the response under `sitemap.xml/index.html`, which serves fine but is not the
URL robots.txt points at. Both routes are listed in `nitro.prerender.routes`; nothing links
to them, so `crawlLinks` would never find them. `public/robots.txt` was removed in the same
step, because a static file and a route at the same path is a coin toss.

What the sitemap contains: 36 URLs — 26 photo pages, `/galerie` plus its five tag pages,
and the four remaining pages (`/`, `/ueber`, `/impressum`, `/datenschutz`). The tag pages
are in because they are real prerendered routes with their own content and their own
canonical link, not a query view of the gallery.

Three deliberate omissions:

- **No `<changefreq>`, no `<priority>`.** Google ignores both. A number nobody acts on is a
  number that quietly goes stale.
- **No `<lastmod>` on the three text pages.** The only date available would be the build
  time, and a rebuild does not change their wording. Elsewhere `lastmod` is the photo's
  capture date, and for the listing pages the newest date they show — those really do change
  when a photo is added.
- **The image extension names each photo only on its own page.** The widest JPEG variant,
  not the AVIF/WebP ones (JPEG is what every crawler can read) and not the OG crop (which is
  a 1200x630 cut of the photo, not the photo). Repeating all 26 images on the gallery pages
  would claim 26 canonical pages for each of them.

**`useSiteSeo()` holds the head tags.** Six pages each repeated the same block — read
`siteUrl`, feed the description into `og:description` a second time, spell out the OG image
and its size, set `twitter:card`, add a canonical link. The copies had already drifted in
the way that matters: only the home page and the photo pages carried an `og:image` at all,
so a link to `/galerie` or `/ueber` unfurled as a bare text card. The composable defaults
the preview image to the hero photo's OG crop, and the gallery overrides it with the first
photo of the current filter. `og:image:width`/`height` come from `OG_WIDTH`/`OG_HEIGHT` in
`shared/constants/images.ts`, which the image pipeline also reads — the numbers are a fact
about the generated file, and now only written down once.

## Fonts

**Subsetting.** `scripts/subset-fonts.sh` reduces the three self-hosted woff2 files to the
characters this site renders and clamps their weight axis to what `fonts.css` declares:
**105 KB → 53 KB (-49 %)**.

| file | before | after |
| --- | ---: | ---: |
| `archivo-variable.woff2` | 34,928 B | 14,628 B (-58 %) |
| `archivo-italic-variable.woff2` | 39,156 B | 15,560 B (-60 %) |
| `jetbrains-mono-variable.woff2` | 31,432 B | 23,544 B (-25 %) |
| **total** | **105,516 B** | **53,732 B** |

Most of the saving is the weight axis, not the character set: these are variable fonts,
Archivo ships a 100–900 axis and JetBrains Mono a 400–800 one, and the design uses 400–600
and 400–500. `fontTools.varLib.instancer` clamps the axis, `pyftsubset` then cuts the
glyphs with `--layout-features='*'` — dropping features to save more bytes would break the
tabular figures the counters depend on. The script is idempotent, prints before/after
sizes, and verifies afterwards that every requested character survived.

fontTools is **not** a project dependency. The site builds without it; the script installs
it into a throwaway virtualenv and is run by hand when the character set or a weight
changes. The character set is listed in the script with a reason per line, and the sources
(Google Fonts API, `latin` subset, 2026-08-29) are named there so the set can be widened
again later. `public/fonts/LICENSE-OFL.txt` records that the files are modified versions,
which the OFL requires.

**Two characters the fonts never had.** U+2190/U+2192 (the ← → arrows) and U+2261 (the
mobile menu glyph) are outside Google's `latin` subset and were absent before this change
too — they render from a system font. Subsetting cannot add them. They are listed in the
script anyway, so a fuller source font would pick them up, and the script's check reports
them on every run. Whether to replace them with drawn shapes is a design question, noted in
`content/OFFEN.md`.

**Metric-matched fallbacks against CLS.** `font-display: swap` paints the fallback font
first and repaints when the webfont arrives; where the two differ in width, that repaint
moves text. Measured: CLS 0.133 on `/ueber` at mobile emulation, attributed by Lighthouse
to exactly those two font loads, on a page whose layout is otherwise perfectly stable.

The fix is not to drop `swap` (invisible text is worse than moved text) and not to preload
(see below). It is `@font-face` declarations with no `src` URL — `local()` only, so they
cost no request — carrying `size-adjust`, `ascent-override`, `descent-override` and
`line-gap-override` so that the fallback occupies the same space as the webfont.

How the numbers were derived: `size-adjust` is the ratio of mean advance width between the
webfont and the fallback, weighted by how often each character actually occurs across the
generated pages (a frequency corpus of ~24,000 characters, not a flat average over the
alphabet); the three overrides are the webfont's own ascent/descent/line-gap (`OS/2 sTypo*`,
upem 1000) divided by that ratio, so the line box matches as well as the width. Measured
with fontTools against Liberation Sans and DejaVu Sans Mono, which are metrically
compatible with Arial and Menlo.

| family | size-adjust | ascent | descent | line-gap |
| --- | ---: | ---: | ---: | ---: |
| Archivo Fallback, normal | 95.77 % | 91.68 % | 21.93 % | 0 % |
| Archivo Fallback, italic | 95.01 % | 92.41 % | 22.10 % | 0 % |
| JetBrains Mono Fallback | 99.66 % | 102.35 % | 30.10 % | 0 % |

Only fonts that are metrically compatible with the one the numbers were computed against
are named in `local()`. That is the whole discipline: a `size-adjust` derived from Arial and
then applied to a font of a different width makes the shift *worse*. So Arial, Helvetica,
Liberation Sans and Arimo for the sans; Menlo, DejaVu Sans Mono, Liberation Mono and
Cascadia Mono for the monospace — all four around 0.6 em advance, with Consolas (0.55 em)
deliberately absent. Where none of them exists, the declaration does not match, the next
family in the stack takes over unadjusted, and the page behaves exactly as it did before:
the adjustment can help or do nothing, but it cannot hurt.

Measured effect on `/ueber`, mobile emulation: CLS 0.133 → 0.003 where an Arial-metric font
is present. The stacks live in the project block of `tokens.css`; the handoff line above the
divider is untouched.

## Performance

Measured locally with Lighthouse against the generated output, never in CI. The static
server used for it mirrors what a real host does — HTTP/1.1 with keep-alive, brotli, and
the cache headers recommended below. This matters more than it sounds: measured through
`python3 -m http.server`, which is HTTP/1.0 without keep-alive or compression, the same
build scored 12 to 16 points lower on mobile and the bottleneck it showed was the test rig.

**Results, 2026-08-29** (P6 → P7, same build, same server, same machine; mobile is
Lighthouse's throttled 4G profile, desktop its unthrottled one):

| page | mobile perf | desktop perf | LCP mobile | CLS mobile |
| --- | --- | --- | --- | --- |
| `/` | 89 → **94** | 100 → **100** | 3.5 s → 2.9 s | 0 → 0 |
| `/galerie` | 86 → **91** | 99 → **100** | 4.1 s → 3.4 s | 0 → 0 |
| `/foto/<slug>` | 96 → **97** | 100 → **100** | 2.4 s → 2.3 s | 0 → 0 |
| `/ueber` | 98 → **98** | 100 → **100** | 2.0 s → 2.0 s | 0.019 → 0.003 |

Accessibility 100, best practices 100 and SEO 100 on every page in both profiles, before
and after. (The SEO score needs `NUXT_PUBLIC_SITE_URL` set — without it the canonical link
is relative and Lighthouse scores 92. The measurements above set it, because a deployment
will.)

The `/ueber` row is the honest one to read carefully: its CLS gain depends on the measuring
machine having an Arial-metric font. On a machine with none, the P6 build shifted by 0.133
and the P7 build shifts the same amount, because the `local()` declaration finds nothing to
adjust. The fix helps every visitor on Windows, macOS and iOS and is inert elsewhere.

**Two optimisations that were measured and rejected.** Both are the kind that get added on
faith:

- **Preloading the LCP image** with `imagesrcset`/`imagesizes`, tried on `/` and on
  `/galerie`: no change to LCP at all (2.9 s and 3.3 s, unmoved). Lighthouse's own LCP
  discovery audit explains why — the image is already found by the preload scanner in the
  initial document, already `fetchpriority=high`, already not lazy. There is nothing left
  for a preload to bring forward.
- **Inlining the global stylesheet** (`features.inlineStyles: true`). Lighthouse flags
  ~450 ms of render-blocking CSS per page, but the measured result was inside run-to-run
  noise (+0 / -2 / +1 points on three pages). Not worth the config surface or duplicating
  the CSS into 74 prerendered files.

`fetchpriority="low"` on eager-but-not-LCP images did survive, on reasoning rather than a
measured delta: it is correct (the gallery starts nine tiles at once and only one of them is
the LCP element), it costs nothing, and Lighthouse's simulated throttling does not model
connection-level reordering well enough to show it either way.

**What still limits the two image-heavy pages.** `/` at 94 and `/galerie` at 91 sit below
the ≥95 target, and the cause is understood: on the simulated 4G profile the LCP image
arrives behind 300–400 KB of other above-the-fold image traffic. Reducing the eager set does
not help — measured at 9, 3, 2 and 1 eager tiles, LCP stayed at 3.3 s, because the browser's
own lazy-loading threshold fetches the next screens anyway. The remaining levers are the
AVIF quality ladder and the width steps, both set deliberately in P3 against a quality
budget; changing them is a picture-quality decision, not a performance tweak, and is left
open rather than taken quietly.

**Cache headers for the deployment.** Everything under `/_nuxt/`, `/fonts/` and `/img/` is
content-addressed or immutable by convention — a photo's slug never changes and its
variants are regenerated only when the source does:

```
/_nuxt/*   Cache-Control: public, max-age=31536000, immutable
/fonts/*   Cache-Control: public, max-age=31536000, immutable
/img/*     Cache-Control: public, max-age=31536000, immutable
*.html     Cache-Control: public, max-age=0, must-revalidate
```

The HTML must not be cached that way: the asset URLs inside it change with every build, and
a cached page pointing at deleted `/_nuxt/` files is a blank site. The README's Coolify
instructions in P8 should carry this table.

**Payload extraction stays on `'client'`.** Confirmed by measurement: no `_payload.json`
request appears in any first-load trace on any page. The files exist for client-side
navigation and cost nothing on entry.

**Known: DOM order on the mobile detail page.** Below 768 px the grid places the photo above
its metadata, but in the DOM the sidebar (and with it the metadata block) still comes before
`<main>`. Reading order and visual order therefore differ on that one page. Not fixed here:
the two ways out are duplicating the block into `<main>` and hiding one copy per breakpoint —
which duplicates a `<nav>` landmark and its links — or splitting the sticky sidebar column
into separate grid items, which reworks the layout the P4–P6 design was signed off on.
Lighthouse's accessibility audit is at 100 either way. Noted for P8.

## Phase-2-Vorgriff

> Wird in P8 ausgefüllt.

Geplanter Flow: Produktseite → Stripe Checkout → Stripe-Webhook → Nitro-Route →
Print-on-Demand-API → Tracking-Webhook → Kundenmail. Das Rendering wird dafür hybrid
(statische Seiten plus einzelne Server-Routen); Datenmodell und URLs sind bereits jetzt so
angelegt, dass dieser Schritt keine Migration erzwingt.
