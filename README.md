# spaeth-photo

[![CI](https://github.com/mo-sp/spaeth-photo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mo-sp/spaeth-photo/actions/workflows/ci.yml)

A static photo portfolio: animals, nature, landscape and sailing, photographed around
Wedel on the Elbe. Bilingual — English at the root, German under `/de` — with no
trackers, no analytics and no cookies, which is why there is no consent banner.

The site is also the exercise it looks like: hand-written CSS against a design handoff,
an image pipeline built on sharp rather than a plugin, and generated data as the single
source of truth for the front end. The reasoning behind each of those is in
[`docs/architecture.md`](docs/architecture.md).

## Stack

- **Nuxt 4** + TypeScript, rendered statically with `nuxt generate` (output `.output/public`).
- **pnpm**, Node ≥ 24 (`.nvmrc`). The build scripts run without a runner: Node strips the
  types itself (`node scripts/build-images.ts`).
- **Own CSS** with custom properties (`app/assets/css/tokens.css`). No Tailwind, no UI kit.
- **Own image pipeline** on sharp (`scripts/`), not `@nuxt/image`.
- **Self-hosted fonts**, subset from the originals: Archivo and JetBrains Mono, 114 → 55 KB.
- **vitest** for the pure logic and the pipeline library.

Seven runtime dependencies, four of them chosen: sharp, zod, yaml and exif-reader. The other
three — nuxt, vue and vue-router — are the framework decision itself. Each is justified in
`docs/architecture.md`.

## Quick start

```sh
git clone https://github.com/mo-sp/spaeth-photo.git
cd spaeth-photo
pnpm install
pnpm build      # renders the image variants, then generates the site
pnpm preview    # serves the result on http://localhost:3000
```

The photographs live in a **private submodule** (`content/`). A clone without access to it
falls back to `demo-content/` automatically, and the build must never fail because of it —
CI checks out _without_ submodules for exactly that reason. What you get is the real site
with three freely licensed placeholder images.

## Commands

| Command                       | Effect                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                    | dev server (`predev` renders the images first; cached run ~40 ms)   |
| `pnpm export-sources`         | originals → web sources + YAML in the content repo                  |
| `pnpm build-images`           | image variants, `photos.manifest.json`, client index                |
| `pnpm encode-video`           | start-page clip → renditions + poster in the content repo           |
| `pnpm check-manifest`         | validates the generated manifest (the CI gate)                      |
| `pnpm generate`               | builds the static site                                              |
| `pnpm build`                  | `build-images` + `generate` — the host's build command              |
| `pnpm preview`                | serves the built site locally                                       |
| `pnpm lint` / `pnpm lint:fix` | ESLint (flat config via `@nuxt/eslint`) + `prettier --check`        |
| `pnpm typecheck`              | `nuxt typecheck` plus `tsc -p tsconfig.scripts.json`                |
| `pnpm test`                   | vitest, unit tests only (< 1 s)                                     |
| `pnpm test:integration`       | colour regression test of the pipeline (encodes real images)        |
| `scripts/subset-fonts.sh`     | re-subset the fonts (only when the character set or weights change) |

`build-images` takes `--dry-run`, `--force`, `--only <slug>`, `--strict` and
`--source-dir <dir>`; `export-sources` takes `--source-dir`, `--map`, `--out`,
`--quality`, `--only`, `--dry-run` and `--force`; `encode-video` takes `--source <file>`,
`--slug`, `--out`, `--start`, `--duration`, `--poster`, `--ffmpeg`, `--dry-run` and
`--force`. All three know `--help`.

## Project structure

```
app/            Nuxt app: pages, components, composables, CSS tokens, i18n dictionaries
shared/         pure logic and types, auto-imported by Nuxt and read by the build scripts
scripts/        the image pipeline (export-sources, build-images, check-manifest),
                the video encoder (encode-video) + lib/
server/routes/  sitemap.xml and robots.txt as Nitro routes, not static files
public/         served as-is: the subset fonts; the generated image variants land here
tests/          unit tests for the pipeline library, plus the colour integration test
demo-content/   three freely licensed photos, the fallback when content/ is absent
content/        private submodule: the photographs, their YAML metadata, the start-page clip
docs/           architecture and decisions
```

## Image pipeline

`export-sources` runs by hand and turns the originals — full resolution, with EXIF, stored
outside every repository — into 2560 px sRGB web sources plus a YAML metadata file, both in
the private content repo. Nothing is ever overwritten without `--force`.

`build-images` runs during the build and turns each web source into AVIF, WebP and JPEG at
480/960/1600/2560 px (portraits get their native width as the top step), an LQIP data URI,
an average colour and a 1200×630 OpenGraph crop. It writes `photos.manifest.json` and the
slim client index `app/data/photos.index.json`; both are generated and gitignored.

A SHA-256 cache keyed on the source file and the render settings makes a second run render
nothing, and a change to a YAML file rewrites the manifest without re-encoding a single
image. Orphaned outputs are cleaned up — but only after a complete, error-free run.

Image URLs are never stored: they follow the convention `/img/<slug>/<width>.<ext>`, so the
index only records which widths exist per format. **File name = slug = URL**, and slugs are
immutable after a deploy.

## Start page

A first visit opens on an intro overlay: the wordmark, then the background clip, then
"Light / Shadow" as the choice between the dark and the light theme. The choice lives in
`localStorage` (never a cookie), so everyone who has chosen once lands straight on the
page; a deep link never shows the intro. The page itself is in the prerendered HTML the
whole time — the overlay only stops it being painted — so crawlers and readers without
JavaScript get the plain page.

`encode-video` writes the renditions (1080p/720p H.264, 720p VP9, poster) into
`content/video/<slug>/`, from a source clip that lives outside every repository. Nitro
serves that directory as `/video/…` and copies it into the build; without the private
content repo there is no clip and the home page keeps its hero photograph. Reduced motion
and a data saver get the poster frame and no video bytes. Details, and the two open design
questions, in `docs/architecture.md`.

## Internationalisation

English is primary and unprefixed; German lives under `/de` with the same path segments.
The second route tree is cloned from the resolved English pages in `pages:extend`, so each
page is written once and rendered twice, and both trees prerender.

UI strings live in `app/i18n/{en,de}.json` and are read through `useI18n()` — no plain text
in components. Photo titles come from the index, not the dictionary. Every internal link
goes through `path('/gallery')` so it stays in the current language.

## Testing and CI

`pnpm test` runs the unit tests (the pipeline library and the pure front-end derivations) in
under a second. `pnpm test:integration` encodes real images to prove the pipeline passes
sRGB values through untouched and writes no metadata.

CI runs lint, tests, typecheck, `build-images --strict`, `check-manifest` and `generate` on
every push to `main` and on every pull request — deliberately **without** the private
submodule, so every run also proves that a foreign clone builds.

## Deployment on Coolify

The site is a **static site**: there is no Node process to run in production.

| Setting           | Value              |
| ----------------- | ------------------ |
| Build command     | `pnpm build`       |
| Publish directory | `.output/public`   |
| Node version      | 24 (from `.nvmrc`) |
| 404 document      | `404.html`         |

**`NUXT_PUBLIC_SITE_URL` must be a build variable, not a runtime one.** `nuxt generate`
bakes it into the HTML, and there is no server afterwards to substitute anything. Set it to
the absolute base URL without a trailing slash (in Coolify: Environment Variables, with
"Build Variable" ticked). Unset, the site still builds — URLs stay relative, the sitemap is
emitted empty with a warning, and `robots.txt` omits its `Sitemap:` line. See
`.env.example`.

**Private submodule.** To build with the real photographs the deploy needs read access to
the `spaeth-photo-content` repository: create a deploy key for it, register the public half
as a read-only deploy key on that repository, give the private half to the build
environment as its SSH key, and enable submodule checkout (recursive) for the build.
Without any of that the build still succeeds on the demo content — so a failed submodule
fetch is silent, and the way to notice is `pnpm check-manifest --expect-mode content`.

**First build takes roughly six minutes**, almost all of it rendering image variants.
Subsequent builds are fast only if state survives between them: persist `.image-cache/` and
`public/img/` across builds (Coolify: a persistent volume or a build cache mount on those
two paths). With a warm cache a build with no new photographs renders nothing.

**Cache headers.** Everything under `/_nuxt/`, `/fonts/` and `/img/` is content-addressed or
immutable by convention; the HTML must not be, because the asset URLs inside it change with
every build:

```
/_nuxt/*        Cache-Control: public, max-age=31536000, immutable
/fonts/*        Cache-Control: public, max-age=31536000, immutable
/img/*          Cache-Control: public, max-age=31536000, immutable
*.html          Cache-Control: public, max-age=0, must-revalidate
/sitemap.xml    Cache-Control: public, max-age=3600
/robots.txt     Cache-Control: public, max-age=3600
```

## Licence

The **code** is MIT — see [`LICENSE`](LICENSE).

The **photographs are not**. Every image under `content/` and everything rendered from it
into `public/img/` is © Moritz Späth, all rights reserved: no reuse, redistribution or
derivative works without written permission. The MIT licence covers this repository's
source code and nothing else.

The three demo photographs under `demo-content/` are third-party images under their own
free licences, listed with attribution in
[`demo-content/LICENSES.md`](demo-content/LICENSES.md). The two typefaces are under the SIL
Open Font License 1.1, reproduced in
[`public/fonts/LICENSE-OFL.txt`](public/fonts/LICENSE-OFL.txt).
