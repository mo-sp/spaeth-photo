import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import type { PhotoMeta, Tag } from '../../shared/types/photo.ts'
import { TAG_ORDER } from '../../shared/utils/tags.ts'
import { formatIssues, photoMetaSchema } from './schema.ts'
import { formatExifDate } from './exif.ts'

/**
 * Lesen und Schreiben der `photos/meta/<slug>.yaml`.
 *
 * Geschrieben wird von Hand statt über `YAML.stringify`, weil die Reihenfolge
 * und die Schreibweise der Felder Teil der Konvention sind (content/CLAUDE.md)
 * und ein Diff im privaten Repo lesbar bleiben soll. Gelesen wird über die
 * `yaml`-Bibliothek — das Parsen ist der Teil, den man nicht selbst schreibt.
 */

export type MetaResult = { ok: true; value: PhotoMeta } | { ok: false; issues: string[] }

/** YAML-Doppelquote-Skalar. JSON-Escapes sind eine Teilmenge der YAML-Escapes. */
export function yamlString(value: string): string {
  return JSON.stringify(value)
}

/**
 * Tags in der kanonischen Reihenfolge aus `shared/utils/tags.ts`, ohne
 * Dubletten. Nimmt nur bereits geprüfte Tags entgegen — beide Aufrufer haben
 * sie zuvor durch `tagSchema` geschickt, ein zweiter Filter hier wäre toter
 * Code, der Unbekanntes stillschweigend verschlucken würde.
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
 * YAML 1.2 kennt keinen Zeitstempel-Typ, `date: 2020-08-14` kommt also als
 * String zurück. Ältere Parser (und ein von Hand gesetztes `!!timestamp`)
 * liefern ein Date — beides wird hier auf `YYYY-MM-DD` gebracht, bevor das
 * Schema greift.
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
    return { ok: false, issues: [`YAML nicht lesbar: ${(error as Error).message}`] }
  }
  if (raw === null || raw === undefined) return { ok: false, issues: ['Datei ist leer'] }

  const parsed = photoMetaSchema.safeParse(normalizeMetaInput(raw))
  if (!parsed.success) return { ok: false, issues: formatIssues(parsed.error) }
  return { ok: true, value: { ...parsed.data, tags: sortTags(parsed.data.tags) } }
}

export function readMetaFile(file: string): MetaResult {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    return { ok: false, issues: [`Datei nicht lesbar: ${(error as Error).message}`] }
  }
  return parseMeta(text)
}

/**
 * Fingerabdruck der Metadaten für den Cache. Ändert sich nur der YAML-Inhalt,
 * wird das Manifest neu geschrieben, aber kein Bild neu kodiert.
 */
export function metaHash(meta: PhotoMeta): string {
  return createHash('sha256').update(renderMetaYaml(meta)).digest('hex').slice(0, 16)
}
