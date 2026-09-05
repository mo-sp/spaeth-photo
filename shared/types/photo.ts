/**
 * Data model of the photo pipeline. Types only, no runtime code, so both the
 * build scripts (Node) and the front end (Vite) can import it without side
 * effects. The zod schemas in `scripts/lib/schema.ts` are clamped to these
 * types in both directions: a change here breaks the typecheck there.
 */

/** Allowed tags. Order and display labels in `shared/utils/tags.ts`. */
export type Tag =
  'animals' | 'nature' | 'landscape' | 'sailing' | 'fire' | 'architecture' | 'black-and-white'

export type Orientation = 'landscape' | 'portrait' | 'square'

export type VariantFormat = 'avif' | 'webp' | 'jpeg'

/** Contents of a `photos/meta/<slug>.yaml` after validation. */
export interface PhotoMeta {
  /**
   * English title. Required and not empty — English is the primary language,
   * so a photo without one would show up untranslated in the main grid.
   */
  title: string
  /** German title. Optional; falls back to `title`. */
  title_de: string | null
  /**
   * Screen-reader description; falls back to the title. Kept separate because a
   * good title and a good description are rarely the same sentence.
   */
  alt: string | null
  /** German image description. Optional; falls back to the German title, never to `alt`. */
  alt_de: string | null
  /** Capture date, `YYYY-MM-DD`. */
  date: string
  tags: Tag[]
  /** Later series; always null in phase 1. */
  collection: string | null
  camera: string | null
  lens: string | null
  /** Candidate for the curated home-page selection. */
  featured: boolean
  /** Exactly one photo in the collection may be `true`. */
  hero: boolean
  /** Position in the home-page selection; null otherwise. */
  order: number | null
  /** Phase 2 (print sales); always null in phase 1. */
  print: null
}

/** Rendered widths per format. The URLs follow from the convention. */
export interface PhotoVariants {
  avif: number[]
  webp: number[]
  jpeg: number[]
}

/**
 * A photo as the front end sees it (`app/data/photos.index.json`). Image URLs
 * are not stored but built by convention: `/img/<slug>/<width>.<ext>`.
 */
export interface PhotoIndexEntry {
  slug: string
  /** English title, always present. */
  title: string
  /** German title. Absent when the YAML has none — `photoTitle` falls back. */
  titleDe?: string
  /** Description; `null` means the title is the description. */
  alt: string | null
  /** German image description. Absent when the YAML has none. */
  altDe?: string
  /** `YYYY-MM-DD` */
  date: string
  year: number
  tags: Tag[]
  collection: string | null
  camera: string | null
  lens: string | null
  featured: boolean
  hero: boolean
  order: number | null
  /** Pixel size of the largest rendered step. */
  width: number
  height: number
  /** `width / height`, rounded to 6 decimals. */
  aspectRatio: number
  orientation: Orientation
  /** Average colour as `#rrggbb` — tile background, no blur. */
  color: string
  /** 20 px WebP as a data URI (blur-up on hero and detail page). */
  lqip: string
  variants: PhotoVariants
  /** OpenGraph image, 1200×630. */
  og: string
}

export interface TagCount {
  tag: Tag
  count: number
}

/** The client index — the front end's only data source at runtime. */
export interface PhotoIndexFile {
  schema: 1
  generatedAt: string
  sourceMode: SourceMode
  /** Slug of the hero photo; null only when there is no photo at all. */
  heroSlug: string | null
  tags: TagCount[]
  photos: PhotoIndexEntry[]
}

export type SourceMode = 'content' | 'demo'

/** One image file actually written below `public/img/`. */
export interface ManifestFile {
  format: VariantFormat
  width: number
  height: number
  /** Path relative to the site root, e.g. `/img/<slug>/960.avif`. */
  path: string
  bytes: number
}

/** A photo in the full build manifest (`photos.manifest.json`). */
export interface ManifestPhoto extends PhotoIndexEntry {
  /** Dimensions of the source file before resizing. */
  sourceWidth: number
  sourceHeight: number
  sourceBytes: number
  /** Short SHA-256 of the source file; basis of the incremental build. */
  sourceHash: string
  files: ManifestFile[]
  ogFile: ManifestFile
  /** Total bytes of all files rendered for this photo. */
  totalBytes: number
}

/** The full manifest — a build artefact, not shipped. */
export interface PhotoManifest {
  schema: 1
  generatedAt: string
  sourceMode: SourceMode
  /** Source directory relative to the project root (diagnostics). */
  sourceDir: string
  heroSlug: string | null
  tags: TagCount[]
  photos: ManifestPhoto[]
}
