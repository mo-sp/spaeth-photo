# spaeth-photo — CLAUDE.md

Statische Foto-Portfolio-Website (Hobby-Fotografie: Tiere, Natur, Landschaft, Segeln).
Phase 1 ist reine Präsentation; Phase 2 (Print-Verkauf) wird nur strukturell vorbereitet,
aber **nicht** gebaut. Die Seite ist zugleich Entwickler-Showcase: sauberer Code, gute
Doku und messbare Performance sind Teil des Ziels.

## Stack

- Nuxt 4 + TypeScript, Rendering SSG über `nuxt generate` (Output `.output/public`).
- pnpm, Node ≥ 24 (`.nvmrc`: 24). Die Skripte unter `scripts/` laufen ohne Runner:
  Node entfernt die Typen selbst (`node scripts/x.ts`), `tsconfig.scripts.json` erzwingt
  dafür `erasableSyntaxOnly`.
- Eigenes CSS mit Custom Properties (`app/assets/css/tokens.css`). Kein Tailwind, kein UI-Framework.
- Bildverarbeitung: eigene Sharp-Skripte (`scripts/export-sources.ts`, `scripts/build-images.ts`),
  kein @nuxt/image. Tests mit vitest.
- Schriften Archivo und JetBrains Mono selbst gehostet in `public/fonts/`, subgesetzt aus
  `scripts/fonts-src/` (`scripts/subset-fonts.sh`, 114 → 55 KB).
- `sitemap.xml` und `robots.txt` sind Nitro-Routen unter `server/routes/`, keine statischen
  Dateien: beide brauchen die absolute Site-URL aus `NUXT_PUBLIC_SITE_URL` (Build-Variable).

## Kommandos

| Befehl                        | Wirkung                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                    | Dev-Server (`predev` baut vorher die Bilder, Cache: ~40 ms)                |
| `pnpm export-sources`         | Originale → Web-Quellen + YAML im Content-Repo (siehe unten)               |
| `pnpm build-images`           | Bild-Varianten, `photos.manifest.json`, Client-Index                       |
| `pnpm check-manifest`         | erzeugtes Manifest prüfen (CI-Torwächter)                                  |
| `pnpm generate`               | statische Seite bauen                                                      |
| `pnpm build`                  | `build-images` + `generate` (Coolify-Build-Befehl)                         |
| `pnpm preview`                | gebaute Seite lokal ansehen                                                |
| `pnpm lint` / `pnpm lint:fix` | ESLint (Flat Config über @nuxt/eslint)                                     |
| `pnpm typecheck`              | `nuxt typecheck` + `tsc -p tsconfig.scripts.json` (baut vorher die Bilder) |
| `pnpm test`                   | vitest, nur Unit-Tests (< 1 s)                                             |
| `pnpm test:integration`       | Farb-Regressionstest der Bild-Pipeline (kodiert echte Bilder)              |
| `scripts/subset-fonts.sh`     | Schriften neu subsetten (nur nötig, wenn Zeichenvorrat/Gewicht sich ändern) |
| `scripts/subset-fonts.sh --check` | dasselbe prüfen, ohne zu schreiben; Exit ≠ 0 bei fehlendem Zeichen |

Flags von `build-images`: `--dry-run` (nichts schreiben oder löschen), `--force` (Cache
ignorieren), `--only <slug>`, `--strict` (Warnungen als Fehler, für CI), `--source-dir <dir>`
(andere Content-Wurzel; die Ausgabe geht immer nach `public/img`).
`export-sources`: `--source-dir <dir>` (Originale, sonst `$PHOTO_SOURCE_DIR`),
`--map <json>`, `--out <dir>`, `--quality <1-100>`, `--only <slug>`, `--dry-run`,
`--force` (vorhandene Web-Quellen überschreiben; ohne das Flag bleiben sie stehen).
Beide Skripte kennen `--help`.

## Kernkonventionen

- **Der generierte Client-Index (`app/data/photos.index.json`) ist die einzige Datenquelle
  des Frontends.** Kein direkter Dateisystem-Zugriff aus Komponenten. Bild-URLs stehen
  nicht darin, sondern folgen der Konvention `/img/<slug>/<breite>.<endung>`
  (`shared/constants/images.ts`).
- **Dateiname = Slug = URL** (`/photo/<slug>`): englisch, kleingeschrieben, kebab-case,
  ASCII. Slugs sind nach dem Deploy unveränderlich — sie werden in Phase 2 Produkt-URLs.
- **Content kommt aus dem privaten Submodule `content/`** (`content/photos/source|meta`).
  Fehlt es (fremder Clone ohne Zugriff), greift der Fallback auf `demo-content/`.
  Der Build darf dadurch **nie** fehlschlagen.
- **Reine Logik gehört nach `shared/utils/`** (`photos.ts`, `img.ts`, `tags.ts`): Nuxt
  importiert von dort — und aus `shared/types/` — automatisch, die Build-Skripte greifen
  mit relativem Pfad auf dieselben Dateien zu. Nur die oberste Ebene wird
  auto-importiert; die Tests liegen deshalb in `shared/utils/__tests__/`.
- **Der Tag-Filter ist eine Pfadroute** (`/gallery/sailing`), nicht `?tag=`; der
  Sidebar-Inhalt kommt aus `definePageMeta({ aside })`, nicht aus einem Teleport oder
  Store. Begründungen in `docs/architecture.md`, Abschnitt „Frontend".
- **Zweisprachig: Englisch primär, Deutsch unter `/de` mit denselben Pfadsegmenten.** UI-Texte
  stehen in `app/i18n/{en,de}.json` und werden über `useI18n()` geholt — kein Klartext in
  Komponenten. Links immer über `path('/gallery')`, damit sie in der aktuellen Sprache
  bleiben. Foto-Titel kommen aus dem Index (`photoTitle`/`photoAlt`), nicht aus dem
  Wörterbuch. Abschnitt „Internationalisation" in `docs/architecture.md`.
- Keine Farbwerte hart in Vue-Dateien — nur Tokens aus `tokens.css` (die einzige
  Farbkorrektur steht im Projekt-Block dort).
- **`AGENTS.md` vor jeder Änderung lesen.**

## Harte Regeln (PLAN.md §9)

- `public/img/`, `photos.manifest.json`, `app/data/` und `.image-cache/` niemals committen.
- Bilder niemals hochskalieren.
- Niemals EXIF/Metadaten in ausgelieferte Bilder schreiben.
- Slugs nach dem Deploy nie ändern.
- Keine Vollauflösungs-Dateien ins Repo oder auf den Server (Quellen max. 2560 px);
  die Originale liegen außerhalb jedes Repositorys und werden nur gelesen.
- Keine externen Tracker, kein Analytics, keine Cookies (daher kein Banner).
- Keine schweren Dependencies ohne Not; jede neue Dependency in `docs/architecture.md`
  begründen.
- Secrets nur in `.env` / Coolify-Env, nie im Repo.
- In Phase 1 **nicht** bauen: Shop/Checkout, Blog, Kommentare, Newsletter, CMS, Auth.
- Nicht ohne Rückfrage: Domainkauf, Coolify-Deploy, Löschen von Nutzerdaten, Force-Push.

## Arbeitsweise

- Umsetzung in Arbeitspaketen laut `WORKPLAN.md` (P1–P9), ein Commit je Paket
  (`feat(Pn): …`, im privaten Repo `content: …`).
- Nach jedem Paket ein Eintrag in `content/SUMMARY.md` (privat): Erledigt /
  Entscheidungen / Offen. Offene Fragen zusätzlich nach `content/OFFEN.md`.
- Größere Coding-Aufgaben an einen Opus-Subagenten delegieren.
- Vor und nach Entscheidungen von Tragweite ein Tribunal (Gegenprüfung) durchführen.
- Abweichungen vom Plan sind erlaubt, wenn technisch begründet — dann aber mit
  Begründung in `docs/architecture.md` dokumentieren.
- Öffentliche Artefakte (Repo-Dateien, Commit-Messages, PRs): **Mechanismus, kein
  Inventar.** Operatives und Persönliches gehört ins private Repo.

## Weiterführend

- `docs/architecture.md` — Stack-Entscheidungen, Abweichungen, Bild-Pipeline, Datenmodell,
  Phase-2-Vorgriff.
- `PLAN.md` — Gesamtplan; **§13** enthält die verbindlichen Entscheidungen vom 2026-08-29
  (Name/Marke, Nuxt 4, Design-Handoff 1C, Bild-Quellen).
- `content/CLAUDE.md` — Namenskonvention und YAML-Schema des privaten Content-Repos.
