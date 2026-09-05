import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import type { PhotoMeta, Tag } from '../../shared/types/photo.ts'
import { TAG_ORDER } from '../../shared/utils/tags.ts'
import { formatIssues, photoMetaSchema } from './schema.ts'
import { formatExifDate } from './exif.ts'

/**
 * Reading and writing `photos/meta/<slug>.yaml`. Written by hand rather than
 * with `YAML.stringify` because field order and spelling are part of the
 * convention (content/CLAUDE.md); read with the `yaml` library.
 */

export type MetaResult = { ok: true; value: PhotoMeta } | { ok: false; issues: string[] }

/** YAML double-quoted scalar: JSON escapes are a subset of the YAML ones. */
export function yamlString(value: string): string {
  return JSON.stringify(value)
}

/**
 * Tags in the canonical order from `shared/utils/tags.ts`, deduplicated. Takes
 * only pre-validated tags: both callers ran them through `tagSchema`, and a
 * second filter here would silently swallow anything unknown.
 */
export function sortTags(tags: readonly Tag[]): Tag[] {
  return [...new Set(tags)].sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b))
}

export function renderMetaYaml(meta: PhotoMeta): string {
  const tags = meta.tags.length > 0 ? `[${meta.tags.join(', ')}]` : '[]'
  const optional = (value: string | null) => (value === null ? 'null' : yamlString(value))
  return (
    [
      `title: ${yamlString(meta.title)}`,
      `title_de: ${optional(meta.title_de)}`,
      `alt: ${optional(meta.alt)}`,
      `alt_de: ${optional(meta.alt_de)}`,
      `date: ${meta.date}`,
      `tags: ${tags}`,
      `collection: ${optional(meta.collection)}`,
      `camera: ${optional(meta.camera)}`,
      `lens: ${optional(meta.lens)}`,
      `featured: ${meta.featured}`,
      `hero: ${meta.hero}`,
      `order: ${meta.order === null ? 'null' : meta.order}`,
      `print: null`,
    ].join('\n') + '\n'
  )
}

/**
 * YAML 1.2 has no timestamp type, so `date: 2020-08-14` comes back as a string;
 * older parsers and a hand-written `!!timestamp` yield a Date. Both are brought
 * to `YYYY-MM-DD` before the schema runs.
 */
export function normalizeMetaInput(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const record = { ...(raw as Record<string, unknown>) }
  if (record.date instanceof Date) record.date = formatExifDate(record.date)
  return record
}

export function parseMeta(text: string): MetaResult {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (error) {
    return { ok: false, issues: [`YAML not readable: ${(error as Error).message}`] }
  }
  if (raw === null || raw === undefined) return { ok: false, issues: ['file is empty'] }

  const parsed = photoMetaSchema.safeParse(normalizeMetaInput(raw))
  if (!parsed.success) return { ok: false, issues: formatIssues(parsed.error) }
  return { ok: true, value: { ...parsed.data, tags: sortTags(parsed.data.tags) } }
}

export function readMetaFile(file: string): MetaResult {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    return { ok: false, issues: [`file not readable: ${(error as Error).message}`] }
  }
  return parseMeta(text)
}

/**
 * Fingerprint of the metadata for the cache: when only the YAML changes, the
 * manifest is rewritten but no image is re-encoded.
 */
export function metaHash(meta: PhotoMeta): string {
  return createHash('sha256').update(renderMetaYaml(meta)).digest('hex').slice(0, 16)
}
