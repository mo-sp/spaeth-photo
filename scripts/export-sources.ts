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
 * Turns the full-resolution originals into the content repo's web sources
 * (2560 px long edge, sRGB, no metadata) and, where none exists yet, a
 * `photos/meta/<slug>.yaml` filled from EXIF. The originals are only ever read;
 * they live outside every repository and stay there.
 */

const EXPORT_WIDTH = 2560
/**
 * q95 with 4:4:4. Every compression here is inherited by each AVIF and WebP
 * step: 4:2:0 alone throws away three quarters of the colour resolution before
 * the actual encoder starts, and that is not recoverable.
 */
const EXPORT_QUALITY = 95

const OPTIONS: OptionSpecs = {
  'source-dir': {
    type: 'string',
    placeholder: '<dir>',
    description: 'Directory holding the originals (required, or set $PHOTO_SOURCE_DIR)',
  },
  map: {
    type: 'string',
    placeholder: '<json>',
    description: 'Original file → slug/title/tags mapping (default: <out>/import-map.json)',
  },
  out: {
    type: 'string',
    placeholder: '<dir>',
    description: 'Content root for the output (default: content)',
  },
  quality: {
    type: 'string',
    placeholder: '<1-100>',
    description: `JPEG quality of the web source (default: ${EXPORT_QUALITY})`,
  },
  'dry-run': { type: 'boolean', description: 'Write nothing, only report' },
  force: {
    type: 'boolean',
    description: 'Overwrite existing web sources (default: skip them)',
  },
  only: { type: 'string', placeholder: '<slug>', description: 'Export only this slug' },
}

const USAGE = 'Usage: pnpm export-sources [options]'

/**
 * `year` and `orientation` are in the handoff but deliberately not taken from
 * it: the capture date is in EXIF and the orientation in the pixels, both more
 * reliable than a hand-maintained list.
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
    issues.push(`map file missing: ${displayPath(file)} — every image gets title: "TODO"`)
    return { entries, issues }
  }

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new CliError(`map file is not valid JSON: ${(error as Error).message}`)
  }

  const parsed = importMapSchema.safeParse(raw)
  if (!parsed.success) throw new CliError(formatIssues(parsed.error).join('\n'))

  for (const entry of parsed.data) {
    if (entries.has(entry.file)) {
      issues.push(`map: ${entry.file} appears more than once — the last entry wins`)
    }
    // `slugify` normalises case and spacing before the vocabulary check, so
    // "Landscape" and "landscape" both pass. It does not invent words: "Black
    // & White" becomes `black-white` and is rejected, which is the point —
    // an unknown tag is dropped rather than passed into the data model.
    const tags: Tag[] = []
    for (const rawTag of entry.tags) {
      const candidate = slugify(rawTag)
      const check = tagSchema.safeParse(candidate)
      if (check.success) tags.push(check.data)
      else issues.push(`map ${entry.slug}: unknown tag "${rawTag}" dropped`)
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
    throw new CliError(`--quality expects a whole number from 1 to 100, not "${rawQuality}"`)
  }

  // No default: the originals live outside every repository, so their location
  // is the operator's and must not be baked into a public file.
  const rawSourceDir = flags.str('source-dir') ?? process.env.PHOTO_SOURCE_DIR
  if (rawSourceDir === undefined) {
    throw new CliError(
      'no source directory: pass --source-dir <dir> or set $PHOTO_SOURCE_DIR (see .env.example)',
    )
  }
  const sourceDir = fromRoot(rawSourceDir)
  const outRoot = fromRoot(flags.str('out') ?? 'content')
  const mapFile = fromRoot(flags.str('map') ?? path.join(outRoot, 'import-map.json'))
  const out = photosDirs(outRoot)

  if (!existsSync(sourceDir)) {
    throw new CliError(`source directory not found: ${displayPath(sourceDir)}`)
  }

  const reporter = createReporter()
  const { entries: map, issues: mapIssues } = loadImportMap(mapFile)
  for (const issue of mapIssues) reporter.warn('import-map', issue)

  const files = listJpegs(sourceDir)
  if (files.length === 0) {
    throw new CliError(`No JPEGs in ${displayPath(sourceDir)}`)
  }

  const mappedFiles = new Set(map.keys())
  for (const file of mappedFiles) {
    if (!files.includes(file)) reporter.warn('import-map', `file missing from the source: ${file}`)
  }

  reporter.info(`Source  ${displayPath(sourceDir)} (${files.length} files)`)
  reporter.info(`Target  ${displayPath(outRoot)}${dryRun ? '  [dry-run]' : ''}`)
  reporter.info(`Map     ${displayPath(mapFile)} (${map.size} entries)`)
  reporter.info(`Format  ${EXPORT_WIDTH} px long edge · JPEG q${quality} 4:4:4 · sRGB · no EXIF`)
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
      reporter.error(file, `derived slug is invalid: "${slug}"`)
      continue
    }
    const previous = seen.get(slug)
    if (previous) {
      reporter.error(slug, `slug used twice: ${previous} and ${file}`)
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

    // EXIF is read BEFORE the pipeline discards the metadata.
    const input = sharp(inputFile, { failOn: 'error' })
    const metadata = await input.metadata()
    const exif = readExif(metadata.exif)

    if (!exif.date) {
      reporter.warn(slug, 'no DateTimeOriginal in EXIF — using today')
    }
    if (!mapped) {
      reporter.warn(slug, `no map entry for ${file} — title: "TODO"`)
    }

    // An EXIF orientation flag of 5 or more rotates the image by 90°, so
    // `.autoOrient()` swaps width and height. The preview has to report the
    // same dimensions as the real run.
    const rotated = (metadata.orientation ?? 1) >= 5
    const inputWidth = rotated ? metadata.height : metadata.width
    const inputHeight = rotated ? metadata.width : metadata.height

    // The web source may have been retouched by hand, so like the YAML file it
    // is never overwritten unasked.
    const sourceExists = existsSync(outputFile)
    const skipSource = sourceExists && !force

    const scale = Math.min(1, EXPORT_WIDTH / Math.max(inputWidth, inputHeight))
    let outWidth = Math.round(inputWidth * scale)
    let outHeight = Math.round(inputHeight * scale)
    let bytes = 0
    let sourceNote: string

    if (skipSource) {
      sourceNote = 'skipped, exists'
      existing += 1
    } else if (dryRun) {
      sourceNote = sourceExists ? 'would overwrite' : 'would write'
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
        // The only place in the project that writes a profile: the web source
        // is an archive and should describe itself. The delivered variants stay
        // profileless (= sRGB by convention).
        .withIccProfile('srgb')
        .toFile(outputFile)
      outWidth = info.width
      outHeight = info.height
      bytes = statSync(outputFile).size
      totalBytes += bytes
      written += 1
      sourceNote = sourceExists ? 'overwritten (--force)' : 'written'
    }

    let metaNote = 'YAML exists'
    if (!existsSync(metaFile)) {
      const meta: PhotoMeta = {
        title: mapped?.title ?? 'TODO',
        title_de: mapped?.titleDe ?? null,
        // No script can invent an image description; it is added by hand and
        // falls back to the title until then.
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
      metaNote = 'YAML new'
    }

    reporter.step(
      skipSource ? 'exists' : dryRun ? 'would' : 'export',
      slug,
      `${outWidth}×${outHeight} · ${bytes > 0 ? formatBytes(bytes) : '—'} · ` +
        `${sourceNote} · ${metaNote} · ${file}`,
    )
  }

  const duration = Date.now() - started
  reporter.info('')
  reporter.info(
    `  ${files.length} originals · ${written} web sources written · ${metaCreated} YAML created` +
      `${existing > 0 ? ` · ${existing} existing` : ''}` +
      `${skipped > 0 ? ` · ${skipped} skipped` : ''}` +
      `${totalBytes > 0 ? ` · ${formatBytes(totalBytes)}` : ''} · ${formatDuration(duration)}`,
  )
  reporter.finish()
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
