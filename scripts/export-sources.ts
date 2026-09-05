#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { z } from 'zod'
import type { PhotoMeta, Tag } from '../shared/types/photo.ts'
import { CliError, formatHelp, parseFlags, wantsHelp, type OptionSpecs } from './lib/args.ts'
import { readExif, todayIso } from './lib/exif.ts'
import { renderMetaYaml, sortTags } from './lib/meta.ts'
import { displayPath, fromRoot, listJpegs, photosDirs } from './lib/paths.ts'
import { createReporter, formatBytes, formatDuration } from './lib/report.ts'
import { formatIssues, slugSchema, tagSchema } from './lib/schema.ts'
import { slugFromFilename, slugify } from './lib/slug.ts'

/**
 * Erzeugt aus den Original-JPEGs (volle Auflösung, mit EXIF) die Web-Quellen
 * des Content-Repos: 2560 px lange Kante, sRGB, ohne Metadaten — und, falls
 * noch keine existiert, eine `photos/meta/<slug>.yaml` mit den aus EXIF
 * gelesenen Angaben.
 *
 * Die Originale werden ausschließlich gelesen. Sie liegen außerhalb jedes
 * Repositorys und bleiben dort.
 */

const EXPORT_WIDTH = 2560
/**
 * q95 mit 4:4:4. Diese Datei ist ein Archiv, aus dem später alle
 * Auslieferungsvarianten entstehen — jede Kompression hier vererbt sich in
 * jede AVIF- und WebP-Stufe. Vor allem die Farbunterabtastung: 4:2:0 wirft
 * drei Viertel der Farbauflösung weg, bevor der eigentliche Encoder überhaupt
 * anfängt, und das ist nicht rückholbar.
 */
const EXPORT_QUALITY = 95

/**
 * Der Demo-Content im öffentlichen Repo ist kein Archiv, sondern ein Beleg,
 * dass der Build ohne das private Submodule durchläuft. Er wird deshalb mit
 * niedrigerer Qualität exportiert (`--quality`), damit das Repo nicht dauerhaft
 * mehrere Megabyte Platzhalterbilder mitschleppt.
 */

const OPTIONS: OptionSpecs = {
  'source-dir': {
    type: 'string',
    placeholder: '<dir>',
    description: 'Verzeichnis mit den Originalen (Standard: $PHOTO_SOURCE_DIR)',
  },
  map: {
    type: 'string',
    placeholder: '<json>',
    description: 'Zuordnung Originaldatei → Slug/Titel/Tags (Standard: <out>/import-map.json)',
  },
  out: {
    type: 'string',
    placeholder: '<dir>',
    description: 'Content-Wurzel für die Ausgabe (Standard: content)',
  },
  quality: {
    type: 'string',
    placeholder: '<1-100>',
    description: `JPEG-Qualität der Web-Quelle (Standard: ${EXPORT_QUALITY})`,
  },
  'dry-run': { type: 'boolean', description: 'Nichts schreiben, nur berichten' },
  force: {
    type: 'boolean',
    description: 'Vorhandene Web-Quellen überschreiben (Standard: überspringen)',
  },
  only: { type: 'string', placeholder: '<slug>', description: 'Nur diesen Slug exportieren' },
}

const USAGE = 'Aufruf: pnpm export-sources [Optionen]'

const DEFAULT_SOURCE_DIR = '~/incoming/BilderWebseite'

/**
 * `year` und `orientation` stehen im Handoff, werden aber bewusst **nicht**
 * übernommen: das Aufnahmedatum steht im EXIF, die Ausrichtung in den Pixeln.
 * Beides ist verlässlicher als eine von Hand gepflegte Liste.
 */
const importEntrySchema = z.object({
  slug: slugSchema,
  file: z.string().min(1),
  /** English title — the primary one, and the only required one. */
  title: z.string().min(1),
  /** German title; omitted entries fall back to the English one at render time. */
  title_de: z.string().min(1).nullable().default(null),
  tags: z.array(z.string()).default([]),
})

const importMapSchema = z.array(importEntrySchema)

interface MapEntry {
  slug: string
  title: string
  titleDe: string | null
  tags: Tag[]
}

function loadImportMap(file: string): { entries: Map<string, MapEntry>; issues: string[] } {
  const entries = new Map<string, MapEntry>()
  const issues: string[] = []
  if (!existsSync(file)) {
    issues.push(`Zuordnungsdatei fehlt: ${displayPath(file)} — alle Bilder bekommen title: "TODO"`)
    return { entries, issues }
  }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new CliError(`Zuordnungsdatei ist kein gültiges JSON: ${(error as Error).message}`)
  }

  const parsed = importMapSchema.safeParse(raw)
  if (!parsed.success) throw new CliError(formatIssues(parsed.error).join('\n'))

  for (const entry of parsed.data) {
    if (entries.has(entry.file)) {
      issues.push(`Zuordnung: ${entry.file} kommt mehrfach vor — der letzte Eintrag gewinnt`)
    }
    // The map carries the tag keys as written (`black-and-white`); `slugify`
    // is kept as the gate so a hand-typed „Black & White" still lands on the
    // key. Unknown tags are dropped rather than passed into the data model.
    const tags: Tag[] = []
    for (const rawTag of entry.tags) {
      const candidate = slugify(rawTag)
      const check = tagSchema.safeParse(candidate)
      if (check.success) tags.push(check.data)
      else issues.push(`Zuordnung ${entry.slug}: unbekanntes Tag „${rawTag}" verworfen`)
    }
    entries.set(entry.file, {
      slug: entry.slug,
      title: entry.title,
      titleDe: entry.title_de,
      tags: sortTags(tags),
    })
  }

  return { entries, issues }
}

async function main(): Promise<void> {
  if (wantsHelp()) {
    console.log(formatHelp(USAGE, OPTIONS))
    return
  }

  const flags = parseFlags(OPTIONS)
  const dryRun = flags.bool('dry-run')
  const force = flags.bool('force')
  const only = flags.str('only')

  const rawQuality = flags.str('quality')
  const quality = rawQuality === undefined ? EXPORT_QUALITY : Number(rawQuality)
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new CliError(`--quality erwartet eine ganze Zahl von 1 bis 100, nicht „${rawQuality}"`)
  }

  const sourceDir = fromRoot(
    flags.str('source-dir') ?? process.env.PHOTO_SOURCE_DIR ?? DEFAULT_SOURCE_DIR,
  )
  const outRoot = fromRoot(flags.str('out') ?? 'content')
  const mapFile = fromRoot(flags.str('map') ?? path.join(outRoot, 'import-map.json'))
  const out = photosDirs(outRoot)

  if (!existsSync(sourceDir)) {
    throw new CliError(`Quellverzeichnis nicht gefunden: ${displayPath(sourceDir)}`)
  }

  const reporter = createReporter()
  const { entries: map, issues: mapIssues } = loadImportMap(mapFile)
  for (const issue of mapIssues) reporter.warn('import-map', issue)

  const files = listJpegs(sourceDir)
  if (files.length === 0) {
    throw new CliError(`Keine JPEGs in ${displayPath(sourceDir)}`)
  }

  const mappedFiles = new Set(map.keys())
  for (const file of mappedFiles) {
    if (!files.includes(file)) reporter.warn('import-map', `Datei fehlt im Quellordner: ${file}`)
  }

  reporter.info(`Quelle   ${displayPath(sourceDir)} (${files.length} Dateien)`)
  reporter.info(`Ziel     ${displayPath(outRoot)}${dryRun ? '  [dry-run]' : ''}`)
  reporter.info(`Mapping  ${displayPath(mapFile)} (${map.size} Einträge)`)
  reporter.info(
    `Format   ${EXPORT_WIDTH} px lange Kante · JPEG q${quality} 4:4:4 · sRGB · ohne EXIF`,
  )
  reporter.info('')

  if (!dryRun) {
    mkdirSync(out.source, { recursive: true })
    mkdirSync(out.meta, { recursive: true })
  }

  const started = Date.now()
  const seen = new Map<string, string>()
  let written = 0
  let metaCreated = 0
  let skipped = 0
  let existing = 0
  let totalBytes = 0

  for (const file of files) {
    const mapped = map.get(file)
    const slug = mapped?.slug ?? slugFromFilename(file)

    if (!slugSchema.safeParse(slug).success) {
      reporter.error(file, `abgeleiteter Slug ist ungültig: „${slug}"`)
      continue
    }
    const previous = seen.get(slug)
    if (previous) {
      reporter.error(slug, `Slug doppelt vergeben: ${previous} und ${file}`)
      continue
    }
    seen.set(slug, file)

    if (only && slug !== only) {
      skipped += 1
      continue
    }

    const inputFile = path.join(sourceDir, file)
    const outputFile = path.join(out.source, `${slug}.jpg`)
    const metaFile = path.join(out.meta, `${slug}.yaml`)

    // EXIF wird gelesen, BEVOR die Pipeline die Metadaten verwirft.
    const input = sharp(inputFile, { failOn: 'error' })
    const metadata = await input.metadata()
    const exif = readExif(metadata.exif)

    if (!exif.date) {
      reporter.warn(slug, 'kein DateTimeOriginal im EXIF — heutiges Datum eingesetzt')
    }
    if (!mapped) {
      reporter.warn(slug, `keine Zuordnung für ${file} — title: "TODO"`)
    }

    // Ein EXIF-Orientierungsflag ab 5 dreht das Bild um 90°; `.autoOrient()`
    // vertauscht dann Breite und Höhe. Die Vorschau muss dieselben Maße nennen
    // wie der echte Lauf, sonst berichtet sie über ein anderes Bild.
    const rotated = (metadata.orientation ?? 1) >= 5
    const inputWidth = rotated ? metadata.height : metadata.width
    const inputHeight = rotated ? metadata.width : metadata.height

    // Die Web-Quelle ist die Vorlage aller Varianten und kann von Hand
    // nachbearbeitet worden sein. Sie wird deshalb genauso geschützt wie die
    // YAML-Datei: ein zweiter Lauf überschreibt sie nicht ungefragt.
    const sourceExists = existsSync(outputFile)
    const skipSource = sourceExists && !force

    const scale = Math.min(1, EXPORT_WIDTH / Math.max(inputWidth, inputHeight))
    let outWidth = Math.round(inputWidth * scale)
    let outHeight = Math.round(inputHeight * scale)
    let bytes = 0
    let sourceNote: string

    if (skipSource) {
      sourceNote = 'übersprungen, existiert'
      existing += 1
    } else if (dryRun) {
      sourceNote = sourceExists ? 'würde überschreiben' : 'würde schreiben'
    } else {
      const info = await input
        .autoOrient()
        .resize({
          width: EXPORT_WIDTH,
          height: EXPORT_WIDTH,
          fit: 'inside',
          withoutEnlargement: true,
          kernel: 'lanczos3',
        })
        .jpeg({ quality, chromaSubsampling: '4:4:4', mozjpeg: true })
        // Einzige Stelle im Projekt, an der ein Profil geschrieben wird: die
        // Web-Quelle ist ein Archiv und soll sich selbst beschreiben. Die
        // ausgelieferten Varianten bleiben profillos (= sRGB per Konvention).
        .withIccProfile('srgb')
        .toFile(outputFile)
      outWidth = info.width
      outHeight = info.height
      bytes = statSync(outputFile).size
      totalBytes += bytes
      written += 1
      sourceNote = sourceExists ? 'überschrieben (--force)' : 'geschrieben'
    }

    let metaNote = 'YAML vorhanden'
    if (!existsSync(metaFile)) {
      const meta: PhotoMeta = {
        title: mapped?.title ?? 'TODO',
        title_de: mapped?.titleDe ?? null,
        // Eine Bildbeschreibung kann kein Skript erfinden; sie wird von Hand
        // nachgetragen und fällt bis dahin auf den Titel zurück.
        alt: null,
        alt_de: null,
        date: exif.date ?? todayIso(),
        tags: mapped?.tags ?? [],
        collection: null,
        camera: exif.camera,
        lens: exif.lens,
        featured: false,
        hero: false,
        order: null,
        print: null,
      }
      if (!dryRun) await writeFile(metaFile, renderMetaYaml(meta), 'utf8')
      metaCreated += 1
      metaNote = 'YAML neu'
    }

    reporter.step(
      skipSource ? 'vorhanden' : dryRun ? 'würde' : 'export',
      slug,
      `${outWidth}×${outHeight} · ${bytes > 0 ? formatBytes(bytes) : '—'} · ` +
        `${sourceNote} · ${metaNote} · ${file}`,
    )
  }

  const duration = Date.now() - started
  reporter.info('')
  reporter.info(
    `  ${files.length} Originale · ${written} Web-Quellen geschrieben · ${metaCreated} YAML angelegt` +
      `${existing > 0 ? ` · ${existing} vorhanden` : ''}` +
      `${skipped > 0 ? ` · ${skipped} übersprungen` : ''}` +
      `${totalBytes > 0 ? ` · ${formatBytes(totalBytes)}` : ''} · ${formatDuration(duration)}`,
  )
  reporter.finish()
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
