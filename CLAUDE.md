# spaeth-photo — CLAUDE.md

Static photo-portfolio site (hobby photography: animals, nature, landscape, sailing).
Phase 1 is presentation only; phase 2 (print sales) is prepared structurally but **not**
built. The site doubles as a developer showcase: clean code, good docs and measurable
performance are part of the goal.

## Stack

- Nuxt 4 + TypeScript, rendered statically via `nuxt generate` (output `.output/public`).
- pnpm, Node ≥ 24 (`.nvmrc`). `scripts/` runs without a runner — Node strips the types
  itself, and `tsconfig.scripts.json` enforces `erasableSyntaxOnly` for that.
- Own CSS with custom properties (`app/assets/css/tokens.css`). No Tailwind, no UI kit.
- Image processing: own sharp scripts (`export-sources.ts`, `build-images.ts`), not
  `@nuxt/image`. Tests with vitest.
- Archivo and JetBrains Mono self-hosted in `public/fonts/`, subset from
  `scripts/fonts-src/` (`scripts/subset-fonts.sh`, 114 → 55 KB).
- `sitemap.xml` and `robots.txt` are Nitro routes under `server/routes/`, not static files:
  both need the absolute site URL from `NUXT_PUBLIC_SITE_URL` (a build variable).

## Commands

| Command                       | Effect                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                    | dev server (`predev` renders the images first; cached run ~40 ms) |
| `pnpm export-sources`         | originals → web sources + YAML in the content repo (see below)    |
| `pnpm build-images`           | image variants, `photos.manifest.json`, client index              |
| `pnpm encode-video`           | start-page clip → renditions + poster in the content repo         |
| `pnpm check-manifest`         | validates the generated manifest (the CI gate)                    |
| `pnpm generate`               | builds the static site                                            |
| `pnpm build`                  | `build-images` + `generate` (the host's build command)            |
| `pnpm preview`                | serves the built site locally                                     |
| `pnpm lint` / `pnpm lint:fix` | ESLint (flat config via `@nuxt/eslint`) + `prettier --check`      |
| `pnpm typecheck`              | `nuxt typecheck` + `tsc -p tsconfig.scripts.json` (renders first) |
| `pnpm test`                   | vitest, unit tests only (< 1 s)                                   |
| `pnpm test:integration`       | colour regression test of the pipeline (encodes real images)      |
| `scripts/subset-fonts.sh`     | re-subset the fonts (`--check` verifies without writing)          |

`build-images` flags: `--dry-run`, `--force`, `--only <slug>`, `--strict` (warnings are
errors, for CI), `--source-dir <dir>` (output always goes to `public/img`).
`export-sources`: `--source-dir` (else `$PHOTO_SOURCE_DIR`), `--map`, `--out`,
`--quality`, `--only`, `--dry-run`, `--force` (without it, existing web sources stay).
`encode-video`: `--source <file>` (relative to `$VIDEO_SOURCE_DIR`), `--slug`, `--out`,
`--start`, `--duration`, `--poster`, `--ffmpeg`, `--dry-run`, `--force`.
All three know `--help`.

## Core conventions

- **The generated client index (`app/data/photos.index.json`) is the front end's only data
  source.** No file-system access from components. Image URLs are not in it: they follow
  the convention `/img/<slug>/<width>.<ext>` (`shared/constants/images.ts`).
- **File name = slug = URL** (`/photo/<slug>`): English, lowercase, kebab-case, ASCII.
  Slugs are immutable after a deploy — they become product URLs in phase 2.
- **Content comes from the private submodule `content/`** (`photos/source|meta`); without
  it the fallback is `demo-content/`, and the build must **never** fail because of that.
- **Pure logic belongs in `shared/utils/`** (`photos`, `img`, `tags`, `i18n`, `sitemap`,
  `legacy`, `url`): Nuxt auto-imports from there and from `shared/types/`, the build scripts
  reach the same files by relative path. Only the top level is auto-imported, so tests live
  in `shared/utils/__tests__/` (and, for app-side derivations, `app/**/__tests__/`).
- **The tag filter is a path route** (`/gallery/sailing`), not `?tag=`; sidebar content
  comes from `definePageMeta({ aside })`, not a teleport or a store (see "Frontend").
- **Bilingual: English primary, German under `/de`, same path segments.** UI strings live
  in `app/i18n/{en,de}.json`, read through `useI18n()` — no plain text in components. Link
  through `path('/gallery')` so links stay in the current language; photo titles come from
  the index (`photoTitle`/`photoAlt`). See "Internationalisation".
- **The start-page clip follows the same rules as the photographs**: renditions in the
  private `content/video/<slug>/`, served from `/video/<slug>/…` by convention
  (`shared/utils/video.ts`), never in this repo, and absent without the submodule — in
  which case the home page falls back to its hero photograph.
- **Theme**: `data-theme` on `<html>`, the choice in `localStorage` (never a cookie),
  default from `prefers-color-scheme`. The one inline head script
  (`shared/utils/theme.ts`) applies it before the first paint and marks the intro.
- No colour values hard-coded in Vue files — only tokens from `tokens.css` (the one colour
  correction lives in the project block there; the light palette is a P11 placeholder).
- **Read `AGENTS.md` before every change.**

## Hard rules

- Never commit `public/img/`, `public/video/`, `photos.manifest.json`, `app/data/` or
  `.image-cache/`.
- Never upscale an image.
- Never write EXIF or other metadata into a delivered image.
- Never change a slug after the deploy.
- No full-resolution files in the repo or on the server (web sources max 2560 px); the
  originals — photographs and video clips alike — live outside every repo and are only
  ever read.
- No external trackers, no analytics, no cookies (hence no banner).
- No heavy dependencies without need; justify every new one in `docs/architecture.md`.
- Secrets only in `.env` or the host's environment, never in the repo.
- **Not** to be built in phase 1: shop/checkout, blog, comments, newsletter, CMS, auth.
- Not without asking: buying a domain, deploying, deleting user data, force-pushing.

## Way of working

- One commit per work package (`feat(Pn): …`, `fix(Pn): …`), Conventional style, subject
  ≤ 72 characters. Work goes through pull requests against `main`.
- Deviating from a documented decision is allowed when justified — record the reason in
  `docs/architecture.md`.
- Public artefacts (repo files, commit messages, PRs): **mechanism, not inventory.**
  Operational and personal detail belongs in the private content repo.
- Language: English everywhere in this repo. German remains only in the UI strings of
  `de.json`, the `*De.vue` page bodies and quoted German UI examples.
- The owner's session workflow (planning documents, session log, open questions) lives in
  the private repo and in the gitignored `CLAUDE.local.md`.

## Further reading

- `README.md` — what the site is, quick start, structure, deployment.
- `docs/architecture.md` — the plan and its binding decisions, stack decisions,
  deviations, pipeline, data model, phase 2.
- `content/CLAUDE.md` — naming convention and YAML schema of the private content repo.
