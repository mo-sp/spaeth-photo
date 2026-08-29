#!/usr/bin/env node
import { existsSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs'
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
import { createReporter, formatBytes, formatDuration, type Reporter } from './lib/report.ts'
import { formatIssues, photoIndexFileSchema, photoManifestSchema } from './lib/schema.ts'
import { isValidSlug } from './lib/slug.ts'
import { renderPhoto, widthLadder, type RenderResult } from './lib/variants.ts'
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

/** Nur diese Dateinamen dürfen unterhalb von `public/img/<slug>/` liegen. */
const OUTPUT_FILE_PATTERN = new RegExp(
  `^(?:\\d+\\.(?:${Object.values(VARIANT_EXTENSION).join('|')})|og\\.jpg)$`,
)

interface Planned {
  slug: string
  sourceFile: string
  meta: PhotoMeta
  metaHash: string
  decision: Decision
  entry: CacheEntry | undefined
  stat: { mtimeMs: number; size: number }
}

/**
 * Räumt verwaiste Ausgaben auf — Bilder, deren Quelle gelöscht oder umbenannt
 * wurde, und Varianten, die es in der aktuellen Konfiguration nicht mehr gibt.
 *
 * Diese Funktion löscht. Sie ist deshalb dreifach abgesichert: sie fasst nur
 * Pfade unterhalb von `public/img` an (`assertInside`), nur Verzeichnisse mit
 * gültigem Slug-Namen und nur Dateien, deren Name dem Muster der erzeugten
 * Varianten entspricht. Alles andere wird gemeldet und liegen gelassen. Ohne
 * Quellbilder räumt sie überhaupt nicht auf — ein leeres Quellverzeichnis ist
 * viel wahrscheinlicher ein Konfigurationsfehler als die Ansage, alles zu
 * löschen.
 */
function cleanupOrphans(
  reporter: Reporter,
  expected: Map<string, Set<string>>,
  dryRun: boolean,
): { files: number; dirs: number } {
  const removed = { files: 0, dirs: 0 }
  if (!existsSync(PUBLIC_IMG_DIR)) return removed
  if (expected.size === 0) {
    reporter.warn('cleanup', 'keine Quellbilder — es wird nichts aufgeräumt')
    return removed
  }

  for (const entry of readdirSync(PUBLIC_IMG_DIR, { withFileTypes: true })) {
    const full = assertInside(PUBLIC_IMG_DIR, path.join(PUBLIC_IMG_DIR, entry.name))

    if (!entry.isDirectory()) {
      reporter.warn('cleanup', `unerwartete Datei bleibt liegen: ${displayPath(full)}`)
      continue
    }

    const allowed = expected.get(entry.name)
    if (!allowed) {
      if (!isValidSlug(entry.name)) {
        reporter.warn('cleanup', `unerwartetes Verzeichnis bleibt liegen: ${displayPath(full)}`)
        continue
      }
      const count = readdirSync(full).length
      reporter.step(dryRun ? 'entfiele' : 'entfernt', entry.name, `${count} Dateien · Quelle fehlt`)
      if (!dryRun) rmSync(full, { recursive: true, force: true })
      removed.dirs += 1
      continue
    }

    for (const file of readdirSync(full, { withFileTypes: true })) {
      if (allowed.has(file.name)) continue
      const target = assertInside(full, path.join(full, file.name))
      if (!file.isFile() || !OUTPUT_FILE_PATTERN.test(file.name)) {
        reporter.warn('cleanup', `unerwarteter Eintrag bleibt liegen: ${displayPath(target)}`)
        continue
      }
      reporter.step(
        dryRun ? 'entfiele' : 'entfernt',
        `${entry.name}/${file.name}`,
        'Variante entfällt',
      )
      if (!dryRun) unlinkSync(target)
      removed.files += 1
    }
  }

  return removed
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
      continue
    }
    const meta = readMetaFile(metaFile)
    if (!meta.ok) {
      for (const issue of meta.issues) reporter.error(slug, issue)
      continue
    }

    const stat = statFile(sourceFile)
    if (!stat) {
      reporter.error(slug, 'Quelldatei nicht lesbar')
      continue
    }

    const entry = cache.entries[slug]
    const hash = metaHash(meta.value)
    const decision = await decide({
      entry,
      stat,
      readHash: () => hashFile(sourceFile),
      metaHash: hash,
      force: force || (only !== undefined && only === slug && !dryRun),
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

    if (dryRun) {
      if (item.decision.verdict !== 'cache') {
        reporter.step('würde', item.slug, item.decision.verdict)
      }
      // Für die Aufräum-Vorschau reichen die Maße: sie ergeben die Breitenleiter
      // und damit die Namen aller Dateien, ohne ein einziges Bild zu kodieren.
      const metadata = await sharp(item.sourceFile).metadata()
      const names = new Set<string>(['og.jpg'])
      for (const width of widthLadder(metadata.width)) {
        names.add(`${width}.avif`)
        names.add(`${width}.webp`)
        if (width === 960 || width === 1600) names.add(`${width}.jpg`)
      }
      expected.set(item.slug, names)
      if (item.decision.render) rendered += 1
      else fromCache += 1
      continue
    }

    if (mustRender) {
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
      skipped += 1
      continue
    } else {
      fromCache += 1
      if (item.decision.verdict === 'metadaten') {
        reporter.step('metadaten', item.slug, 'YAML geändert, Bilder unverändert')
      }
    }

    cache.entries[item.slug] = {
      sourceHash: item.decision.sourceHash,
      mtimeMs: item.stat.mtimeMs,
      size: item.stat.size,
      metaHash: item.metaHash,
      render,
    }

    expected.set(
      item.slug,
      new Set([...render.files.map((file) => path.basename(file.path)), 'og.jpg']),
    )
    results.push({ slug: item.slug, meta: item.meta, render, hash: item.decision.sourceHash })
  }

  // Einträge, deren Quelle verschwunden ist, dürfen nicht im Cache verrotten.
  cache.entries = Object.fromEntries(
    Object.entries(cache.entries).filter(([slug]) => expected.has(slug)),
  )

  const removed = cleanupOrphans(reporter, expected, dryRun)

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
