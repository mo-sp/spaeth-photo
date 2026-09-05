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
 * Erzeugt aus den Web-Quellen alle Auslieferungsvarianten unter `public/img/`
 * sowie das vollständige Manifest und den Client-Index.
 *
 * Läuft vor `nuxt generate` (`pnpm build`). Der Lauf ist inkrementell: was sich
 * nicht geändert hat, wird nicht neu kodiert. Ausgeliefert wird ausschließlich
 * nach `public/img/` — auch dann, wenn die Quelle über `--source-dir` woanders
 * liegt; und gelöscht wird ausschließlich dort.
 */

const OPTIONS: OptionSpecs = {
  'source-dir': {
    type: 'string',
    placeholder: '<dir>',
    description:
      'Content-Wurzel mit photos/source und photos/meta (Standard: content, sonst demo-content)',
  },
  'dry-run': { type: 'boolean', description: 'Nichts schreiben und nichts löschen, nur berichten' },
  force: { type: 'boolean', description: 'Alles neu rendern, Cache ignorieren' },
  only: { type: 'string', placeholder: '<slug>', description: 'Nur diesen Slug neu rendern' },
  strict: { type: 'boolean', description: 'Warnungen als Fehler behandeln (für CI)' },
}

const USAGE = 'Aufruf: pnpm build-images [Optionen]'

interface Planned {
  slug: string
  sourceFile: string
  meta: PhotoMeta
  metaHash: string
  decision: Decision
  entry: CacheEntry | undefined
  stat: { mtimeMs: number; size: number }
}

/** Dateinamen aus einem Render-Ergebnis — der Sollzustand eines Slug-Ordners. */
function namesOf(render: RenderResult): Set<string> {
  return new Set([...render.files.map((file) => path.basename(file.path)), 'og.jpg'])
}

/**
 * Dieselben Namen, aber allein aus der Quellbreite abgeleitet. Der Dry-Run
 * braucht sie für die Aufräum-Vorschau, ohne ein einziges Bild zu kodieren.
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
  reporter.info(`Quelle    ${displayPath(source.sourceDir)} (${source.reason})`)
  reporter.info(`Modus     ${source.mode}${dryRun ? '  [dry-run]' : ''}${force ? '  [force]' : ''}`)
  reporter.info(`Ziel      ${displayPath(PUBLIC_IMG_DIR)}`)
  reporter.info('')

  if (files.length === 0) {
    throw new CliError(
      `Keine Quellbilder in ${displayPath(source.sourceDir)}. ` +
        'Erwartet werden <slug>.jpg-Dateien; für den Demo-Fallback muss demo-content/ vorhanden sein.',
    )
  }

  const expectedSettings = settingsHash()
  const cache = loadCache(CACHE_PATH, expectedSettings)
  const cacheWasEmpty = Object.keys(cache.entries).length === 0

  // Metadaten ohne Quellbild fallen sonst stillschweigend unter den Tisch.
  const slugs = new Set(files.map((file) => path.basename(file, path.extname(file))))
  if (existsSync(source.metaDir)) {
    for (const file of readdirSync(source.metaDir)) {
      if (!file.endsWith('.yaml')) continue
      const slug = path.basename(file, '.yaml')
      if (!slugs.has(slug)) reporter.warn(slug, 'Metadaten ohne zugehöriges Quellbild')
    }
  }

  const started = Date.now()
  const planned: Planned[] = []
  /**
   * Fotos, die aus dem Sollzustand herausfallen, ohne dass ihre Ausgaben
   * ungültig wären: ein Tippfehler in der YAML-Datei ist kein Grund, die
   * fertigen Bilder zu löschen.
   */
  const protectedSlugs = new Set<string>()

  for (const file of files) {
    const slug = path.basename(file, path.extname(file))
    const sourceFile = path.join(source.sourceDir, file)

    if (!isValidSlug(slug)) {
      reporter.error(file, `Dateiname ist kein gültiger Slug: „${slug}"`)
      continue
    }

    const metaFile = path.join(source.metaDir, `${slug}.yaml`)
    if (!existsSync(metaFile)) {
      reporter.error(slug, `Metadaten fehlen: ${displayPath(metaFile)}`)
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
      reporter.error(slug, 'Quelldatei nicht lesbar')
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
      // --only heißt „diesen Slug neu rendern" — auch im Dry-Run, sonst
      // zeigte die Vorschau eine andere Entscheidung als der echte Lauf.
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
      // Der Dry-Run durchläuft dieselben Verzweigungen wie der echte Lauf und
      // hält nur vor dem Encoder an: die Quellmaße ergeben die Breitenleiter
      // und damit die Namen aller Dateien, die entstünden.
      if (dryRun) {
        const metadata = await sharp(item.sourceFile).metadata()
        expected.set(item.slug, plannedNames(metadata.width))
        rendered += 1
        reporter.step('würde', item.slug, item.decision.verdict)
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
        `${render.variants.avif.length} Breiten · ${render.files.length + 1} Dateien · ` +
          `${formatBytes(render.totalBytes)} · ${render.encodes} Encodes · ` +
          formatDuration(Date.now() - startedPhoto),
      )
    } else if (!render) {
      reporter.warn(item.slug, 'noch nicht gerendert und durch --only ausgeschlossen — ausgelassen')
      protectedSlugs.add(item.slug)
      skipped += 1
      continue
    } else {
      fromCache += 1
      if (item.decision.verdict === 'metadaten') {
        reporter.step(
          dryRun ? 'würde' : 'metadaten',
          item.slug,
          'YAML geändert, Bilder unverändert',
        )
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

  // Einträge, deren Quelle verschwunden ist, dürfen nicht im Cache verrotten.
  // Ein Foto mit Fehler ist nicht verschwunden — sein Eintrag bleibt.
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
      reporter.warn(
        'manifest',
        'wegen der Fehler wurden Manifest, Index und Cache nicht geschrieben',
      )
    }
  }

  // Erst ganz am Ende, wenn alle Fehler bekannt sind: gelöscht wird nur nach
  // einem vollständigen, fehlerfreien Lauf.
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
  const parts = [`${planned.length} Fotos`, `${rendered} gerendert`, `${fromCache} aus Cache`]
  if (skipped > 0) parts.push(`${skipped} ausgelassen`)
  if (removed.dirs > 0) parts.push(`${removed.dirs} verwaiste Verzeichnisse`)
  if (removed.files > 0) parts.push(`${removed.files} verwaiste Dateien`)
  if (!dryRun) parts.push(`${totalFiles} Dateien`, formatBytes(totalBytes))
  parts.push(formatDuration(duration))

  reporter.info('')
  reporter.info(`  ${parts.join(' · ')}`)
  if (!dryRun && reporter.counts().errors === 0) {
    reporter.info(
      `  ${displayPath(MANIFEST_PATH)} · ${displayPath(INDEX_PATH)} ` +
        `(${formatBytes(statSync(INDEX_PATH).size)})`,
    )
  }
  if (cacheWasEmpty && !dryRun) reporter.info('  Cache neu aufgebaut.')

  reporter.finish({ strict })
}

try {
  await main()
} catch (error) {
  if (error instanceof CliError) {
    console.error(`Fehler: ${error.message}`)
    process.exitCode = 1
  } else {
    throw error
  }
}
