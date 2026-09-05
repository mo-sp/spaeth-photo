#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { PhotoMeta } from '../shared/types/photo.ts'
import { CliError, formatHelp, parseFlags, wantsHelp, type OptionSpecs } from './lib/args.ts'
import {
  decide,
  hashFile,
  loadCache,
  saveCache,
  settingsHash,
  type CacheEntry,
  type Decision,
} from './lib/cache.ts'
import { cleanupOrphans } from './lib/cleanup.ts'
import { buildManifest, toIndex, writeJson } from './lib/manifest.ts'
import { metaHash, readMetaFile } from './lib/meta.ts'
import {
  CACHE_PATH,
  INDEX_PATH,
  MANIFEST_PATH,
  PUBLIC_IMG_DIR,
  assertInside,
  displayPath,
  listJpegs,
  resolveSource,
  statFile,
} from './lib/paths.ts'
import { createReporter, formatBytes, formatDuration } from './lib/report.ts'
import { formatIssues, photoIndexFileSchema, photoManifestSchema } from './lib/schema.ts'
import { isValidSlug } from './lib/slug.ts'
import { jpegWidthsFor, renderPhoto, widthLadder, type RenderResult } from './lib/variants.ts'
import { VARIANT_EXTENSION } from '../shared/constants/images.ts'

/**
 * Builds every delivery variant under `public/img/` from the web sources, plus
 * the full manifest and the client index. Runs before `nuxt generate`. Writes
 * and deletes exclusively inside `public/img/`, even when `--source-dir` points
 * the sources elsewhere.
 */

const OPTIONS: OptionSpecs = {
  'source-dir': {
    type: 'string',
    placeholder: '<dir>',
    description:
      'Content root with photos/source and photos/meta (default: content, else demo-content)',
  },
  'dry-run': { type: 'boolean', description: 'Write and delete nothing, only report' },
  force: { type: 'boolean', description: 'Re-render everything, ignore the cache' },
  only: { type: 'string', placeholder: '<slug>', description: 'Re-render only this slug' },
  strict: { type: 'boolean', description: 'Treat warnings as errors (for CI)' },
}

const USAGE = 'Usage: pnpm build-images [options]'

interface Planned {
  slug: string
  sourceFile: string
  meta: PhotoMeta
  metaHash: string
  decision: Decision
  entry: CacheEntry | undefined
  stat: { mtimeMs: number; size: number }
}

/** File names from a render result — the target state of one slug directory. */
function namesOf(render: RenderResult): Set<string> {
  return new Set([...render.files.map((file) => path.basename(file.path)), 'og.jpg'])
}

/**
 * The same names, derived from the source width alone: the dry run needs them
 * for the cleanup preview without encoding a single image.
 */
function plannedNames(sourceWidth: number): Set<string> {
  const widths = widthLadder(sourceWidth)
  const jpeg = new Set(jpegWidthsFor(widths))
  const names = new Set<string>(['og.jpg'])
  for (const width of widths) {
    names.add(`${width}.${VARIANT_EXTENSION.avif}`)
    names.add(`${width}.${VARIANT_EXTENSION.webp}`)
    if (jpeg.has(width)) names.add(`${width}.${VARIANT_EXTENSION.jpeg}`)
  }
  return names
}

async function main(): Promise<void> {
  if (wantsHelp()) {
    console.log(formatHelp(USAGE, OPTIONS))
    return
  }

  const flags = parseFlags(OPTIONS)
  const dryRun = flags.bool('dry-run')
  const force = flags.bool('force')
  const strict = flags.bool('strict')
  const only = flags.str('only')

  const source = resolveSource(flags.str('source-dir'))
  const reporter = createReporter()

  const files = listJpegs(source.sourceDir)
  reporter.info(`Source  ${displayPath(source.sourceDir)} (${source.reason})`)
  reporter.info(`Mode    ${source.mode}${dryRun ? '  [dry-run]' : ''}${force ? '  [force]' : ''}`)
  reporter.info(`Target  ${displayPath(PUBLIC_IMG_DIR)}`)
  reporter.info('')

  if (files.length === 0) {
    throw new CliError(
      `No source images in ${displayPath(source.sourceDir)}. ` +
        '<slug>.jpg files are expected; the demo fallback needs demo-content/ to be present.',
    )
  }

  const expectedSettings = settingsHash()
  const cache = loadCache(CACHE_PATH, expectedSettings)
  const cacheWasEmpty = Object.keys(cache.entries).length === 0

  // Metadata without a source image would otherwise pass unnoticed.
  const slugs = new Set(files.map((file) => path.basename(file, path.extname(file))))
  if (existsSync(source.metaDir)) {
    for (const file of readdirSync(source.metaDir)) {
      if (!file.endsWith('.yaml')) continue
      const slug = path.basename(file, '.yaml')
      if (!slugs.has(slug)) reporter.warn(slug, 'metadata without a matching source image')
    }
  }

  const started = Date.now()
  const planned: Planned[] = []
  // Photos that drop out of the target state without their outputs being
  // invalid: a typo in a YAML file is no reason to delete finished images.
  const protectedSlugs = new Set<string>()

  for (const file of files) {
    const slug = path.basename(file, path.extname(file))
    const sourceFile = path.join(source.sourceDir, file)

    if (!isValidSlug(slug)) {
      reporter.error(file, `file name is not a valid slug: "${slug}"`)
      continue
    }

    const metaFile = path.join(source.metaDir, `${slug}.yaml`)
    if (!existsSync(metaFile)) {
      reporter.error(slug, `metadata missing: ${displayPath(metaFile)}`)
      protectedSlugs.add(slug)
      continue
    }
    const meta = readMetaFile(metaFile)
    if (!meta.ok) {
      for (const issue of meta.issues) reporter.error(slug, issue)
      protectedSlugs.add(slug)
      continue
    }

    const stat = statFile(sourceFile)
    if (!stat) {
      reporter.error(slug, 'source file not readable')
      protectedSlugs.add(slug)
      continue
    }

    const entry = cache.entries[slug]
    const hash = metaHash(meta.value)
    const decision = await decide({
      entry,
      stat,
      readHash: () => hashFile(sourceFile),
      metaHash: hash,
      // --only means "re-render this slug", in a dry run too — otherwise the
      // preview would show a different decision than the real run.
      force: force || only === slug,
      outputsPresent: (cached) =>
        [...cached.render.files.map((variant) => variant.path), cached.render.ogFile.path].every(
          (url) => existsSync(path.join(PUBLIC_IMG_DIR, url.replace('/img/', ''))),
        ),
    })

    planned.push({ slug, sourceFile, meta: meta.value, metaHash: hash, decision, entry, stat })
  }

  const expected = new Map<string, Set<string>>()
  const results: Array<{ slug: string; meta: PhotoMeta; render: RenderResult; hash: string }> = []
  let rendered = 0
  let fromCache = 0
  let skipped = 0

  for (const item of planned) {
    const outDir = assertInside(PUBLIC_IMG_DIR, path.join(PUBLIC_IMG_DIR, item.slug))
    let render = item.entry?.render

    const selected = only === undefined || only === item.slug
    const mustRender = item.decision.render && selected

    if (mustRender) {
      // The dry run takes the same branches as the real one and stops just
      // before the encoder: the source dimensions give the width ladder, and
      // with it the names of every file that would appear.
      if (dryRun) {
        const metadata = await sharp(item.sourceFile).metadata()
        expected.set(item.slug, plannedNames(metadata.width))
        rendered += 1
        reporter.step('would', item.slug, item.decision.verdict)
        continue
      }

      const startedPhoto = Date.now()
      render = await renderPhoto({
        sourceFile: item.sourceFile,
        slug: item.slug,
        outDir,
        write: async (file, data) => {
          await mkdir(path.dirname(file), { recursive: true })
          await writeFile(assertInside(PUBLIC_IMG_DIR, file), data)
        },
      })
      rendered += 1
      reporter.step(
        item.decision.verdict,
        item.slug,
        `${render.variants.avif.length} widths · ${render.files.length + 1} files · ` +
          `${formatBytes(render.totalBytes)} · ${render.encodes} encodes · ` +
          formatDuration(Date.now() - startedPhoto),
      )
    } else if (!render) {
      reporter.warn(item.slug, 'not yet rendered and excluded by --only — skipped')
      protectedSlugs.add(item.slug)
      skipped += 1
      continue
    } else {
      fromCache += 1
      if (item.decision.verdict === 'metadata') {
        reporter.step(dryRun ? 'would' : 'metadata', item.slug, 'YAML changed, images unchanged')
      }
    }

    cache.entries[item.slug] = {
      sourceHash: item.decision.sourceHash,
      mtimeMs: item.stat.mtimeMs,
      size: item.stat.size,
      metaHash: item.metaHash,
      render,
    }

    expected.set(item.slug, namesOf(render))
    results.push({ slug: item.slug, meta: item.meta, render, hash: item.decision.sourceHash })
  }

  // Entries whose source is gone must not rot in the cache. A photo with an
  // error has not gone anywhere — its entry stays.
  cache.entries = Object.fromEntries(
    Object.entries(cache.entries).filter(
      ([slug]) => expected.has(slug) || protectedSlugs.has(slug),
    ),
  )

  let totalBytes = 0
  let totalFiles = 0

  if (!dryRun) {
    const { manifest, issues } = buildManifest({
      photos: results.map((result) => ({
        slug: result.slug,
        meta: result.meta,
        render: result.render,
        sourceHash: result.hash,
      })),
      sourceMode: source.mode,
      sourceDir: displayPath(source.sourceDir),
    })
    for (const issue of issues) {
      if (issue.level === 'error') reporter.error(issue.scope, issue.message)
      else reporter.warn(issue.scope, issue.message)
    }

    const index = toIndex(manifest)
    const manifestCheck = photoManifestSchema.safeParse(manifest)
    if (!manifestCheck.success) {
      for (const issue of formatIssues(manifestCheck.error)) reporter.error('manifest', issue)
    }
    const indexCheck = photoIndexFileSchema.safeParse(index)
    if (!indexCheck.success) {
      for (const issue of formatIssues(indexCheck.error)) reporter.error('index', issue)
    }

    totalBytes = manifest.photos.reduce((sum, photo) => sum + photo.totalBytes, 0)
    totalFiles = manifest.photos.reduce((sum, photo) => sum + photo.files.length + 1, 0)

    if (reporter.counts().errors === 0) {
      writeJson(MANIFEST_PATH, manifest, true)
      writeJson(INDEX_PATH, index, false)
      saveCache(CACHE_PATH, cache)
    } else {
      reporter.warn('manifest', 'manifest, index and cache not written because of the errors')
    }
  }

  // Last of all, once every error is known: deletion only follows a complete,
  // error-free run.
  const removed = cleanupOrphans({
    dir: PUBLIC_IMG_DIR,
    keep: expected,
    reporter,
    dryRun,
    partial: only !== undefined,
    hasErrors: reporter.counts().errors > 0,
    protectedSlugs,
  })

  const duration = Date.now() - started
  const parts = [`${planned.length} photos`, `${rendered} rendered`, `${fromCache} from cache`]
  if (skipped > 0) parts.push(`${skipped} skipped`)
  if (removed.dirs > 0) parts.push(`${removed.dirs} orphaned directories`)
  if (removed.files > 0) parts.push(`${removed.files} orphaned files`)
  if (!dryRun) parts.push(`${totalFiles} files`, formatBytes(totalBytes))
  parts.push(formatDuration(duration))

  reporter.info('')
  reporter.info(`  ${parts.join(' · ')}`)
  if (!dryRun && reporter.counts().errors === 0) {
    reporter.info(
      `  ${displayPath(MANIFEST_PATH)} · ${displayPath(INDEX_PATH)} ` +
        `(${formatBytes(statSync(INDEX_PATH).size)})`,
    )
  }
  if (cacheWasEmpty && !dryRun) reporter.info('  Cache rebuilt.')

  reporter.finish({ strict })
}

try {
  await main()
} catch (error) {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`)
    process.exitCode = 1
  } else {
    throw error
  }
}
