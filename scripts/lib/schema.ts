import { z } from 'zod'
import { TAG_ORDER } from '../../shared/utils/tags.ts'
import type {
  ManifestFile,
  ManifestPhoto,
  PhotoIndexEntry,
  PhotoIndexFile,
  PhotoManifest,
  PhotoMeta,
  PhotoVariants,
  TagCount,
} from '../../shared/types/photo.ts'
import { SLUG_PATTERN } from './slug.ts'

/**
 * Laufzeit-Validierung der Metadaten und der erzeugten Artefakte.
 *
 * Die Schemata sind **bidirektional** an `shared/types/photo.ts` geklammert:
 * `AssertExact` erzwingt Gleichheit in beide Richtungen. Wer ein Feld nur im
 * Typ oder nur im Schema ändert, bekommt einen Typfehler statt einer stillen
 * Abweichung zwischen Compile- und Laufzeit.
 */

type Identical<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type AssertExact<A, B> = Identical<A, B> extends true ? true : never

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const tagSchema = z.enum(TAG_ORDER)

export const slugSchema = z
  .string()
  .regex(SLUG_PATTERN, 'Slug muss kleingeschrieben, kebab-case und ASCII sein')

export const dateSchema = z
  .string()
  .regex(DATE_PATTERN, 'Datum muss YYYY-MM-DD sein')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, 'Datum existiert nicht')

/** Schema einer `photos/meta/<slug>.yaml`. */
export const photoMetaSchema = z
  .object({
    // `title` is English and primary; the `_de` fields may be missing.
    title: z.string().trim().min(1, 'title darf nicht leer sein'),
    title_de: z.string().trim().min(1).nullable().default(null),
    alt: z.string().trim().min(1).nullable().default(null),
    alt_de: z.string().trim().min(1).nullable().default(null),
    date: dateSchema,
    // Alles außer Titel und Datum darf in einer handgeschriebenen Datei fehlen
    // und wird auf den dokumentierten Standardwert gesetzt. Unbekannte
    // Schlüssel bleiben dank `.strict()` trotzdem ein Fehler — ein Tippfehler
    // soll auffallen, eine Auslassung nicht stören.
    tags: z.array(tagSchema).default([]),
    collection: z.string().min(1).nullable().default(null),
    camera: z.string().min(1).nullable().default(null),
    lens: z.string().min(1).nullable().default(null),
    featured: z.boolean().default(false),
    hero: z.boolean().default(false),
    order: z.int().positive().nullable().default(null),
    print: z.null().default(null),
  })
  .strict()

export const photoMetaTypeCheck: AssertExact<z.infer<typeof photoMetaSchema>, PhotoMeta> = true

const variantsSchema = z
  .object({
    avif: z.array(z.int().positive()),
    webp: z.array(z.int().positive()),
    jpeg: z.array(z.int().positive()),
  })
  .strict()

export const variantsTypeCheck: AssertExact<z.infer<typeof variantsSchema>, PhotoVariants> = true

const tagCountSchema = z.object({ tag: tagSchema, count: z.int().positive() }).strict()

export const tagCountTypeCheck: AssertExact<z.infer<typeof tagCountSchema>, TagCount> = true

const indexEntryShape = {
  slug: slugSchema,
  title: z.string().min(1),
  // Optional rather than nullable: the index ships to the browser.
  titleDe: z.string().min(1).optional(),
  alt: z.string().min(1).nullable(),
  altDe: z.string().min(1).optional(),
  date: dateSchema,
  year: z.int(),
  tags: z.array(tagSchema),
  collection: z.string().nullable(),
  camera: z.string().nullable(),
  lens: z.string().nullable(),
  featured: z.boolean(),
  hero: z.boolean(),
  order: z.int().positive().nullable(),
  width: z.int().positive(),
  height: z.int().positive(),
  aspectRatio: z.number().positive(),
  orientation: z.enum(['landscape', 'portrait', 'square']),
  color: z.string().regex(/^#[0-9a-f]{6}$/, 'Farbe muss #rrggbb sein'),
  lqip: z.string().startsWith('data:image/webp;base64,'),
  variants: variantsSchema,
  og: z.string().startsWith('/img/'),
}

export const photoIndexEntrySchema = z.object(indexEntryShape).strict()

export const photoIndexEntryTypeCheck: AssertExact<
  z.infer<typeof photoIndexEntrySchema>,
  PhotoIndexEntry
> = true

const headShape = {
  schema: z.literal(1),
  generatedAt: z.string().min(1),
  sourceMode: z.enum(['content', 'demo']),
  heroSlug: slugSchema.nullable(),
  tags: z.array(tagCountSchema),
}

export const photoIndexFileSchema = z
  .object({ ...headShape, photos: z.array(photoIndexEntrySchema) })
  .strict()

export const photoIndexFileTypeCheck: AssertExact<
  z.infer<typeof photoIndexFileSchema>,
  PhotoIndexFile
> = true

const manifestFileSchema = z
  .object({
    format: z.enum(['avif', 'webp', 'jpeg']),
    width: z.int().positive(),
    height: z.int().positive(),
    path: z.string().startsWith('/img/'),
    bytes: z.int().positive(),
  })
  .strict()

export const manifestFileTypeCheck: AssertExact<
  z.infer<typeof manifestFileSchema>,
  ManifestFile
> = true

export const manifestPhotoSchema = z
  .object({
    ...indexEntryShape,
    sourceWidth: z.int().positive(),
    sourceHeight: z.int().positive(),
    sourceBytes: z.int().positive(),
    sourceHash: z.string().min(8),
    files: z.array(manifestFileSchema).min(1),
    ogFile: manifestFileSchema,
    totalBytes: z.int().positive(),
  })
  .strict()

export const manifestPhotoTypeCheck: AssertExact<
  z.infer<typeof manifestPhotoSchema>,
  ManifestPhoto
> = true

export const photoManifestSchema = z
  .object({
    ...headShape,
    sourceDir: z.string().min(1),
    photos: z.array(manifestPhotoSchema),
  })
  .strict()

export const photoManifestTypeCheck: AssertExact<
  z.infer<typeof photoManifestSchema>,
  PhotoManifest
> = true

/** Ein zod-Fehler als eine Zeile: `tags.1: Ungültiger Wert`. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.length > 0 ? issue.path.join('.') : '(Wurzel)'
    return `${where}: ${issue.message}`
  })
}
