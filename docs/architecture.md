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
- **Manifest als Single Source of Truth.** `photos.manifest.json` entsteht beim Build und
  ist die einzige Datenquelle des Frontends. Komponenten greifen nie auf das Dateisystem
  zu. Das hält den Wechsel des Rendering-Modus offen und macht die Daten testbar.
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
- **Prettier und ESLint teilen sich die Zuständigkeit.** Prettier formatiert, ESLint prüft.
  Wo beide dieselbe Stelle beanspruchten (`vue/html-self-closing`), ist die ESLint-Regel
  abgeschaltet; die aus dem Handoff übernommene `tokens.css` ist von Prettier ausgenommen,
  damit sie 1:1 der Vorlage entspricht.

## Bild-Pipeline

> Wird in P3 ausgefüllt.

Geplant: Varianten in 480/960/1600/2560 px als AVIF und WebP, JPEG-Fallback bei 1600 px,
nie hochskalieren, keine Metadaten in den Ausgaben, LQIP als Base64-WebP im Manifest,
inkrementelles Rendern über Content-Hashes und Aufräumen verwaister Ausgaben.

## Datenmodell

> Wird in P2/P3 ausgefüllt.

Geplant: `photos/meta/<slug>.yaml` je Bild, beim Build gegen ein Schema validiert (harte
Fehler bei fehlendem Titel oder ungültigem Slug-Format), gemergt ins Manifest. Dateiname =
Slug = URL; Slugs sind nach dem Deploy unveränderlich, weil sie in Phase 2 zu Produkt-URLs
werden.

## Phase-2-Vorgriff

> Wird in P8 ausgefüllt.

Geplanter Flow: Produktseite → Stripe Checkout → Stripe-Webhook → Nitro-Route →
Print-on-Demand-API → Tracking-Webhook → Kundenmail. Das Rendering wird dafür hybrid
(statische Seiten plus einzelne Server-Routen); Datenmodell und URLs sind bereits jetzt so
angelegt, dass dieser Schritt keine Migration erzwingt.
