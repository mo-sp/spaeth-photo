#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { CliError, formatHelp, parseFlags, wantsHelp, type OptionSpecs } from './lib/args.ts'
import { MANIFEST_PATH, PUBLIC_IMG_DIR, displayPath } from './lib/paths.ts'
import { createReporter } from './lib/report.ts'
import { formatIssues, photoManifestSchema } from './lib/schema.ts'

/**
 * Prüft ein erzeugtes Manifest, ohne es zu erzeugen. Gedacht als Torwächter in
 * der CI: dass `build-images` fehlerfrei durchläuft, heißt noch nicht, dass es
 * das Richtige getan hat. Hier wird nachgesehen, ob der erwartete Quellmodus
 * gewählt wurde, ob überhaupt Fotos entstanden sind und ob jede im Manifest
 * genannte Datei wirklich auf der Platte liegt.
 */

const OPTIONS: OptionSpecs = {
  manifest: { type: 'string', placeholder: '<json>', description: 'Pfad zum Manifest' },
  'expect-mode': {
    type: 'string',
    placeholder: '<content|demo>',
    description: 'Erwarteter Quellmodus',
  },
  'min-photos': { type: 'string', placeholder: '<n>', description: 'Mindestzahl an Fotos' },
}

const USAGE = 'Aufruf: node scripts/check-manifest.ts [Optionen]'

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
  // Ohne Prüfung wird aus `--min-photos abc` ein NaN, jeder Vergleich damit ist
  // falsch, und das Tor in der CI stünde still offen.
  if (!Number.isInteger(minPhotos) || minPhotos < 0) {
    throw new CliError(`--min-photos erwartet eine ganze Zahl ab 0, nicht „${rawMinPhotos}"`)
  }

  if (!existsSync(file)) throw new CliError(`Manifest fehlt: ${displayPath(file)}`)

  const parsed = photoManifestSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
  const reporter = createReporter()

  if (!parsed.success) {
    for (const issue of formatIssues(parsed.error)) reporter.error('manifest', issue)
    reporter.finish()
    return
  }

  const manifest = parsed.data

  if (expectMode && manifest.sourceMode !== expectMode) {
    reporter.error('sourceMode', `erwartet ${expectMode}, gefunden ${manifest.sourceMode}`)
  }
  if (manifest.photos.length < minPhotos) {
    reporter.error('photos', `erwartet mindestens ${minPhotos}, gefunden ${manifest.photos.length}`)
  }
  if (manifest.heroSlug === null) {
    reporter.error('heroSlug', 'kein Hero aufgelöst')
  } else if (!manifest.photos.some((photo) => photo.slug === manifest.heroSlug)) {
    reporter.error('heroSlug', `${manifest.heroSlug} kommt in photos nicht vor`)
  }

  let checked = 0
  for (const photo of manifest.photos) {
    for (const entry of [...photo.files, photo.ogFile]) {
      const onDisk = path.join(PUBLIC_IMG_DIR, entry.path.replace('/img/', ''))
      if (!existsSync(onDisk)) reporter.error(photo.slug, `Datei fehlt: ${entry.path}`)
      checked += 1
    }
    if (photo.variants.avif.length === 0) reporter.error(photo.slug, 'keine AVIF-Variante')
  }

  const { errors } = reporter.counts()
  console.log(
    `  ${manifest.photos.length} Fotos · Modus ${manifest.sourceMode} · Hero ${manifest.heroSlug} · ` +
      `${checked} Dateien geprüft · ${errors === 0 ? 'in Ordnung' : `${errors} Fehler`}`,
  )
  reporter.finish()
}

try {
  main()
} catch (error) {
  if (error instanceof CliError) {
    console.error(`Fehler: ${error.message}`)
    process.exitCode = 1
  } else {
    throw error
  }
}
