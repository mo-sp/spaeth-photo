# PLAN.md — Foto-Portfolio-Website (Phase 1)

> **Status (2026-08-29):** Ergebnis der Planungssession, relativ verbindlich,
> aber nicht final geklärt – Details können sich noch ändern. Das initiale
> Design entsteht parallel gerade mit Claude Design (siehe §8).

Dieser Plan ist das Ergebnis einer ausführlichen Planungssession. Er ist verbindlich: Abweichungen sind erlaubt, wenn es gute technische Gründe gibt — dann aber die Abweichung inkl. Begründung in docs/architecture.md dokumentieren.

## 1. Ziel & Kontext

Persönliche Foto-Portfolio-Website eines Hobby-Fotografen (Motive: Tiere, Natur, Landschaft, Segeln — keine Personen).

- Phase 1: reine Präsentation (statische Seite).
- Phase 2 (später, NICHT jetzt bauen): Verkauf von Fine-Art-Prints via Print-on-Demand-API (Prodigi oder theprintspace) + Stripe Checkout. Phase 1 muss Phase 2 nur strukturell vorbereiten (Datenmodell, stabile URLs, Rendering-Modus wechselbar).

Die Seite dient zugleich als Entwickler-Showcase für Bewerbungen: sauberer Code, gute Doku, messbare Performance (Lighthouse) sind ausdrücklich Teil des Ziels.

## 2. Stack

- Nuxt 3 + TypeScript, Package Manager: pnpm (falls nicht verfügbar: npm).
- Rendering: SSG (`nuxi generate`). Kein SSR in Phase 1. Architektur so halten, dass später hybrid (statisch + Nitro-Server-Routen) umgestellt werden kann.
- Bildverarbeitung: eigenes Prebuild-Skript mit Sharp (kein @nuxt/image).
- Styling: schlankes, eigenes CSS (CSS Custom Properties als Design-Tokens). Kein Tailwind, kein UI-Framework — die Seite ist klein, Bilder stehen im Fokus. Design-Tokens werden nach dem Claude-Design-Schritt nachgereicht (siehe §8).

## 3. Repos

Zwei Repositories:

- **photo-site** (public, MIT-Lizenz): gesamter Code, Doku, 2–3 Demo-Bilder (Platzhalter mit freier Lizenz), damit das Repo für Dritte lauffähig ist.
- **photo-private** (private): Fotos, Metadaten, private Doku. Eingebunden als Git-Submodule unter `content/` im Site-Repo.

Fallback-Logik im Build: Existiert `content/photos/source/` nicht (z. B. bei fremdem Clone ohne Submodule-Zugriff), werden die Demo-Bilder aus `demo-content/` verwendet. Der Build darf dadurch NIE fehlschlagen.

Falls gh CLI authentifiziert verfügbar ist: Repos direkt auf GitHub anlegen (photo-site public, photo-private private) und Submodule verdrahten. Sonst: lokal initialisieren und die nötigen gh-/git-Befehle zum späteren Anlegen in die SUMMARY.md schreiben.

### Struktur photo-site

```
photo-site/
  CLAUDE.md
  PLAN.md                  # diese Datei
  docs/architecture.md     # Entscheidungen + Begründungen (siehe §10)
  demo-content/            # Fallback-Demobilder + Meta (Struktur wie content/)
  content/                 # Submodule -> photo-private
  scripts/build-images.ts
  app/ bzw. Nuxt-Standardstruktur (pages/, components/, composables/ ...)
  public/img/              # generierte Varianten — in .gitignore!
  photos.manifest.json     # generiert — in .gitignore!
```

### Struktur photo-private

```
photo-private/
  CLAUDE.md                # Mini-Version: Namenskonvention + YAML-Schema
  SUMMARY.md               # Session-Protokolle (siehe §11)
  photos/
    source/<slug>.jpg      # Web-Exporte (2560 px lange Kante, sRGB, EXIF-frei)
    meta/<slug>.yaml
```

## 4. Datenmodell

Konvention: Dateiname = Slug = URL (`/foto/<slug>`). Slugs sind sprechend, kleingeschrieben, kebab-case (z. B. `kranich-morgennebel`) und unveränderlich, sobald deployed (werden in Phase 2 Produkt-URLs).

`photos/meta/<slug>.yaml`:

```yaml
title: "Kranich im Morgennebel"
date: 2025-06-14          # Aufnahmedatum
tags: [tiere, natur]      # frei, kleingeschrieben
collection: null          # optional, für spätere Serien
camera: "Sony A7 IV"      # optional
lens: null                # optional
featured: false           # steuert Startseiten-Auswahl
print: null               # Phase 2: Formate/Papiere/Preise — jetzt immer null
```

Schema beim Build validieren (z. B. mit zod); harte Fehler bei fehlendem Titel oder ungültigem Slug-Format.

## 5. Bild-Pipeline (scripts/build-images.ts)

Läuft VOR `nuxi generate` (npm-Script `build-images`, im Build verkettet).

Pro Quellbild aus `content/photos/source/` (bzw. Demo-Fallback):

- Varianten in Breiten 480 / 960 / 1600 / 2560 px (nie hochskalieren — kleinere Quellen erzeugen nur die Stufen ≤ Quellbreite):
  - AVIF (Qualität ~50–60) und WebP (~75) für alle Stufen
  - JPEG-Fallback (~85) nur bei 1600
- Ausgabe: `public/img/<slug>/<breite>.<ext>`
- LQIP: ~24 px breite, stark komprimierte WebP-Version als Base64-Data-URI ins Manifest (Blur-Placeholder).
- Manifest-Eintrag in `photos.manifest.json`: Slug, Originalbreite/-höhe, Seitenverhältnis, Variantenliste, LQIP, gemergte YAML-Metadaten.
- Inkrementell: Content-Hash der Quelldatei im Manifest/Cache speichern; nur neue/geänderte Bilder rendern. Verwaiste Ausgaben (Quelle gelöscht) aufräumen.
- Keine Metadaten in Ausgaben (Sharp-Default beibehalten, kein `withMetadata()`).

Das Manifest ist die einzige Datenquelle des Frontends. Kein direkter Dateisystem-Zugriff aus Komponenten.

## 6. Seiten & Komponenten

Routen:

```
/                  Startseite: 1 Hero (featured, fetchpriority=high, eager),
                   darunter 6–9 kuratierte Bilder, Link zur Galerie. Minimaler Text.
/galerie           Grid aller Fotos (Masonry mit festen Spalten, CSS columns oder
                   eigene Logik). Tag-Filterleiste oben (Alle + vorhandene Tags,
                   aus Manifest abgeleitet). Filterung client-seitig, aktiver Tag
                   in URL-Query (?tag=segeln), beim Laden ausgewertet.
/foto/[slug]       Detailseite: großes Bild (2560er-Stufe), Titel, Jahr, Tags,
                   optional Kamera/Objektiv dezent, Prev/Next innerhalb der
                   aktuellen Filterung. Wird in Phase 2 zur Produktseite.
/ueber             Kurzvorstellung, Hinweis auf Entwickler-Hintergrund + GitHub-Link,
                   Kontakt-Mailadresse. Platzhaltertexte, klar als TODO markiert.
/impressum         Platzhalter mit TODO-Markern (Pflichtangaben-Struktur anlegen).
/datenschutz       Platzhalter: Hosting-Logs-Absatz, kein Tracking, kein Cookie-Banner.
```

Zentrale Komponente `<PhotoImage>`: baut aus einem Manifest-Eintrag ein `<picture>` mit AVIF/WebP-Sources, srcset/sizes, width/height (kein CLS), LQIP als Hintergrund, `loading="lazy"` (außer explizit eager). Galerie-Klick öffnet Lightbox (Tastaturnavigation: Pfeile, Esc) mit Link „Details" zur Foto-Seite. Lightbox schlank selbst bauen, keine schwere Library.

SEO-Basics: Title/Meta pro Seite, OpenGraph-Bild pro Foto-Detailseite (1600er-JPEG), sitemap.xml beim Generate erzeugen.

## 7. Deployment (Coolify auf Hetzner-VPS)

- Ziel: Coolify Static-Site-Deployment. Build-Befehl: `pnpm build-images && pnpm generate`, Output-Verzeichnis von Nuxt (`.output/public`).
- Submodule-Checkout muss aktiviert sein (privates Submodule via Deploy-Key — falls im Setup nicht konfigurierbar, in SUMMARY.md dokumentieren, was der Betreiber in Coolify/GitHub einstellen muss).
- Node-Version festnageln (`.nvmrc` / `engines`), Sharp braucht evtl. Build-Deps — in Doku vermerken.

## 8. Design

Design-Tokens und Layout-Feinheiten kommen aus einem separaten Claude-Design-Schritt und werden nachgereicht (HTML/CSS-Prototypen für Startseite, Galerie, Detailseite). Bis dahin:

- Neutrales, dunkles Grundtheme über CSS Custom Properties in einem einzigen `tokens.css` (Farben, Schriftgrößen, Abstände) — so, dass die Werte später 1:1 gegen die Claude-Design-Ergebnisse getauscht werden können.
- Zurückhaltend: dunkler Hintergrund, viel Weißraum, Bilder dominieren.
- Systemschrift-Stack als Platzhalter; Font-Entscheidung fällt im Design-Schritt.

## 9. Harte Regeln

- `public/img/` und `photos.manifest.json` niemals committen (.gitignore ab Init).
- Niemals Bilder hochskalieren.
- Niemals EXIF/Metadaten in ausgelieferte Bilder schreiben.
- Slugs nach Deploy nie ändern.
- Keine Vollauflösungs-Dateien ins Repo oder auf den Server — Quelldateien sind max. 2560 px.
- Keine externen Tracker, kein Analytics, keine Cookies (daher kein Banner).
- Keine schweren Dependencies ohne Not; jede neue Dependency in docs/architecture.md begründen.
- Secrets (später: Stripe/Prodigi-Keys) nur in .env / Coolify-Env, nie im Repo.
- NICHT bauen in Phase 1: Shop/Checkout, Blog, Kommentare, Newsletter, CMS, Auth.

## 10. Doku

- **docs/architecture.md**: Stack-Entscheidungen inkl. Warum (SSG statt SSR; Sharp-Skript statt @nuxt/image wegen unzuverlässigem SSG-Prerendering; zwei Repos + Submodule wegen Lizenz-/Rechtetrennung Code vs. Fotos; Manifest als Single Source of Truth). Plus Phase-2-Vorgriff: geplanter Flow Produktseite → Stripe Checkout → Stripe-Webhook → Nitro-Route → Prodigi-API → Tracking-Webhook → Kundenmail; Rendering dann hybrid.
- **CLAUDE.md (photo-site)**, kompakt (<100 Zeilen): Projektbeschreibung, Stack, Kommandos, Kernkonventionen (Manifest einzige Datenquelle; Dateiname = Slug = URL; Content aus Submodule mit Demo-Fallback), die harten Regeln aus §9, Verweis auf docs/architecture.md und auf die Session-Protokoll-Pflicht (§11).
- **CLAUDE.md (photo-private)**: Namenskonvention, YAML-Schema mit Beispiel, Hinweis: Inhalte dieses Repos sind privat und dürfen nie ins public Repo kopiert werden.

## 11. Arbeitsweise / Session-Protokoll

Nach JEDER Claude-Code-Session einen Eintrag ans Ende von `content/SUMMARY.md` (photo-private) anhängen:

```markdown
## 2026-08-29 — Session N
**Erledigt:** ...
**Entscheidungen:** ... (inkl. Abweichungen vom Plan + Begründung)
**Offen / nächste Schritte:** ...
```

Diese Pflicht in der CLAUDE.md des Site-Repos verankern.

## 12. Reihenfolge der Umsetzung

1. Repos + Submodule + .gitignore + Grundgerüst (Nuxt 3, TS, pnpm, ESLint/Prettier).
2. Demo-Content (2–3 freie Bilder + YAML) anlegen.
3. build-images.ts inkl. Manifest, Hash-Cache, Validierung; npm-Scripts verketten.
4. `<PhotoImage>` + Galerie + Tag-Filter + Lightbox.
5. Foto-Detailseite mit Prev/Next.
6. Startseite, Über-mich, Impressum/Datenschutz-Platzhalter.
7. SEO (Meta, OG, Sitemap), Lighthouse-Check lokal, Ergebnisse in SUMMARY.md.
8. Doku (§10) finalisieren, Coolify-Deployment-Anleitung in README/SUMMARY.md.
9. Session-Protokoll schreiben.

Design-Integration (Tokens aus Claude Design) erfolgt als separate Folge-Session, sobald die Ergebnisse vorliegen.

## 13. Entscheidungen der Session 2026-08-29 (verbindlich, ergänzt §1–§12)

**Name & Marke**
- Repo public: `mo-sp/spaeth-photo`. Repo private: `mo-sp/spaeth-photo-content` (Submodule `content/`).
- Wortmarke Sidebar: „MORITZ / SPÄTH". ASCII-Schreibweise überall `spaeth`; auf der Seite „Späth".
- Theme/Untertitel „Licht / Schatten": auf der Startseite im Hero-Bereich, typografisch als Dualität gesetzt –
  „Licht" kursiv (Archivo Italic o. ä.), „Schatten" aufrecht/anders gewichtet, so dass Unterschied UND Zusammengehörigkeit sichtbar sind. Nicht in der Sidebar.
- Sidebar-Fußzeile: `WEDEL / 53.58°N 9.70°E` (Koordinaten Wedel; exakter Punkt anpassbar).
- Domain noch nicht gekauft; Kandidaten laut DNS frei: moritz-spaeth.de, spaeth-foto.de, spaethphoto.de. `spaeth-photo.de` ist belegt – Repo-Name ≠ Domain ist ok.

**Stack-Abweichungen**
- Nuxt 4 statt Nuxt 3 (aktuelle Major, `app/`-Struktur). Begründung in docs/architecture.md.
- Design-Integration erfolgt SOFORT (nicht als Folge-Session): Handoff „Variante 1C Vollbild" liegt vor
  (`~/incoming/BilderWebseite/design_handoff_foto_portfolio/`: README = Spec, tokens.css verbindlich, photos.json = Startdaten).
- Fonts Archivo (400/500/600 + Italic) und JetBrains Mono (400/500) selbst gehostet als woff2 in `public/fonts/`, kein Google-Fonts-Request.
- Sidebar-Layout (220 px links) ersetzt das neutrale Platzhalter-Theme aus §8. Navigation: Start · Galerie · Über; Impressum/Datenschutz als kleine Links im Sidebar-Fuß.
- Tag „Schwarzweiß" (Slug `schwarzweiss`) kommt zu den Tags hinzu. Tags im Manifest kleingeschrieben; Anzeige-Label mit Umlaut über Mapping.
- Kein Nuxt Image (README des Handoffs empfiehlt es; Plan §2 bleibt: eigenes Sharp-Skript).

**Bild-Quellen**
- Originale (26 Stück, bis 33 MP, EXIF) liegen NUR in `~/incoming/BilderWebseite/` – niemals in ein Repo.
- Neues Skript `scripts/export-sources.ts` (im public Repo, generisch): liest Originale aus einem konfigurierbaren Ordner,
  liest EXIF (DateTimeOriginal, Kamera, Objektiv) VOR dem Strippen, schreibt 2560-px-sRGB-JPEG (q≈92, ohne Metadaten)
  nach `content/photos/source/<slug>.jpg` und legt fehlende `content/photos/meta/<slug>.yaml` an (Titel aus photos.json, Datum aus EXIF).
  Mapping Original → Slug aus photos.json des Handoffs; 3 ungemappte Originale (DSC00011, SA401623, SA401812_gut) erhalten Slug + `title: "TODO"` und `featured: false`.
- Demo-Content (public Repo): 3 Bilder mit freier Lizenz, Herkunft/Lizenz je Bild in `demo-content/LICENSES.md`.

**Arbeitsweise dieser Session**
- Autonome Umsetzung von §12 Schritt 1–9. Detailentscheidungen werden selbst getroffen und in `content/SUMMARY.md` (privat) sowie
  `docs/architecture.md` (public, nur Mechanismus, kein Inventar) festgehalten.
- Nicht ohne Rückfrage: Domainkauf, Coolify-Deploy, Löschen von Nutzerdaten, Force-Push.

**Internationalisation (2026-08-29, P8a)**
- Englisch ist die primäre Sprache, Deutsch die Übersetzung. URLs englisch und ohne Präfix
  (`/`, `/gallery`, `/gallery/<tag>`, `/photo/<slug>`, `/about`, `/legal-notice`, `/privacy`);
  Deutsch unter `/de/…` mit denselben englischen Pfadsegmenten. `x-default` zeigt auf Englisch.
- Foto-Slugs und Tag-Schlüssel sind jetzt englisch (`anleger-im-gegenlicht` →
  `jetty-against-the-light`; `segeln` → `sailing`). Die Regel „Slugs nach dem Deploy
  unveränderlich" bleibt — es war nichts deployed. Eine Client-Middleware schreibt die alten
  deutschen Pfade um; für die alten Slugs gibt es keine Weiterleitung.
- Neue Tags `fire` und `architecture` (Feuer/Architektur); der Satz umfasst damit sieben Tags.
- YAML: `title` ist englisch und Pflicht, `title_de`/`alt_de` optional. Kein @nuxtjs/i18n
  (Begründung mit Zahlen in docs/architecture.md), sondern zwei JSON-Wörterbücher und ein
  zweiter Routenbaum über den `pages:extend`-Hook.
- Seiten mit `TODO:`-Platzhaltern (Über, Impressum, Datenschutz) tragen `noindex, follow` und
  stehen weder in der Sitemap noch in der hreflang-Paarung.
- Impressum bleibt deutsch (§ 5 DDG); die englische Seite ist eine Hülle mit einem
  erklärenden Satz. Datenschutz ist zweisprachig, die deutsche Fassung ist maßgeblich.
- Diese Datei bleibt deutsch; P8 übersetzt die öffentliche Doku.
