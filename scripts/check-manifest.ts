#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { CliError, formatHelp, parseFlags, wantsHelp, type OptionSpecs } from './lib/args.ts'
import { MANIFEST_PATH, PUBLIC_IMG_DIR, displayPath } from './lib/paths.ts'
import { createReporter } from './lib/report.ts'
import { formatIssues, photoManifestSchema } from './lib/schema.ts'

/**
 * Checks a generated manifest without generating it — the CI gatekeeper: that
 * `build-images` ran without errors does not yet mean it did the right thing.
 */

const OPTIONS: OptionSpecs = {
  manifest: { type: 'string', placeholder: '<json>', description: 'Path to the manifest' },
  'expect-mode': {
    type: 'string',
    placeholder: '<content|demo>',
    description: 'Expected source mode',
  },
  'min-photos': { type: 'string', placeholder: '<n>', description: 'Minimum number of photos' },
}

const USAGE = 'Usage: node scripts/check-manifest.ts [options]'

function main(): void {
  if (wantsHelp()) {
    console.log(formatHelp(USAGE, OPTIONS))
    return
  }

  const flags = parseFlags(OPTIONS)
  const file = flags.str('manifest') ?? MANIFEST_PATH
  const expectMode = flags.str('expect-mode')
  const rawMinPhotos = flags.str('min-photos')
  const minPhotos = rawMinPhotos === undefined ? 1 : Number(rawMinPhotos)
  // Unchecked, `--min-photos abc` becomes NaN, every comparison with it is
  // false, and the CI gate would stand silently open.
  if (!Number.isInteger(minPhotos) || minPhotos < 0) {
    throw new CliError(`--min-photos expects a whole number from 0 up, not "${rawMinPhotos}"`)
  }

  if (!existsSync(file)) throw new CliError(`manifest missing: ${displayPath(file)}`)

  const parsed = photoManifestSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
  const reporter = createReporter()

  if (!parsed.success) {
    for (const issue of formatIssues(parsed.error)) reporter.error('manifest', issue)
    reporter.finish()
    return
  }

  const manifest = parsed.data

  if (expectMode && manifest.sourceMode !== expectMode) {
    reporter.error('sourceMode', `expected ${expectMode}, found ${manifest.sourceMode}`)
  }
  if (manifest.photos.length < minPhotos) {
    reporter.error('photos', `expected at least ${minPhotos}, found ${manifest.photos.length}`)
  }
  if (manifest.heroSlug === null) {
    reporter.error('heroSlug', 'no hero resolved')
  } else if (!manifest.photos.some((photo) => photo.slug === manifest.heroSlug)) {
    reporter.error('heroSlug', `${manifest.heroSlug} does not appear in photos`)
  }

  let checked = 0
  for (const photo of manifest.photos) {
    for (const entry of [...photo.files, photo.ogFile]) {
      const onDisk = path.join(PUBLIC_IMG_DIR, entry.path.replace('/img/', ''))
      if (!existsSync(onDisk)) reporter.error(photo.slug, `file missing: ${entry.path}`)
      checked += 1
    }
    if (photo.variants.avif.length === 0) reporter.error(photo.slug, 'no AVIF variant')
  }

  const { errors } = reporter.counts()
  console.log(
    `  ${manifest.photos.length} photos · mode ${manifest.sourceMode} · hero ${manifest.heroSlug} · ` +
      `${checked} files checked · ${errors === 0 ? 'ok' : `${errors} errors`}`,
  )
  reporter.finish()
}

try {
  main()
} catch (error) {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`)
    process.exitCode = 1
  } else {
    throw error
  }
}
