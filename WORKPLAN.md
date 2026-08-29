# WORKPLAN.md — Paketplan Session 1 (2026-08-29)

Regel: Nach jedem Paket ein Eintrag in `content/SUMMARY.md` (privat) unter „Session 1 — Paket Pn“:
Erledigt / Entscheidungen / Offen. Offene Fragen an Moritz zusätzlich nach `content/OFFEN.md`.
Commit je Paket (public: `feat(Pn): …`, private: `content: …`). Kein Force-Push.

| Paket | Inhalt | Fertig wenn |
|---|---|---|
| **P1 Fundament** | gh-Repos `spaeth-photo` (public, MIT) + `spaeth-photo-content` (private); Submodule `content/`; `.gitignore`; Nuxt 4 + TS + pnpm; ESLint/Prettier; `.nvmrc`; tokens.css + Fonts (woff2 selbst gehostet); CLAUDE.md beider Repos; WORKPLAN.md + OFFEN.md an ihren Ort verschoben | `pnpm dev` zeigt leere Seite mit Tokens; beide Repos gepusht |
| **P2 Quellen** | `scripts/export-sources.ts` (Originale → 2560 px sRGB EXIF-frei + YAML aus EXIF/photos.json); 26 Bilder exportiert ins private Repo; 3 Demo-Bilder mit freier Lizenz + `demo-content/LICENSES.md` | `content/photos/source|meta` vollständig; Demo-Fallback vorhanden |
| **P3 Pipeline** | `scripts/build-images.ts`: Varianten AVIF/WebP/JPEG, LQIP, Manifest, zod-Validierung, Hash-Cache, Orphan-Cleanup, Demo-Fallback; npm-Scripts verkettet | `pnpm build-images` idempotent, Manifest valide, 2. Lauf rendert nichts neu |
| **P4 Galerie** | `<PhotoImage>`, Layout mit Sidebar (Wortmarke, Nav, Fußzeile Koordinaten), `/galerie` Masonry, Tag-Filter (`?tag=`), Lightbox (Pfeile/Esc) | Galerie pixelnah zur Spec 1C, Filter per URL |
| **P5 Detail** | `/foto/[slug]` mit Sidebar-Metadaten, Prev/Next in gefilterter Liste, Zähler `03 / 14` | Navigation zyklisch, Tag-Kontext bleibt erhalten |
| **P6 Seiten** | Startseite (Hero eager + „Licht / Schatten“-Dualität typografisch + Auswahl-Raster), `/ueber`, `/impressum`, `/datenschutz` (TODO-Platzhalter) | alle Routen generierbar |
| **P7 SEO/Perf** | Title/Meta, OG-Bild je Foto, sitemap.xml, Responsive-Regeln aus Spec, Lighthouse lokal (Ziel ≥95 Performance) | Lighthouse-Werte in SUMMARY.md |
| **P8 Doku** | docs/architecture.md (inkl. Phase-2-Vorgriff, Abweichungen), README mit Coolify-Anleitung, CLAUDE.md final (<100 Zeilen) | fremder Clone ohne Submodule baut mit Demo-Content |
| **P9 Abschluss** | Session-Protokoll final, OFFEN.md konsolidiert, Memory aktualisiert | — |

Zeitliche Erwartung: P1–P3 sind die Basis, P4–P6 der sichtbare Teil. Bei Blockern: Paket überspringen, in OFFEN.md eintragen, mit dem nächsten unabhängigen Paket weitermachen.
