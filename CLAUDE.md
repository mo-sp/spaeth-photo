# spaeth-photo — CLAUDE.md

Statische Foto-Portfolio-Website (Hobby-Fotografie: Tiere, Natur, Landschaft, Segeln).
Phase 1 ist reine Präsentation; Phase 2 (Print-Verkauf) wird nur strukturell vorbereitet,
aber **nicht** gebaut. Die Seite ist zugleich Entwickler-Showcase: sauberer Code, gute
Doku und messbare Performance sind Teil des Ziels.

## Stack

- Nuxt 4 + TypeScript, Rendering SSG über `nuxt generate` (Output `.output/public`).
- pnpm, Node ≥ 22 (`.nvmrc`: 24).
- Eigenes CSS mit Custom Properties (`app/assets/css/tokens.css`). Kein Tailwind, kein UI-Framework.
- Bildverarbeitung: eigenes Sharp-Prebuild-Skript (`scripts/build-images.ts`), kein @nuxt/image.
- Schriften Archivo und JetBrains Mono selbst gehostet in `public/fonts/`.

## Kommandos

| Befehl                        | Wirkung                                               |
| ----------------------------- | ----------------------------------------------------- |
| `pnpm dev`                    | Dev-Server                                            |
| `pnpm build-images`           | Bild-Varianten + `photos.manifest.json` erzeugen (P3) |
| `pnpm generate`               | statische Seite bauen                                 |
| `pnpm build`                  | `build-images` + `generate` (Coolify-Build-Befehl)    |
| `pnpm preview`                | gebaute Seite lokal ansehen                           |
| `pnpm lint` / `pnpm lint:fix` | ESLint (Flat Config über @nuxt/eslint)                |
| `pnpm typecheck`              | `nuxt typecheck` (vue-tsc)                            |

## Kernkonventionen

- **`photos.manifest.json` ist die einzige Datenquelle des Frontends.** Kein direkter
  Dateisystem-Zugriff aus Komponenten.
- **Dateiname = Slug = URL** (`/foto/<slug>`): kleingeschrieben, kebab-case, ASCII
  (`ae/oe/ue/ss`). Slugs sind nach dem Deploy unveränderlich — sie werden in Phase 2
  Produkt-URLs.
- **Content kommt aus dem privaten Submodule `content/`** (`content/photos/source|meta`).
  Fehlt es (fremder Clone ohne Zugriff), greift der Fallback auf `demo-content/`.
  Der Build darf dadurch **nie** fehlschlagen.
- Alle UI-Texte auf Deutsch. Keine Farbwerte hart in Vue-Dateien — nur Tokens aus
  `tokens.css`.

## Harte Regeln (PLAN.md §9)

- `public/img/` und `photos.manifest.json` niemals committen.
- Bilder niemals hochskalieren.
- Niemals EXIF/Metadaten in ausgelieferte Bilder schreiben.
- Slugs nach dem Deploy nie ändern.
- Keine Vollauflösungs-Dateien ins Repo oder auf den Server (Quellen max. 2560 px).
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
