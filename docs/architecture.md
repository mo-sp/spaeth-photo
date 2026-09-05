# Architecture & decisions

This is where the decisions live, with their reasoning — the plan the site was built from,
and in particular every deviation from it. Guiding rule for this public repo: describe the
mechanism, never an inventory of hosts, scripts or people.

## Stack decisions

- **SSG instead of SSR.** Phase 1 is pure presentation; a static directory is cheaper,
  faster and safer to operate. `nuxt generate` with `nitro.prerender.crawlLinks` prerenders
  every route reachable through the navigation; the output is `.output/public`. `ssr: true`
  stays on, because prerendering requires it — and because it keeps a hybrid setup (static
  plus Nitro routes) available later without a rebuild, which is what phase 2 needs.
- **Own sharp script instead of @nuxt/image.** @nuxt/image's prerendering in SSG mode is
  unreliable; a dedicated prebuild script generates the variants deterministically before
  the generate step and drops them as plain static files.
- **Generated data as the single source of truth.** The build produces the complete
  `photos.manifest.json` and, from it, the slim client index `app/data/photos.index.json`.
  The frontend reads the index only; components never touch the file system. That keeps a
  change of rendering mode open and makes the data testable. Details under "Data model".
- **Two repos, photos as a submodule.** The code is MIT and public; the photos are not. The
  split between code and rights is therefore structural rather than merely an agreement. A
  foreign clone without submodule access builds through the demo fallback.
- **No Tailwind, no UI framework.** The site is small and the images dominate; the design
  tokens from the handoff live as CSS custom properties in one file and are the binding
  source.
- **Toolchain postinstalls allowed.** `pnpm-workspace.yaml` permits the native postinstall
  scripts of `esbuild` and `unrs-resolver` (parts of the Nuxt and ESLint toolchains
  respectively). Without that allowance the platform-specific binary is missing and the
  build fails — which matters for the host's build environment too.

## Dependencies, and why

Every dependency costs attack surface, updates and reading time. `package.json` lists seven
runtime dependencies, but only four of them were chosen: `nuxt`, `vue` and `vue-router` are
the framework decision itself, declared explicitly rather than relied on transitively. The
four chosen ones, plus the two development dependencies that are not toolchain, earn their
place like this:

- **sharp** (runtime) — the image processing itself, bound to libvips. Without it there
  would be no project; a pure-JavaScript alternative would be orders of magnitude slower.
  It sits under `dependencies` rather than `devDependencies` on purpose, because
  `build-images` is part of the build command.
- **zod** (runtime) — validation of the YAML metadata and of the generated artefacts
  against a schema that also pins the TypeScript types. Hand-written checks would be longer
  and would drift away from the types.
- **yaml** (runtime) — parses the metadata files. They are written by hand, because field
  order and spelling are part of the convention; parsing is the part one does not write
  oneself.
- **exif-reader** (runtime) — reads the EXIF block that sharp hands over as a raw buffer.
  Small, no dependencies of its own, exactly one job.
- **vitest** (development) — the test runner. It shares the Vite toolchain with Nuxt, so it
  brings no second transformation chain into the project.
- **@types/node** (development) — type declarations only; without them `tsc` cannot check
  the Node scripts. No runtime footprint.

Deliberately **not** added: a CLI framework (`node:util.parseArgs` is enough for a dozen
flags), a colour library (`node:util.styleText` works out for itself whether the target
stream can do colour) and a TypeScript runner — see below.

## The plan

The site was planned in one session on 2026-08-29 and built in nine work packages
(sources, pipeline, gallery, detail page, pages, SEO, internationalisation, documentation,
wrap-up). The planning documents themselves are working notes and live in the private
content repo; what they decided is recorded here, because the deviations below refer to it.

**Goal.** A personal photo portfolio (animals, nature, landscape, sailing — no people).
Phase 1 is presentation only; phase 2 (fine-art prints via a print-on-demand API and Stripe
Checkout) is prepared structurally — data model, stable URLs, a switchable rendering mode —
but not built. The site doubles as a developer showcase, so clean code, documentation and
measured performance are part of the goal.

**Stack as planned.** Nuxt 3 + TypeScript, statically generated; own prebuild script with
sharp instead of `@nuxt/image`; hand-written CSS with custom properties as design tokens;
two repositories, the photos as a private submodule; Coolify as the static-site host.
The design integration was planned as a follow-up session with a neutral placeholder theme
until then.

**Binding decisions of 2026-08-29.**

- Wordmark "MORITZ / SPÄTH", ASCII spelling `spaeth` everywhere else. Theme "Licht /
  Schatten" as a typographic duality in the home-page hero, not in the sidebar. Sidebar
  footer with the place name and coordinates.
- Design handoff "1C full-bleed" integrated immediately: sidebar layout (220 px), tokens
  adopted unchanged, fonts Archivo and JetBrains Mono self-hosted as woff2.
- Originals live outside every repository and are only ever read (`$PHOTO_SOURCE_DIR`). A
  generic export script reads their EXIF, writes 2560 px sRGB web sources without metadata
  into the private repo and creates the YAML side files. The public repo carries three
  freely licensed demo images so that a clone without the submodule still builds.
- English is the primary language, German the translation under `/de` with the same English
  path segments; `x-default` points to English. Slugs and tag keys are English. Pages that
  still carry `TODO:` placeholders are `noindex` and stay out of the sitemap. The Impressum
  stays German (§ 5 DDG).
- Not without asking first: buying a domain, deploying, deleting user data, force-pushing.

## Deviations from the plan

- **Nuxt 4 instead of Nuxt 3.** Nuxt 4 is the current major version, brings
  the `app/` directory layout and the same SSG capabilities. For a new project there is no
  reason to start on the previous version.
- **Self-hosted fonts instead of Google Fonts** (recommendation of the design handoff). The
  woff2 files live in `public/fonts/`, wired up through our own `@font-face` rules. That
  way a page view makes no request to a third party — which is data protection (no IP
  leaking out, consistent with "no trackers, no cookies") and at the same time faster,
  because a connection to a foreign domain is avoided. Google ships variable fonts for both
  families: one file per family and style covering the whole weight range, instead of one
  file per cut. The `@font-face` rules therefore state the range as `font-weight: 400 600`.
  Licence of both families: SIL OFL 1.1, recorded in `public/fonts/LICENSE-OFL.txt`.
- **Repo name ≠ domain.** The repo is called `spaeth-photo`; `spaeth-photo.de` is already
  taken, so the domain will be a different one. The repo name is deliberately not a brand
  promise, and the site carries its name in its content, not in the repository URL.
- **Design integration right away instead of in a follow-up session.** The
  handoff was available from the start; the tokens are adopted unchanged, extended only by
  the responsive overrides the handoff recommends.
- **Node 24 runs the build scripts, `tsx` is gone.** Since version 22 Node
  strips TypeScript types itself and runs `node scripts/build-images.ts` directly; from 24
  on that is the default path. An additional runner in the build is therefore redundant.
  Node only _strips_ types, it transforms nothing — which is why `tsconfig.scripts.json`
  sets `erasableSyntaxOnly` and forbids exactly the constructs (`enum`, parameter
  properties) that would need a real transformation. `engines.node` is set to `>= 24`
  accordingly.
- **The demo content is exported at lower quality** than the private web sources (q82
  instead of q95). It is not an archive but the proof that a clone without access to the
  private submodule builds through; q95 would have parked 4.4 MB instead of 1.8 MB in this
  repo permanently.
- **The colour regression test allows three steps of deviation per channel** instead of
  exact equality. Lossy encoders round: pure red comes back out of AVIF as 254 rather
  than 255. A wrong colour space conversion would be dozens of steps off, so the test stays
  sharp enough.
- **The handoff palette is extended by a second theme.** The tokens of handoff 1C are
  binding and unchanged, but the handoff describes one palette and P12's start page turns
  "Light / Shadow" into a switch between two. The light values are therefore an addition,
  marked as a placeholder in `tokens.css`: same hues, same roles, contrast checked against
  the light background (text 16.2:1, muted 5.9:1, faint 4.7:1), and photographs are never
  filtered — only the surface around them changes. P11 designs the light mode properly.
- **One inline script in `<head>`.** The site otherwise ships no inline script. A stored
  theme has to be on the document before the first paint, and on a prerendered page no
  component can do that: by the time Vue hydrates, the other palette has already been on
  screen. The script (`shared/utils/theme.ts`, one expression, no dependencies) applies the
  stored theme, marks the intro as pending and arms the failsafe that lifts it again.
- **Prettier and ESLint share the responsibility.** Prettier formats, ESLint checks. Where
  both claimed the same spot (`vue/html-self-closing`), the ESLint rule is switched off;
  the `tokens.css` adopted from the handoff is excluded from Prettier so that it matches
  the original 1:1.

## Image pipeline

Two scripts, cleanly separated. `export-sources` is run by hand and turns the originals
(full resolution, with EXIF, outside any repository) into the web sources of the content
repo. `build-images` runs during the build and turns those into the delivery variants under
`public/img/`. All the numbers below are measured against this project's own set
(26 photos, sharp 0.35 / libvips 8.18).

**Existing web sources are never overwritten unasked.** `export-sources` treats the web
source like the YAML file: if it exists, it is skipped and reported as
"skipped, exists". Only `--force` writes it again. The source is the template
for every variant and may have been retouched by hand; a second run with a different
`--quality` would otherwise silently discard that work.

**The web source is an archive, not a delivery format.** 2560 px on the long edge, JPEG
q95, and explicitly `chromaSubsampling: 4:4:4`. 4:2:0 throws away three quarters of the
colour resolution before the actual encoder even starts; that loss is inherited by every
AVIF and WebP step and cannot be recovered. As the only file in the project the web source
carries an ICC profile (`withIccProfile('srgb')`) — an archive should describe itself.

**4:4:4 in the variants too.** With AVIF, full colour resolution costs about 4 % in file
size compared to 4:2:0 (104.9 instead of 100.7 KB in the 1600 step of a typical photo). In
return, saturated edges — rigging against the sky, reeds backlit — stay free of colour
fringes. Four percent is worth the price; visible artefacts on a photography site are not.

**AVIF at 10 bit colour depth.** That is not a surcharge but a discount: the same step
measures 104.9 KB with `bitdepth: 10` and 110.0 KB at 8 bit. The encoder computes at higher
precision internally anyway; 10 bit additionally avoids the banding in soft gradients
(morning sky, fog) that becomes visible at 8 bit.

**AVIF with `effort: 3`.** Between level 3 and level 6 lie 1.6 % of file size
(104.9 against 103.2 KB) and a factor of 12 in compute time (1.8 against 22.2 seconds for a
single image at a single step). At 26 photos times four steps, level 6 would be the
difference between six minutes and over an hour of build time. WebP sits one step below the
maximum at `effort: 5` for the same reason.

**Quality ladder with a budget cap.** Every step starts at a fixed quality (AVIF 60/57/54/52
from 480 to 2560 px), and if the result busts a size budget, the quality drops in steps of
five down to a floor. The cap only bites on the images that are pathological for an
encoder — foliage, waves, noise in a night sky. The worst image in the set (fireworks over
trees) measures 372 KB with the cap in the 2560 step instead of 573 KB without it, a third
less; 11 of the 26 photos trigger it at all. The budgets are measured on a 3:2 landscape
and scaled by pixel count, otherwise the cap would fire on every portrait for no reason.

**No sharpening on the largest step.** Downscaling costs sharpness, and the more so the
stronger the reduction — which is why the 480 step is sharpened more heavily than the
1600 one. The largest generated step is displayed close to 1:1 on large screens; there,
sharpening only produces halos around edges.

**Native width as an additional step.** A portrait 2560 px high is only about 1707 px wide.
Without a special rule its largest delivered step would be 1600 px, and the detail page
would have to upscale. So the native source width is added as a step as soon as it exceeds
the last regular step by more than 32 px. The manifest records the widths actually generated
per photo — a `srcset` must never be built from the constant.

**LQIP: 20 px wide WebP plus average colour.** The base64 WebP measures about 190 bytes and
sits in the client index, that is, in the delivered JavaScript of every page the image
appears on. Below 20 px the preview loses its shape, above it the index grows noticeably.
In addition the average colour is in the index as hex: in the gallery a flat tile background
is calmer than twenty blur images flashing up at once, so the blur-up is reserved for the
hero and the detail page.

**Colour management with the default, not against it.** The pipeline deliberately sets no
`toColorspace`, no `keepMetadata`, no `withMetadata`. The web sources are sRGB, libvips
computes correctly internally, and the outputs stay profile-free — which every browser reads
as sRGB and which saves about 500 bytes per file. This is pinned down by a regression test
(`pnpm test:integration`): a test image of four colour patches, one of them a mid grey, has
to survive every format with a deviation of at most three steps per channel. A wrong colour
space conversion would be dozens of steps off, especially in the mid tones.

**OpenGraph image with `position: attention`.** The 1200×630 image is not cropped centrally
but onto the region with the highest saturation and edge density. With a horizon in the
lower third, a centred crop would otherwise catch nothing but sky.

**Incremental by content, not by timestamp.** The cache
(`.image-cache/manifest-cache.json`) remembers per photo the content hash of the source,
mtime and size as a fast path, plus a hash of the metadata. If mtime and size match, the
content is not read at all; if they differ, the hash decides — a fresh checkout sets new
timestamps without changing a file. If only the YAML file changes, the manifest is rewritten
but no image is re-encoded. Above all of it sits a hash of all render settings plus the
libvips version: if anything shifts there, everything is regenerated instead of two
configurations mixing in `public/img/`. Measured: first run 354 s for 26 photos and
286 files (32.9 MB), second run 37 ms.

**Cleanup is the most dangerous operation in the project** and is secured accordingly:
deletion happens exclusively below `public/img` (every path runs through `assertInside`),
exclusively in directories with a valid slug name, and exclusively for files whose name
matches the pattern of the generated variants. Everything else — `README.md`, `.gitkeep`,
symlinks, foreign folders — is reported and left alone. Without source images nothing is
cleaned up at all — an empty source directory is far more likely a configuration error than
an instruction to delete everything.

**Cleanup only happens after a complete, error-free run.** Deletion follows the run's target
state, and that state is incomplete in two cases even though the outputs on disk are valid.
**First, `--only`:** a partial run looks at one slug; all the others are only in the target
state if the cache knows them — with a cold cache, therefore, not at all. So a run with
`--only` does not clean up at all and says so in one line; the skipped slugs count as
untouched. **Second, errors:** a photo with a broken YAML file drops out of the target
state, and because of the error the run writes neither manifest nor index nor cache anyway —
in which case it must certainly not delete anything. The error path is never destructive. In
addition, the affected slugs are put on a protection list. **`--dry-run` goes through the
same decision logic as a real run** and only stops short of every write and delete: the
preview therefore shows the same verdicts and the same deletions the real run would perform.
The function itself lives in `scripts/lib/cleanup.ts` and is tested against a temporary
directory — a deletion path one cannot test is a deletion path one should not trust.

**JPEG floor: no photo without a `src`.** The JPEG fallback is generated at the 960 and 1600
steps. For a source below 960 px neither applies, and `variants.jpeg` would stay empty — a
browser without AVIF and WebP would then get no `src` in the `<img>` and show nothing. So in
that case the largest generated step up to 1600 px steps in as JPEG.

**Sequential, not parallel.** libvips already parallelises across all cores within a single
operation; additional parallelism at the image level buys almost no throughput but makes the
output unreadable and the memory requirement unpredictable.

## Data model

One `photos/meta/<slug>.yaml` per photo, validated against a zod schema at build time. A
missing title, an invalid date, an unknown tag or an unknown key are hard errors: a typo
should be noticed. An omission, by contrast, does no harm — everything except title and date
has a documented default. File name = slug = URL; slugs are immutable after the deploy,
because they become product URLs in phase 2.

**Two artefacts instead of one, both generated and gitignored.**
`photos.manifest.json` in the project root is complete: every written file with path,
dimensions and size, plus source dimensions and content hash. It is a build log — for
diagnosis, for the plausibility check in CI and for the cleanup.
`app/data/photos.index.json` is the part the frontend needs, and it is imported into the
bundle. For 26 photos that is 82 KB of manifest against 17 KB of index; the frontend should
not ship a build log.

**Image URLs are not in the index, they follow a convention:**
`/img/<slug>/<width>.<ext>`, plus `/img/<slug>/og.jpg`. The index records only the
widths actually generated per format (`variants: { avif: [...], webp: [...], jpeg: [...] }`).
Compared with spelled-out paths this saves the bulk of the bytes and makes a rename a change
in exactly one place (`shared/constants/images.ts`).

**Types and schema pin each other.** `shared/types/photo.ts` contains types only and is
imported by the build scripts as well as the frontend. The zod schemas in
`scripts/lib/schema.ts` are bound to it bidirectionally via an `AssertExact` helper: change
only one side and you get a type error, instead of the compile-time and runtime models
quietly drifting apart.

**Sorting: date descending, slug ascending on a tie.** The second key is not a matter of
taste but of determinism — a gallery that reorders itself between two deploys looks like a
bug.

**Hero rule.** Exactly one photo carries `hero: true`. If there are two, that is an error:
this calls for a decision the script must not make. If there is none, the build picks the
newest featured photo (otherwise the newest overall) and warns — a home page without a hero
would be broken, and a hard error for it would be a needless obstacle. The resolved slug
sits as `heroSlug` in the header, and the `hero` field per photo is set from the resolution
rather than copied from the YAML; the two therefore cannot drift apart. `featured` marks the
candidates for the home page selection, `order` their sequence there.

**Tags** are a closed set (`animals`, `nature`, `landscape`, `sailing`, `fire`,
`architecture`, `black-and-white`), lowercase and ASCII in the data model because they show
up in URLs (`/gallery/black-and-white`). Their order and the display labels for both
languages live in `shared/utils/tags.ts`. The index records only the tags actually assigned,
with their count.

**Titles and image descriptions are bilingual.** `title` is English and required,
`title_de` and `alt_de` are optional; in the index they are called `titleDe`/`altDe` and are
absent when there is no translation. Resolution goes through `photoTitle`/`photoAlt` in
`shared/utils/photos.ts` — details under "Internationalisation".

**Demo fallback.** `build-images` picks the source in this order: explicit `--source-dir`,
then the private `content/` submodule (only if it is checked out _and_ contains sources),
otherwise `demo-content/`. The chosen mode is recorded as `sourceMode` in the manifest. CI
deliberately does not check out the submodule and then verifies that `sourceMode` equals
`demo` — so the fallback is not asserted but proven on every run.

## Frontend

The images dominate, the controls step to the edge: fixed sidebar on the left, full-bleed
content on the right, structure only through 1 px hairlines. The design comes from the
handoff; the decisions below are the places where the implementation deviates from the
original or had a choice to make.

**The tag filter is a path route, not a query** (deviation from the plan and from the
handoff, which proposes `?tag=segeln`). `/gallery` and `/gallery/sailing` are two
prerendered pages rather than one page with client-side filtering. The difference is not
cosmetic: a query cannot be prerendered statically, so the filtered list would only arrive
after hydration — with a moment of unfiltered gallery before it, not at all without
JavaScript, and `aria-current="page"` on the active filter would be a claim rather than a
fact. As a path, the active tag is the address: the page is finished in the HTML, every
filter link is a real link, and an unknown tag is a 404 instead of a silently unfiltered
view. A client-side middleware rewrites `/gallery?tag=x` to `/gallery/x`, so links from the
drafting phase still arrive.

**The sidebar content comes from the route metadata, not from a teleport.** Gallery and
detail page fill the same slot in the sidebar with different things. The obvious route — the
page teleports its block into the sidebar — does not work under SSG: teleports are discarded
during static rendering, the sidebar would stay empty in the delivered HTML and only fill in
after hydration. Instead every page carries `definePageMeta({ aside: 'gallery' | 'photo' })`,
Nuxt reads the key at build time thanks to `experimental.extraPageMetaExtractionKeys`, and
the layout decides from it what goes into the sidebar — and on mobile also where in the grid
it goes (filter above the tiles, image metadata below the image). A store is ruled out for
the same reason as the teleport.

**Masonry via CSS columns, with one documented side effect.** `grid-template-rows: masonry`
is not baseline everywhere in 2026, so `columns: 3` it is. The tiles therefore fill column
by column rather than row by row: the tab order runs down the first column and then the
second, not in reading order. For a gallery with no inherent order that is acceptable — the
alternative would be a grid with a fixed row height, and that would crop every portrait.

**The tile background is the average colour, not a blur.** Every tile carries its
`aspect-ratio` and the average colour from the index; CLS stays at 0 without 26 base64
previews sitting in the HTML. The blur-up is reserved for hero and detail page, where it is
exactly one image per page. How many tiles start without `loading="lazy"` does not come from
a guessed number but from a simulation of the column break across the aspect ratios — the
browser's lazy loader only decides after layout, and with CSS columns layout comes late.

**The tile is a plain link.** `<a href="/photo/…">`, no intercepted click: every click,
middle click and „In neuem Tab öffnen" / open in new tab lands on the detail page. That way
the gallery works without JavaScript, and the 26 detail pages are real links in the source.

**The lightbox was removed on 2026-09-05; a click opens the detail page.** Until then a
plain left click opened a `<dialog>` over the gallery while every other way of following the
link went to `/photo/<slug>`. The detail page already offers the larger stage, the metadata
and prev/next inside the filter context, so the two were two navigation models for the same
photos — one too many, and the one with less in it was the modal. What the lightbox could do
and the page could not has moved with it: the arrow keys and a horizontal swipe on the image
stage now step through the neighbours (`usePhotoStepKeys`, pure decision logic with tests).
With the dialog went the `?foto=<slug>` query, the async component and the scroll lock in
`base.css`.

**The `<h1>` of the detail page sits invisibly inside `<main>`.** The design gives the title
to the sidebar and leaves the content area to the image alone. But a heading in the
cross-page header area would not be a heading of _this_ page: it would sit outside `<main>`,
in a block that looks the same on every page. So `<main>` carries an `.sr-only` `<h1>` with
the image title, and the sidebar shows the same title visibly as a `<p>`. The price is a
repetition for screen readers — the alternative (the sidebar gets the `<h1>`) moves the
document structure into the navigation, and that weighs more. The header bar with title and
year that the P4 scaffold had above the image is thereby gone; it was not in the spec that
way either.

**The display width of the detail image follows the stage geometry — with two surcharges.**
`object-fit: contain` in a box 820 px high caps the width at `820 · aspect`; a portrait is
never wider than 547 px, however large the screen. That cap is in `sizes`
(`min(calc(100vw - 220px), 547px)`) and saves the large steps there. For the `srcset`
(`variantMax`), however, the same value is too small: `sizes` states CSS pixels, the browser
multiplies by the pixel density itself — hence the factor 2. And it must not fall below what
a phone needs, because there the stage has no height and the image is a full 100vw wide (up
to 767 CSS px, around 1534 at double density): the floor is therefore the 1600 step. In
numbers: a landscape gets 480/960/1600 instead of additionally 2560, a portrait 480/960/1600
instead of additionally 1707. Both functions (`detailSizes`, `detailVariantMax`) live in
`shared/utils/img.ts` and are tested; the 820 sits there as a constant next to the pointer
to `--detail-h`.

**The tag context of the detail page is soft state — and it is checked.** `/photo/<slug>` is
prerendered without a query. If the page read `?tag=` on the first render, the hydrated tree
would differ from the delivered HTML. A `hydrated` flag from `onMounted` keeps the first
pass congruent (unfiltered neighbours), after which the filter applies;
`import.meta.client` is not enough for that, it is already true during hydration. On top of
that the filter only applies if the image occurs in it:
`/photo/jetty-against-the-light?tag=sailing` is a hand-built or stale link, and without this
check it would show "00 / 04" with no neighbours and a way back into a gallery without that
image. Prev/next pass `?tag=` along, and so do the arrow keys and the swipe — with guards
against modifiers and input fields. The canonical is stated without a query.

**On the detail page the sidebar swaps its foot rather than gaining a second one.** Down
there sit the language switch and the legal links (`PhotoAsideFoot`); `SiteFoot` with
place and coordinates is dropped — in the handoff it is an ingredient of the home page
anyway. With both present, „Impressum" (legal notice) would appear twice on the same page.
On mobile it is the other way round: there the layout's page foot carries place and legal,
and `PhotoAsideFoot` hides its legal links. Exactly one set is visible at any width. The
same route meta (`aside === 'photo'`) hides the navigation list — but only above 768 px: on
mobile it is the header bar's menu and the only way to the remaining pages. The wordmark
stays the way to the home page in both cases.

**Blur-up as a pseudo-element, not as an image background.** The 20 px preview sits below
the real image (`picture::before`, `blur(12px)`, `scale(1.06)` against the light seam a blur
leaves at the edge), and the real image fades in over it in 160 ms. As a `background-image`
on the `<img>` itself — the obvious version — the image could not be faded in above the
blur, because both would be the same element. Under `prefers-reduced-motion` the
pseudo-element is dropped entirely; the calm average colour then stands until the image
loads. Without JavaScript (`@media (scripting: none)`) the image is visible immediately
instead of waiting for a `load` event nobody evaluates any more.

**Known deviation: on mobile the metadata block of the detail page sits before the image in
the DOM, but below it visually.** On desktop the sidebar is a contiguous, sticky block and
has to be one element for that; below 768 px `display: contents` dissolves it into grid
cells, and then the cell with the metadata inevitably lies before `<main>`. The DOM order
(title, year, tags, prev/next, then image) remains a sensible reading order — it reads like
a caption placed in front, and the focus order follows it — but does not match the visual
one. The clean fix would be to render the block twice and hide one per breakpoint; that
duplicates content in the HTML and was deliberately not done. It is still open; the
measured state and the two ways out are under "Performance".

**`payloadExtraction: 'client'`.** The client index is already in the JavaScript bundle.
Without this setting Nuxt would put the data rendered in the HTML alongside it a second time
as `_payload.json` — the same bytes, delivered twice.

**No zod in the browser.** The index was checked against the schema at build time;
validating it a second time in the browser costs a library in the bundle and proves nothing
that is not already proven. Exactly one `as unknown as PhotoIndexFile` in `usePhotos.ts`
lifts the structurally untyped JSON onto the data model — one place, deliberately visible.
The pure logic beneath it (sorting, filtering, neighbours, `srcset`) lives in
`shared/utils/` and is testable without Vue; Nuxt auto-imports only files directly in
`shared/utils/` and `shared/types/`, which is why the tests live in a `__tests__/`
subfolder.

**The faint tone is lifted: #5E6874 → #767F8B** (deviation from the handoff, whose values
are otherwise unchanged). `--color-text-faint` carries exactly those elements that are
already the smallest: 10 px labels, counters, footnotes. On the page background the handoff
value comes to 3.52:1 and misses WCAG AA (4.5:1) at that size by a clear margin. #767F8B
reaches 4.9:1, stays in the same grey tone and remains recognisably below
`--color-text-muted` (5.3:1). This is a working assumption, not a design decision: the
alternative would be to collapse `faint` into `muted` entirely and give up the gradation.
The correction is the only colour override, in a clearly marked project block at the end of
`tokens.css`; the handoff part above it is untouched.

**The caption gradient is two-stage rather than linear** (second deviation from the handoff,
in the same project block). The original fades linearly from 85 % opacity to 0. The title,
however, does not sit at the lower edge of the band but in its middle — where only about a
third to a half of the gradient is left, and over a bright photo (mudflats, a bank of cloud)
the contrast of the white 10 px text falls below AA. A stop at 60 % holds the opacity where
the text is and still lets the gradient fade out softly above it; the only visible change is
that the caption stays readable.

**The home page's five-image curated row became a strip of every photo on 2026-09-05, at
the owner's request** (second deviation from the plan, which asked for six to nine curated
images, and from the handoff's five-column grid). The row now holds all photos in the
gallery's order, each at the height the grid tiles had (`--curated-h`) and in its own aspect
ratio, and it moves: while the pointer is on it, it scrolls to the left at 48 px per second
and stops when the pointer leaves. It loops by rendering the list twice and wrapping the
offset once the first copy has scrolled out — the arithmetic is one pure function
(`advanceStrip` in `app/composables/usePhotoStrip.ts`, with tests), the motion is
`requestAnimationFrame` and a `transform`, never a layout property. The second copy is
`aria-hidden` and out of the tab order; the same 26 links twice would be noise. Where the
strip must not move by itself — a coarse pointer has no hover to leave, `prefers-reduced-motion`
is a request, and a list narrower than the visible area would show a gap at every wrap — the
copy is not rendered at all and the strip is a plain scrollable row with `scroll-snap`. That
fallback is the CSS default and the enhancement is added by script, so the delivered HTML is
the version that works without JavaScript. With the row went the "All photos" link and the
photo count beneath it: the strip _is_ all photos, and the count said nothing the gallery
does not. `featured` and `order` stay in the schema and `curated()` stays in
`shared/utils/photos.ts` — the hero still comes from the YAML, and phase 2 may want a
selection again.

**On mobile the hero is width-driven — and `sizes` says 100vw, not 66vw.** The handoff sets
`--hero-h: 60vh` below 768 px. But a height in viewport heights couples the display width to
the viewport under `object-fit: cover`, and that width is the only thing `sizes` can
express: the browser would pick the step by a number that is wrong — for the LCP image, of
all things. On mobile the hero is therefore 3:2 at `height: auto` (`--hero-h` overridden in
the project block). Its width is thereby exactly 100vw, and that is what `sizes` says; the
66vw named in the preconception comes from the 60vh version and would now be a third too
little. The strip below it keeps its tile height at every width instead: a row one scrolls
sideways does not need the tiles to grow, and a fixed height is the one thing that lets the
loop measure its span before the first image has decoded.

**„Licht / Schatten" (light / shadow) is the `<h1>` of the home page.** The project's motif
stands as its own band below the hero caption: `Licht` italic at 400 and in full text
colour, a mono slash at 11 px as the hinge, `Schatten` upright at 600 and muted. The heading
of the home page is thereby the statement of the site and not the word „Start" (home); the
wordmark in the sidebar remains a link. The page title is set here without the
`%s – Moritz Späth` template as an exception (`titleTemplate: null`), because otherwise the
tab would read „Start – Moritz Späth" or the name would appear twice.

**The three text pages share one component, not three stylesheets.** `<DocPage title>`
brings the header bar and the column with a 62-character line length; the typography of
headings, paragraphs, lists and definition lists reaches into the slot content via
`:deep()`. The pages themselves therefore contain nothing but text in plain HTML — what
distinguishes them is their content, and that should be visible when reading the source too.
Section headings are micro labels in mono with a hairline, not a second title level: the
page knows only one text size for body copy and one for labels. Open items stand as visible
text "TODO: …" with a border on the page, not as a comment in the source — what is missing
should be noticed while reading and be findable in the generated HTML. Legal notice and
privacy are explicitly drafts: § 5 DDG without an ODR clause (the arbitration board applies
to consumer contracts, of which there are none here), privacy with server logs, local fonts,
metadata-free images and the supervisory authority — each with a TODO for the legal review.

**No `overflow: hidden` on mono capitals with `line-height: 1`.** The spec sets the micro
labels at 10 and 11 px respectively with a line height of 1; the line box is then exactly as
tall as the type, and `overflow: hidden` cuts off whatever sticks out above it — the dots
over Ü and Ö. In the grid it therefore read „LACHMOWEN" instead of „LACHMÖWEN". Where a line
needs both (truncation with an ellipsis _and_ the tight geometry), it gets `line-height: 1.4`
and takes the difference back via `margin-block: -0.2em`: nothing changes visibly, the box
just reaches over the umlaut dots again. German titles are the normal case here, not the
exception.

**Landmarks and target sizes.** The sidebar is a `<header>`, not an `<aside>`; every `<nav>`
carries an `aria-label` from the dictionary — Main navigation (Hauptnavigation), Filter by
subject (Nach Motiv filtern), Legal (Rechtliches), Photo navigation (Foto-Navigation);
there is exactly one
`<main id="content" tabindex="-1">` as the target of the skip link and exactly one `<h1>` per
page. Counters such as "03 / 14" appear visibly as `aria-hidden` text next to an `.sr-only`
version in whole words — an `aria-label` on a paragraph or span is ignored by many screen
readers. The legal links sit below one another with `min-height: 24px` and the filter
padding is 8 instead of the spec's 7 px, so that both reach the minimum target size; nothing
of that is visible.

**The sidebar foot is a `<footer>` next to the `<header>`, not inside it.** A `<footer>`
inside a `<header>` is not permitted; as a sibling it is valid and provides the
`contentinfo` landmark, so that place and coordinates sit in a landmark too. On mobile it is
hidden and a page foot carries the same details instead — exactly one of them is always
visible.

**Mobile menu: `<details>` as the switch, navigation as a sibling.** Below 768 px the
navigation unfolds from a 56 px header bar; above that it is permanently visible. The list
deliberately sits _next to_ the `<details>` and is shown via `[open] ~ .nav` instead of
being nested inside it: a closed `<details>` hides its children, depending on the engine,
via `display: none` on a shadow slot or via `content-visibility` on `::details-content`, and
neither can be reliably undone everywhere. A main navigation that disappears in the wrong
browser is not an acceptable failure. The state indication (`aria-expanded`) is still
provided by `<summary>` itself; Vue only closes the menu on a route change and on Esc.

**Prefetch on intent only.** `nuxtLink.prefetchOn` is set to `interaction` instead of
`visibility`: in a gallery of 26 tiles, "visible" preloads every detail page immediately. On
hover or focus the intent is established, and the time until the click is enough.

**`sizes` is on every `<source>`.** Without the attribute the browser assumes 100vw per
source and loads the 2560 step for a 260 px tile. It is the most common silent source of
error in a `<picture>` and therefore a required prop of `<PhotoImage>` — as is `alt`: what
that text is, is decided at the point of use; that there is one, is not.

**Optional `alt` in the YAML.** A good title („Delfine vor dem Bug" — dolphins ahead of the
bow) and a good image description are rarely the same sentence. The metadata schema
therefore has an optional field `alt`, which runs through manifest and index all the way to
the component; if it is missing, the title takes its place. No script can invent it, so it
stays empty until someone writes it.

**Type utilities instead of repeated blocks.** The mono micro-label, the footer label and
the small page title were written out as the same five or six declarations in fifteen
scoped stylesheets. They are `.t-ui`, `.t-meta` and `.t-title-s` in `base.css`. Only exact
matches were replaced, so the rendering is unchanged; colour and the occasional
line-height or letter-spacing variant stay at the call site, where a scoped selector
outranks the utility. Blocks that differ in more than one declaration — the counters with
`tabular-nums`, the filter chips with their own letter spacing — keep their own rules
rather than being forced into a utility plus three overrides.

**`--text-label-ls` is 0.18em, and the filter label now uses it.** The token's own comment
names the two places it is for, the home page's "Selection" and the filter's "Filter", but
`TagFilter` carried a hard-coded `0.16em`. Two section labels in the same typographic role
at different letter spacing is a drift, not a decision; the token wins. At 10 px the
visible difference is 0.2 px per character, on one label that is hidden below 768 px
anyway.

**One `<SiteFoot>` per breakpoint, two in the DOM.** The sidebar renders it on the desktop
and the layout renders a second one for the mobile page foot; exactly one is ever visible.
A single instance is technically possible — below 768 px the sidebar is `display: contents`,
so its foot could take the `foot` grid area — but it would then sit before `<main>` in the
DOM while appearing after it, which is the reading-order problem noted for the mobile
detail page below. Two instances, one hidden, keeps reading order and visual order
together; the cost is a duplicated subtree in the markup.

**Review round 1, 2026-09-05: the three findings that changed values, not structure.** The
navigation items are 20 px (`--text-nav-item-size` in the project block), not the 11 px
`.t-ui` size they shared with counters and micro labels — three links in a 220 px column are
the primary navigation and read as such only above the size the site uses for footnotes.
Family, capitals and letter spacing are unchanged, as are the 2 px active marker and the
hover, which still only brightens the text. The home page and the detail page gained the top
padding every other page got from its header block. And prev/next on the detail page became
a row of two 44 px controls with the counter between them, each arrow an inline SVG chevron:
the ← and → glyphs came from whatever the system font had, at whatever weight it had. The
visible words are gone; they stay as the links' accessible names. Review round 2 moved that
row out of the sidebar and made the top padding one shared token — both below.

**Review round 2, 2026-09-05: two fluid values, one strip, and the stepper beside the
image.** The strip is described above; the other three findings are these.

_The page-top distance and the wordmark are the only two values on this site that scale with
the viewport._ They are what the eye actually compares — the page top across pages, the
wordmark across screens — and a fixed pixel value is either lost on a desktop or cramped on
a phone; everything else keeps the handoff's px ladder, which has its own breakpoints.
`--space-page-top: clamp(28px, 4.5vw - 13px, 72px)` is the top padding of the first content
element on every page and of the sidebar, so the wordmark starts at the height the page
content does. It is `vw`, not `vh`, because a phone is taller than a laptop and a vh-based
value would give the phone the largest distance of all; and not a percentage, because
vertical padding resolves against the container _width_. `--text-wordmark-size:
clamp(15px, 0.26vw + 13px, 18px)` lifts the wordmark off the 13 px nav size by the ~40 % the
review asked for at the top end, while both lines still fit the 180 px sidebar; its line
height stays 1.3, which is what keeps the dots of the Ä inside the line box.

_The sidebar grows instead of scrolling._ `.side` is `min-height: 100dvh` with no inner
scroll region; the `overflow-y: auto` that used to let the metadata block scroll is gone,
because the scrollbar it produced on the detail page read as a defect. Most of the overflow
left with the stepper. What remains is a trade-off worth naming: `position: sticky; top: 0`
pins a column taller than the viewport instead of letting it scroll, so in a window shorter
than roughly 600 px the foot of the sidebar is out of reach. Keeping the navigation in place
on every long gallery page is worth more than that case.

_Prev/next stand beside the image, the counter under it._ `PhotoStepper` is a three-column
grid, `44px 1fr 44px`, with the stage slotted into the middle cell and the counter centred
in the row beneath — the arrows are in the content area but outside the picture, so nothing
covers it. The `nav` landmark is `display: contents` and its three parts are grid cells of
that frame, which keeps the links, the counter and their common label in one group without a
box of its own. Below 768 px the image takes the full width and there is no room beside it:
the arrows drop into the counter's row and flank it, the way the sidebar foot had them. The
two columns cost the stage 104 px of width, and `detailSizes` subtracts exactly that
(`STEPPER_GUTTER`), so `sizes` keeps telling the browser the truth; `--detail-h` is
unchanged, the image is as tall as it was. The arrow keys and the swipe stay on the stage.

**`prettier --check` is not part of `pnpm lint`** yet. Files untouched by this package fail
it, and formatting them would put a repo-wide reflow into a diff that is about something
else (`AGENTS.md` §3). The check is adopted in P9 as its own commit, paired with a single
repo-wide `prettier --write` pass.

## Start page: brand, clip and theme

P12, prototype. Typography and colours are placeholders — the design round P11 replaces
them. What is decided here is the mechanism.

**The sequence.** A first visit to `/` (or `/de`) opens on the wordmark, then the clip
starts behind it, then "Light / Shadow" fades in, centred. Clicking a word picks the
palette and lands the visitor on the page in it. Everyone who has already chosen skips all
of it.

**The intro is an overlay, not a route.** The page is in the prerendered HTML underneath,
complete — that is what keeps the start page indexable and its content in the document.
The overlay is prerendered too, and hidden by CSS (`display: none`); it appears only for
a document whose root carries `data-intro`, which the inline head script sets when there
is no stored theme _and_ the document says it is the home page (`data-page`, set by the
page itself). Without JavaScript nothing sets it, so a crawler and a reader without
scripts see the plain page — the same page every returning visitor sees.

While the overlay is up the layout stops painting the page (`visibility: hidden` on
`.shell`) rather than removing it, and the clip and the overlay undo that for themselves,
because both have to be visible. The script also arms a three-second failsafe that lifts
`data-intro` again if the bundle has not hydrated by then — a slow connection gets the page
rather than a blank screen, and no intro.

**The gate is a modal, and the hidden subtree is not enough to make it one.** A subtree at
`visibility: hidden` does drop out of the tab order, but three things stand outside it and
were measured escaping: the skip link, which sits above `.shell` in `app.vue` and was the
fourth tab stop out of the dialog; the viewport, which still scrolled the invisible page
under a wheel gesture; and a control that is only `opacity: 0` with `pointer-events: none`,
which a pointer cannot reach but Enter can. So the root is `overflow: hidden` and the skip
link is `display: none` while `data-intro` stands (both in `base.css`), a phase that has not
faded in yet is `visibility: hidden` rather than transparent, and the overlay keeps the
focus itself: Tab cycles the controls it can see, Escape leaves from anywhere, and a focus
arriving from outside is handed straight back. A trap rather than `inert` on everything
else, because the overlay is a descendant of `.shell` — `inert` there would disable the
dialog with the page.

**The skip control is an addition beyond the brief** (`AGENTS.md` §2 asks for the note). The
concept describes the wordmark, the clip and the choice, and no way past them. But the page
is invisible for the length of the sequence, and the choice does not exist for the first
2.9 s of it: without a control there is no keyboard way out at all and no answer to
impatience. It is therefore visible from the first frame — mono, faint, on its own ground,
bottom centre — and it stores the palette already on screen, so it is a decision and not an
evasion. Whether it survives the design round is P11's to say.

**Theme.** `data-theme` on `<html>`, the choice in `localStorage` under `ms-theme` — never
a cookie (hard rule, and hence no banner). Unset, the palette follows
`prefers-color-scheme`, which is a CSS media query and needs no script. `useTheme()` reads
the DOM on mount and writes the DOM on a click; it deliberately does not bind `data-theme`
through `useHead`, which would bake one visitor's theme into every static file. Skipping
the intro (Escape, or the skip control) stores the palette already on screen, so the gate
does not stand there again on the next visit.

**The clip.** Renditions live in the private content repo under `content/video/<slug>/`
and are served from `/video/<slug>/…` — the same convention as the photographs
(`shared/utils/video.ts`), and the same rule: generated files never enter this repository.
Nitro serves the directory as a second public asset root and copies it into
`.output/public` at build time, so there is no copy step and nothing to gitignore beyond
`public/video/`. `scripts/encode-video.ts` writes 1080p and 720p H.264 MP4, a 720p VP9
WebM and a poster frame from a source clip that lives outside every repository; audio,
subtitles, the camera's data stream and all metadata are dropped, and a rendition taller
than the source is never written.

Delivery is poster-first: the `<video>` element carries only `poster` and
`preload="none"`, and its `<source>` elements appear only once the page has decided to
play. So `prefers-reduced-motion: reduce` and `navigator.connection.saveData` cost exactly
one poster frame and no video bytes, and a browser without JavaScript shows that poster —
which is the clip standing still. The rendition is chosen in JavaScript by viewport width
rather than through `<source media>`, which engines read differently: a wide viewport gets
the 1080p MP4, a narrow one the 720p pair with the WebM first.

**Without a clip there is no clip.** `content/video/` is part of the private submodule, so
a clone without access has none. `videoSlug()` in `nuxt.config.ts` then resolves to `''`,
the backdrop is not rendered and the home page keeps the hero photograph and its caption
it had before P12 — the same graceful path the demo content takes for the photographs. The
build never fails over it, and the intro still works: brand, then the choice, over the
plain background.

**Open, for P11 to decide.** Two treatments of the clip in light mode are implemented so
they can be compared in the preview, reachable through a temporary query flag:
`?video=full` (the default — full-page background behind a washed-out scrim) and
`?video=band` (a hero band where the hero photograph stood, page background normal). The
flag is prototype scaffolding and goes with the decision. One thing is unresolved and it is
a design question, not a mechanic: the motto is centred in the content column, which over a
full-bleed clip reads as off-centre against the viewport.

**Small text over the clip has a ground of its own — a guardrail, not a design.** Text over
a moving picture cannot be contrast-checked the way text over a token colour can, and the
measurement is not close: sampled against the p90 luminance of the bright frames of the
prototype clip, the 11 px strip label (`--color-text-muted`) comes to **2.06:1** and the
10 px sidebar foot (`--color-text-faint`) to **1.90:1**, where AA at those sizes asks for
4.5:1. So in the full-bleed variant the sidebar column, its mobile foot and the strip label
get the page background back as an opaque panel; the ratios are then the ones the palette is
checked at (4.9:1 dark, 4.7:1 light) and no frame can change them. The cost is visible and
deliberate: the clip shows in the content column and not behind the navigation. Photographs
are not touched and no filter goes near them. The version that keeps the clip whole and the
text readable is a design problem, and P11's.

## SEO

**`NUXT_PUBLIC_SITE_URL` is a build variable, not a runtime one.** A statically generated
site has no server left at request time to substitute a host, so the absolute URLs are
baked in by `nuxt generate`. On Coolify it therefore has to be set as a _build_ variable
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

What the sitemap contains: 70 URLs — 35 pages in each of the two locales. Per locale:
26 photo pages, `/gallery` plus its seven tag pages, and `/`. The tag pages are in because
they are real prerendered routes with their own content and their own canonical link, not a
query view of the gallery. `/about`, `/legal-notice` and `/privacy` are _not_ in: they
carry `hasPlaceholders` and with it `noindex`, and a sitemap entry for a noindex page asks
a crawler to fetch a page one has just asked it not to index. Every `<url>` carries the
`xhtml:link` alternates that mirror the page's own hreflang tags.

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
so a link to `/gallery` or `/about` unfurled as a bare text card. The composable defaults
the preview image to the hero photo's OG crop, and the gallery overrides it with the first
photo of the current filter. `og:image:width`/`height` come from `OG_WIDTH`/`OG_HEIGHT` in
`shared/constants/images.ts`, which the image pipeline also reads — the numbers are a fact
about the generated file, and now only written down once.

## Internationalisation

English is the primary language, German the translation. That order is a decision about
audience, not about the author: the site is a developer's portfolio as much as a
photographer's, and the code, the docs and the commit history are English already.

**URL scheme.** English lives at the bare paths, German under `/de` with the _same_ English
path segments:

| page         | English          | German              |
| ------------ | ---------------- | ------------------- |
| home         | `/`              | `/de`               |
| gallery      | `/gallery`       | `/de/gallery`       |
| tag filter   | `/gallery/<tag>` | `/de/gallery/<tag>` |
| photo        | `/photo/<slug>`  | `/de/photo/<slug>`  |
| about        | `/about`         | `/de/about`         |
| legal notice | `/legal-notice`  | `/de/legal-notice`  |
| privacy      | `/privacy`       | `/de/privacy`       |

Translating the segments as well (`/de/galerie/segeln`) would double the slug vocabulary,
and slugs become product URLs in phase 2. `x-default` points at English.

**@nuxtjs/i18n was rejected.** For two languages and about fifty strings it costs 18-25 kB
gzip and roughly 35 transitive dependencies, its SSG support does not reliably prerender
the second route tree, and its browser detection needs a cookie — which PLAN §9 forbids.
What replaced it is 60 lines: `shared/utils/i18n.ts` (pure locale arithmetic),
`app/composables/useI18n.ts` (dictionary lookup, `{n}` interpolation, a two-form plural)
and two flat JSON files. `de.json` is bound to `en.json` with `satisfies`, so a missing
translation is a type error rather than a raw key on the page.

**The locale is never stored.** It is derived from `route.path` on every render — no
`useState`, no ref, no cookie, no `localStorage`. There is therefore no state that can
disagree with the URL, nothing to hydrate and no `Accept-Language` redirect. The one thing
this costs: `localeOf` and `stripLocale` must test whole segments, never
`path.startsWith('/de')`, or a page called `/design` would be German.

**The second route tree comes from `pages:extend`.** The hook clones the resolved pages and
prefixes their paths. Cloning resolved pages is what keeps `definePageMeta({ aside })` and
the rest of the page meta intact; a second directory under `app/pages/de/` would mean 6
duplicated page files, and a `router.options.ts` that rewrites paths at runtime would not
prerender at all. `nitro.prerender.routes` is then the English route list times the locale
list: 38 pages per locale, 76 pages.

**One head block for both trees**, in `layouts/default.vue`: `<html lang>`, the
self-referencing canonical, the reciprocal `hreflang` set including `x-default`, and
`og:locale` plus `og:locale:alternate`. All of it derived from `route.path`, so it cannot
disagree with the page it is on. `useSiteSeo` keeps only what is genuinely per page: title,
description and preview image.

**Photo titles are data, UI strings are dictionary.** `title` in the YAML is English and
required; `title_de` and `alt_de` are optional. A German page without a translation falls
back to the English title — an untranslated tile is honest, an empty one looks broken. A
missing `alt` falls back to the title of the _same_ locale, never to the description of the
other one, which a screen reader would read out in the wrong language.

**Slugs were renamed to English** in the same step (`anleger-im-gegenlicht` became
`jetty-against-the-light`), and the tag keys with them (`segeln` → `sailing`). The rule
that slugs are immutable applies after a deploy, and nothing has been deployed. A client
middleware rewrites the old German paths so links shared during development still land;
there are no redirects for the old slugs, because no old slug was ever public.

**`hasPlaceholders` is an explicit page flag,** not something derived from the rendered
text. It makes a page `noindex, follow`, drops it from the sitemap and drops it from the
hreflang pairing. About, legal notice and privacy carry it while their copy is a draft.
Scanning the HTML for the marker word would have caught the sentence that explains the
marker word.

**Locale is not region.** `en` and `de`, not `en-GB` and `de-DE`. The OpenGraph tags need a
territory and get one, but nothing in the routing does, so adding `en-US` later is a new
locale rather than a change to the existing ones.

**The legal notice is not translated.** § 5 DDG is a German provision and the wording that
satisfies it is the German wording, so `/legal-notice` is an English shell around the
German text in a `<div lang="de">`, with one English sentence saying so. The privacy page
_is_ translated, with a note on the English version that the German one is authoritative.

## Fonts

**Subsetting.** `scripts/subset-fonts.sh` reduces three woff2 files to the characters this
site renders and clamps their weight axis to what `fonts.css` declares:
**114 KB → 55 KB (-52 %)**.

| file                            |        source |           subset |
| ------------------------------- | ------------: | ---------------: |
| `archivo-variable.woff2`        |      34,928 B | 15,004 B (-57 %) |
| `archivo-italic-variable.woff2` |      39,156 B | 15,940 B (-59 %) |
| `jetbrains-mono-variable.woff2` |      40,404 B | 23,940 B (-40 %) |
| **total**                       | **114,488 B** |     **54,884 B** |

**Source and output are separate directories.** The unsubset `latin` files live in
`scripts/fonts-src/` and the subsets in `public/fonts/`. Subsetting a file that is already
subset cannot add a glyph back, so widening the character set without the sources means
refetching them and hoping the URLs still resolve. 114 KB of committed source is the
cheaper answer, and the fetch URLs are pinned in the script header as well.

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
script anyway, so a fuller source font would pick them up. Whether to replace them with
drawn shapes is a design question, noted in `content/OFFEN.md`.

**The character check fails the run.** It compares the source cmap with the output cmap for
every requested codepoint and exits non-zero on anything the subset dropped, or on anything
missing from the source that is not one of those three. The earlier version only read the
output and printed a line, which is a check that cannot fail — and it is how U+2019 (the
English apostrophe) and U+201D stayed absent from the set until P8a.

**Metric-matched fallbacks against CLS.** `font-display: swap` paints the fallback font
first and repaints when the webfont arrives; where the two differ in width, that repaint
moves text. Measured: CLS 0.133 on the About page at mobile emulation, attributed by Lighthouse
to exactly those two font loads, on a page whose layout is otherwise perfectly stable.

The fix is not to drop `swap` (invisible text is worse than moved text) and not to preload
(see below). It is `@font-face` declarations with no `src` URL — `local()` only, so they
cost no request — carrying `size-adjust`, `ascent-override`, `descent-override` and
`line-gap-override` so that the fallback occupies the same space as the webfont.

How the numbers are derived: `size-adjust` is the webfont's mean advance width over the
fallback's, in em, with each character weighted by how often it occurs in the _rendered_
text of the generated pages — all 78 files under `.output/public`, both languages, 40,173
characters over 88 distinct code points. A character either font of a pair lacks is skipped
in both, so the two means cover the same set; here that drops exactly three (U+2190, U+2192,
U+2261, absent from Google's `latin` subset), leaving 99.42 % of the corpus. The three
overrides are the webfont's `OS/2 sTypo` ascent, descent and line-gap over upem, divided by
that same ratio, so the line box matches as well as the width. `fsSelection` bit 7
(USE_TYPO_METRICS) is set on all three webfonts, and `hhea` agrees with `sTypo` exactly, so
the choice of source does not matter.

**Measure Archivo at wght 400.** Its variable default instance is 600 (the italic's is 500),
and `hmtx` holds the default — so reading it without pinning the axis with
`fontTools.varLib.instancer` measures the wrong weight for body text. This is the sharpest
edge in the recipe.

| family                   | size-adjust |   ascent | descent | line-gap |
| ------------------------ | ----------: | -------: | ------: | -------: |
| Archivo Fallback, normal |     98.58 % |  89.06 % | 21.30 % |      0 % |
| Archivo Fallback, italic |     98.73 % |  88.93 % | 21.27 % |      0 % |
| JetBrains Mono Fallback  |     99.66 % | 102.35 % | 30.10 % |      0 % |

_Re-derived in P8._ The P7 values (95.77 % / 95.01 % for the two Archivo faces) did not
reproduce under any method tried — weights 100 to 600, subset and unsubset sources,
weighted and unweighted means, several alternative reference fonts, and a kerning-aware
measurement, which moves the ratio by 0.06 pp. They are also internally impossible: Archivo
italic is very slightly _wider_ than upright at every weight, so any single coherent
measurement must give italic ≥ upright, and 95.77 > 95.01 inverts that. The overrides were
arithmetically consistent with the wrong ratio, so they simply inherited the error. The new
values shrink the fallback less: Liberation Sans is the wider font (0.46200 em weighted mean
against Archivo's 0.45543 em), and at 95.77 % the fallback rendered about 2.9 % _narrower_
than the webfont, so text still grew on swap. The monospace row reproduces exactly and is
unchanged — and that is not evidence the old method was sound: JetBrains Mono is a flat
0.600 em and DejaVu Sans Mono a flat 0.60205 em, so every method returns 99.66 %.

To re-run, with fontTools in a throwaway venv (not a project dependency, the same
arrangement as `scripts/subset-fonts.sh`) and Liberation Sans plus DejaVu Sans Mono from the
distribution's font packages:

```python
# fallback-metrics.py — do NOT name this file inspect.py; it shadows a stdlib
# module fontTools imports.
# usage: python fallback-metrics.py .output/public public/fonts <font-dir>
import html, re, sys, pathlib
from collections import Counter
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

site, fonts, sysfonts = (pathlib.Path(p) for p in sys.argv[1:4])
DROP = re.compile(r"<(script|style|head)\b[^>]*>.*?</\1>|<!--.*?-->", re.S | re.I)
freq = Counter()
for f in sorted(site.rglob("*.html")):
    t = DROP.sub(" ", f.read_text(encoding="utf-8"))
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    freq.update(re.sub(r"\s+", " ", t))
freq = {ord(c): n for c, n in freq.items()}

def load(p, wght=None):
    f = TTFont(p)
    return (instancer.instantiateVariableFont(f, {"wght": wght}, inplace=False,
                                              updateFontNames=False) if wght else f)

def mean(f, codes):  # weighted mean advance, in em
    u, cm, hm = f["head"].unitsPerEm, f.getBestCmap(), f["hmtx"]
    return sum(freq[c] * hm[cm[c]][0] / u for c in codes) / sum(freq[c] for c in codes)

for name, web, fb in (
    ("Archivo", "archivo-variable", "liberation-sans-fonts/LiberationSans-Regular.ttf"),
    ("Archivo italic", "archivo-italic-variable", "liberation-sans-fonts/LiberationSans-Italic.ttf"),
    ("JetBrains Mono", "jetbrains-mono-variable", "dejavu-sans-mono-fonts/DejaVuSansMono.ttf"),
):
    w, f = load(fonts / f"{web}.woff2", 400), load(sysfonts / fb)
    codes = sorted(c for c in freq if c in w.getBestCmap() and c in f.getBestCmap())
    sa = round(100 * mean(w, codes) / mean(f, codes), 2)
    o, u = w["OS/2"], w["head"].unitsPerEm
    print(f"{name}: size-adjust {sa}% " + " ".join(
        f"{lbl} {round(100 * (v / u) / (sa / 100), 2)}%"
        for lbl, v in (("ascent", o.sTypoAscender), ("descent", -o.sTypoDescender),
                       ("line-gap", o.sTypoLineGap))))
```

The overrides are computed from the _published_ two-decimal `size-adjust`, so the CSS stays
internally consistent with what a browser actually applies.

Only fonts that are metrically compatible with the one the numbers were computed against
are named in `local()`. That is the whole discipline: a `size-adjust` derived from Arial and
then applied to a font of a different width makes the shift _worse_. So Arial, Helvetica,
Liberation Sans and Arimo for the sans; Menlo, DejaVu Sans Mono, Liberation Mono and
Cascadia Mono for the monospace — all four around 0.6 em advance, with Consolas (0.55 em)
deliberately absent. Where none of them exists, the declaration does not match, the next
family in the stack takes over unadjusted, and the page behaves exactly as it did before:
the adjustment can help or do nothing, but it cannot hurt.

Measured effect on the About page, mobile emulation: **CLS 0.019 → 0.003 on a machine that
has an Arial-metric font installed; 0.133 unchanged on one that has none**, because the
`local()` declaration then matches nothing. The two numbers come from two different
environments and are not a single before/after. The fix helps every visitor on Windows,
macOS and iOS and is inert elsewhere. The stacks live in the project block of `tokens.css`;
the handoff line above the divider is untouched.

## Performance

Measured locally with Lighthouse against the generated output, never in CI. The static
server used for it mirrors what a real host does — HTTP/1.1 with keep-alive, brotli, and
the cache headers recommended below. This matters more than it sounds: measured through
`python3 -m http.server`, which is HTTP/1.0 without keep-alive or compression, the same
build scored 12 to 16 points lower on mobile and the bottleneck it showed was the test rig.

**Results, 2026-08-29** (P6 → P7, same build, same server, same machine; mobile is
Lighthouse's throttled 4G profile, desktop its unthrottled one):

| page         | mobile perf | desktop perf  | LCP mobile    | CLS mobile    |
| ------------ | ----------- | ------------- | ------------- | ------------- |
| `/`          | 89 → **94** | 100 → **100** | 3.5 s → 2.9 s | 0 → 0         |
| gallery      | 86 → **91** | 99 → **100**  | 4.1 s → 3.4 s | 0 → 0         |
| photo detail | 96 → **97** | 100 → **100** | 2.4 s → 2.3 s | 0 → 0         |
| about        | 98 → **98** | 100 → **100** | 2.0 s → 2.0 s | 0.019 → 0.003 |

Accessibility 100, best practices 100 and SEO 100 on every page in both profiles, before
and after. (The SEO score needs `NUXT_PUBLIC_SITE_URL` set — without it the canonical link
is relative and Lighthouse scores 92. The measurements above set it, because a deployment
will.)

The about row is the honest one to read carefully: its CLS gain depends on the measuring
machine having an Arial-metric font. On a machine with none, the P6 build shifted by 0.133
and the P7 build shifts the same amount, because the `local()` declaration finds nothing to
adjust. The fix helps every visitor on Windows, macOS and iOS and is inert elsewhere.

**Results, 2026-09-05** (P12: intro, background clip, second theme; mobile profile,
`NUXT_PUBLIC_SITE_URL` unset in both runs, so the SEO score is not comparable to the
table above; before = one run, after = five runs):

| `/` mobile | perf           | FCP       | LCP       | TBT      | CLS   |
| ---------- | -------------- | --------- | --------- | -------- | ----- |
| before P12 | 95             | 2.0 s     | 2.7 s     | 40 ms    | 0     |
| after P12  | **94** (94–96) | 1.7–2.1 s | 2.6–2.8 s | 30–50 ms | **0** |

The clip does not move the metrics, and the reason is worth stating rather than
celebrating: Lighthouse always sees a first visit, so it measures the intro. The LCP
element changes from the hero photograph to the intro wordmark — text, in the prerendered
HTML, needing no request of its own; its breakdown is time to first byte plus render delay
and no resource load at all. The poster frame is 35 KB, and the 1.1 MB rendition is
requested only after the first beat, 1.4 s in, by which time LCP is settled. So the number
is honest for a first visit but says nothing about how long the visitor waits before seeing
the _page_: that is the length of the intro, by design, and a design decision rather than a
performance one.

One consequence of the overlay does need watching: while the page is `visibility: hidden`
beneath it, axe skips the whole subtree, and Lighthouse reports `image-alt`,
`heading-order`, `list`, `listitem` and `valid-lang` as _not applicable_ on `/`. The 100
for accessibility on that page is therefore a weaker statement after P12 than before it —
it audits the overlay, not the page. The page's own audits still hold; they have to be read
on a route without an intro (`/gallery`, `/photo/<slug>`) or on a second visit.

**Two optimisations that were measured and rejected.** Both are the kind that get added on
faith:

- **Preloading the LCP image** with `imagesrcset`/`imagesizes`, tried on `/` and on
  the gallery: no change to LCP at all (2.9 s and 3.3 s, unmoved). Lighthouse's own LCP
  discovery audit explains why — the image is already found by the preload scanner in the
  initial document, already `fetchpriority=high`, already not lazy. There is nothing left
  for a preload to bring forward.
- **Inlining the global stylesheet** (`features.inlineStyles: true`). Lighthouse flags
  ~450 ms of render-blocking CSS per page, but the measured result was inside run-to-run
  noise (+0 / -2 / +1 points on three pages). Not worth the config surface or duplicating
  the CSS into all 78 prerendered files.

`fetchpriority="low"` on eager-but-not-LCP images did survive, on reasoning rather than a
measured delta: it is correct (the gallery starts nine tiles at once and only one of them is
the LCP element), it costs nothing, and Lighthouse's simulated throttling does not model
connection-level reordering well enough to show it either way.

**What still limits the two image-heavy pages.** `/` at 94 and the gallery at 91 sit below
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
/_nuxt/*        Cache-Control: public, max-age=31536000, immutable
/fonts/*        Cache-Control: public, max-age=31536000, immutable
/img/*          Cache-Control: public, max-age=31536000, immutable
*.html          Cache-Control: public, max-age=0, must-revalidate
/sitemap.xml    Cache-Control: public, max-age=3600
/robots.txt     Cache-Control: public, max-age=3600
```

The HTML must not be cached that way: the asset URLs inside it change with every build, and
a cached page pointing at deleted `/_nuxt/` files is a blank site. `sitemap.xml` and
`robots.txt` are generated files too and change whenever a photo is added, so they get a
short cache rather than the immutable one. The README's Coolify
instructions carry this table.

**Payload extraction stays on `'client'`.** Confirmed by measurement: no `_payload.json`
request appears in any first-load trace on any page. The files exist for client-side
navigation and cost nothing on entry.

**Known: DOM order on the mobile detail page.** Below 768 px the grid places the photo above
its metadata, but in the DOM the sidebar (and with it the metadata block) still comes before
`<main>`. Reading order and visual order therefore differ on that one page. Not fixed here:
the two ways out are duplicating the block into `<main>` and hiding one copy per breakpoint —
which duplicates a `<nav>` landmark and its links — or splitting the sticky sidebar column
into separate grid items, which reworks the layout the P4–P6 design was signed off on.
Lighthouse's accessibility audit is at 100 either way. It stays open — see the open-questions
list in the private notes.

## Phase 2 groundwork

Phase 2 is selling fine-art prints (PLAN §1). None of it is built here: no shop, no
checkout, no cart, no accounts, no payment integration — that is a hard rule of phase 1
(PLAN §9), and nothing in this repository talks to a payment or fulfilment provider. What
phase 1 does is avoid the three decisions that would be expensive to reverse.

**URLs are already product URLs.** File name = slug = URL, and a slug is immutable once
deployed (see "Data model"). `/photo/<slug>` is the detail page today and the product page
later, in both languages — so a shop layer inherits addresses that search engines and links
have already had time to accumulate, and no redirect table is needed.

**The generated data is already the product data source.** `photos.manifest.json` and the
client index are built from the YAML in the content repo, validated against a zod schema
that also pins the TypeScript types. `PhotoIndexEntry.print` exists and is typed `null`
(`shared/types/photo.ts`, `scripts/lib/schema.ts`): the field is reserved for formats,
papers and prices, and the schema rejects anything else for now. Adding it later is a schema
change in one place, not a second data source.

**The rendering mode can change without a migration.** `ssr: true` with `nuxt generate`
prerenders the whole site today; Nuxt's route rules make individual routes dynamic later
without touching the pages. A print-sales layer would attach as Nitro server routes in this
repository (checkout session, provider webhook, order status) or as a separate service the
static site links to — that choice is deliberately left open, because it depends on where
the deployment ends up and on what the provider's API requires. The static pages stay
static either way.

**Deliberately not decided.** The print-on-demand provider — PLAN §1 names Prodigi and
theprintspace as candidates and picks neither — nor formats, papers, pricing or shipping
regions. The sketch in PLAN §10 (product page → checkout → webhook → provider API →
customer mail) is a sketch, not a commitment: no provider is evaluated, no contract read, no
line of it written. None of that constrains phase 1, and deciding it now would only put a
guess into the repository. What _is_ settled is that whatever keys such a step needs live in
the environment, never in the repository (PLAN §9).
