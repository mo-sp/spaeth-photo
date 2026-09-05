import { createHash } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { z } from 'zod'
import { RENDER, type RenderResult } from './variants.ts'

/**
 * Inkrementeller Build. Ohne Cache kostet ein Durchlauf über den ganzen
 * Bestand Minuten; mit Cache kostet ein Lauf ohne Änderungen Sekundenbruchteile.
 *
 * Drei Fragen entscheiden, ob neu gerendert wird:
 *
 * 1. Haben sich die Render-Einstellungen oder libvips geändert? Dann alles neu —
 *    sonst mischen sich in `public/img/` Ausgaben zweier Konfigurationen.
 * 2. Hat sich die Quelldatei geändert? Erst über mtime und Größe (billig), bei
 *    Abweichung über den Inhaltshash (verlässlich). Ein Checkout ändert die
 *    mtime, ohne den Inhalt anzufassen — deshalb entscheidet am Ende der Hash.
 * 3. Hat sich nur die YAML-Datei geändert? Dann wird das Manifest neu
 *    geschrieben, aber kein einziges Bild neu kodiert.
 */

export const CACHE_SCHEMA = 1

export interface CacheEntry {
  sourceHash: string
  mtimeMs: number
  size: number
  metaHash: string
  render: RenderResult
}

export interface CacheFile {
  schema: number
  settingsHash: string
  entries: Record<string, CacheEntry>
}

/**
 * Fingerabdruck aller Render-Einstellungen plus der libvips-Version. Ein
 * libvips-Update kann Encoder-Voreinstellungen verschieben; dann sollen die
 * Ausgaben neu entstehen, statt still zu divergieren.
 */
export function settingsHash(): string {
  const payload = JSON.stringify({ render: RENDER, vips: sharp.versions.vips })
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

export function emptyCache(): CacheFile {
  return { schema: CACHE_SCHEMA, settingsHash: settingsHash(), entries: {} }
}

/**
 * Schlankes Schema der Cache-Datei. Es prüft nicht das ganze Render-Ergebnis,
 * sondern genau die Felder, auf die der inkrementelle Build sich verlässt:
 * fehlte etwa `files`, liefe `outputsPresent` in einen TypeError, und ein
 * abgeschnittener `path` ließe die Pipeline an einer Datei vorbeisehen, die es
 * gar nicht gibt. Der Rest des Ergebnisses wird unverändert durchgereicht.
 */
const manifestFileSchema = z.object({
  format: z.string(),
  width: z.number(),
  height: z.number(),
  path: z.string(),
  bytes: z.number(),
})

const cacheFileSchema = z.object({
  schema: z.literal(CACHE_SCHEMA),
  settingsHash: z.string(),
  entries: z.record(
    z.string(),
    z.object({
      sourceHash: z.string(),
      mtimeMs: z.number(),
      size: z.number(),
      metaHash: z.string(),
      render: z.object({ files: z.array(manifestFileSchema), ogFile: manifestFileSchema }).loose(),
    }),
  ),
})

/**
 * Ein defekter oder veralteter Cache ist kein Fehler, sondern nur ein
 * langsamerer Build: er wird verworfen.
 */
export function loadCache(file: string, expected = settingsHash()): CacheFile {
  if (!existsSync(file)) return emptyCache()
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return emptyCache()
  }
  if (!cacheFileSchema.safeParse(raw).success) return emptyCache()
  // Geprüft ist die Struktur, gearbeitet wird mit den Originaldaten: das
  // Render-Ergebnis trägt mehr Felder, als der Cache prüfen muss.
  const cache = raw as CacheFile
  if (cache.settingsHash !== expected) return emptyCache()
  return { schema: CACHE_SCHEMA, settingsHash: expected, entries: cache.entries }
}

export function saveCache(file: string, cache: CacheFile): void {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(cache), 'utf8')
}

/** SHA-256 der Datei, gestreamt — die Quellen sind einige Megabyte groß. */
export function hashFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex').slice(0, 16)))
  })
}

export type CacheVerdict =
  'neu' | 'geändert' | 'metadaten' | 'ausgabe fehlt' | 'erzwungen' | 'cache'

export interface DecideInput {
  entry: CacheEntry | undefined
  stat: { mtimeMs: number; size: number } | null
  /** Wird nur aufgerufen, wenn der mtime-Schnellpfad nicht greift. */
  readHash: () => Promise<string>
  metaHash: string
  force: boolean
  /** Prüft, ob alle im Cache vermerkten Ausgabedateien noch existieren. */
  outputsPresent: (entry: CacheEntry) => boolean
}

export interface Decision {
  verdict: CacheVerdict
  /** true = Bilder neu kodieren. */
  render: boolean
  sourceHash: string
}

export async function decide(input: DecideInput): Promise<Decision> {
  const { entry, stat, readHash, metaHash, force, outputsPresent } = input

  if (force) return { verdict: 'erzwungen', render: true, sourceHash: await readHash() }
  if (!entry) return { verdict: 'neu', render: true, sourceHash: await readHash() }

  // Schnellpfad: gleiche mtime und Größe ⇒ die Datei wurde nicht angefasst,
  // der Hash muss gar nicht erst gelesen werden.
  const untouched = stat !== null && stat.mtimeMs === entry.mtimeMs && stat.size === entry.size
  const sourceHash = untouched ? entry.sourceHash : await readHash()

  if (sourceHash !== entry.sourceHash) return { verdict: 'geändert', render: true, sourceHash }
  if (!outputsPresent(entry)) return { verdict: 'ausgabe fehlt', render: true, sourceHash }
  if (metaHash !== entry.metaHash) return { verdict: 'metadaten', render: false, sourceHash }
  return { verdict: 'cache', render: false, sourceHash }
}
