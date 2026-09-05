import { createHash } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { z } from 'zod'
import { RENDER, type RenderResult } from './variants.ts'

/**
 * Incremental build: a full pass over the whole set costs minutes, an unchanged
 * run costs fractions of a second.
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
 * Fingerprint of all render settings plus the libvips version — a libvips
 * update can shift encoder defaults, and the outputs must not diverge silently.
 */
export function settingsHash(): string {
  const payload = JSON.stringify({ render: RENDER, vips: sharp.versions.vips })
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

export function emptyCache(): CacheFile {
  return { schema: CACHE_SCHEMA, settingsHash: settingsHash(), entries: {} }
}

/**
 * Only the fields the incremental build relies on: a missing `files` would run
 * `outputsPresent` into a TypeError. The rest is passed through unchecked.
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

/** A broken or stale cache is not an error, only a slower build: it is discarded. */
export function loadCache(file: string, expected = settingsHash()): CacheFile {
  if (!existsSync(file)) return emptyCache()
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return emptyCache()
  }
  if (!cacheFileSchema.safeParse(raw).success) return emptyCache()
  // Validated the shape, but work with the raw data: the render result carries
  // more fields than the cache needs to check.
  const cache = raw as CacheFile
  if (cache.settingsHash !== expected) return emptyCache()
  return { schema: CACHE_SCHEMA, settingsHash: expected, entries: cache.entries }
}

export function saveCache(file: string, cache: CacheFile): void {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(cache), 'utf8')
}

/** SHA-256 of the file, streamed — the sources are several megabytes each. */
export function hashFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex').slice(0, 16)))
  })
}

export type CacheVerdict = 'new' | 'changed' | 'metadata' | 'output missing' | 'forced' | 'cache'

export interface DecideInput {
  entry: CacheEntry | undefined
  stat: { mtimeMs: number; size: number } | null
  /** Called only when the mtime fast path does not apply. */
  readHash: () => Promise<string>
  metaHash: string
  force: boolean
  /** Checks that every output file recorded in the cache still exists. */
  outputsPresent: (entry: CacheEntry) => boolean
}

export interface Decision {
  verdict: CacheVerdict
  /** true = re-encode the images. */
  render: boolean
  sourceHash: string
}

export async function decide(input: DecideInput): Promise<Decision> {
  const { entry, stat, readHash, metaHash, force, outputsPresent } = input

  if (force) return { verdict: 'forced', render: true, sourceHash: await readHash() }
  if (!entry) return { verdict: 'new', render: true, sourceHash: await readHash() }

  // Same mtime and size ⇒ the file was not touched, so the hash need not be
  // read at all. A checkout changes the mtime without touching the content —
  // that is why the hash decides in the end.
  const untouched = stat !== null && stat.mtimeMs === entry.mtimeMs && stat.size === entry.size
  const sourceHash = untouched ? entry.sourceHash : await readHash()

  if (sourceHash !== entry.sourceHash) return { verdict: 'changed', render: true, sourceHash }
  if (!outputsPresent(entry)) return { verdict: 'output missing', render: true, sourceHash }
  if (metaHash !== entry.metaHash) return { verdict: 'metadata', render: false, sourceHash }
  return { verdict: 'cache', render: false, sourceHash }
}
