/**
 * Datenmodell der Foto-Pipeline. Diese Datei enthält ausschließlich Typen —
 * kein Laufzeitcode —, damit sowohl die Build-Skripte (Node) als auch das
 * Frontend (Vite) sie ohne Nebenwirkungen importieren können.
 *
 * Die zod-Schemata in `scripts/lib/schema.ts` sind bidirektional an diese Typen
 * geklammert: Sie sind als `z.ZodType<T>` deklariert und ihr `z.infer` wird
 * gegen `T` geprüft. Eine Änderung hier bricht dort den Typecheck und umgekehrt.
 */

/** Erlaubte Tags. Reihenfolge und Anzeige-Label in `shared/constants/tags.ts`. */
export type Tag = 'tiere' | 'natur' | 'landschaft' | 'segeln' | 'schwarzweiss'

export type Orientation = 'landscape' | 'portrait' | 'square'

export type VariantFormat = 'avif' | 'webp' | 'jpeg'

/** Inhalt einer `photos/meta/<slug>.yaml` nach der Validierung. */
export interface PhotoMeta {
  /** Pflicht, nicht leer. */
  title: string
  /** Aufnahmedatum, `YYYY-MM-DD`. */
  date: string
  tags: Tag[]
  /** Spätere Serien; Phase 1 immer null. */
  collection: string | null
  camera: string | null
  lens: string | null
  /** Kandidat für die kuratierte Auswahl der Startseite. */
  featured: boolean
  /** Genau ein Foto im Bestand darf `true` sein. */
  hero: boolean
  /** Position in der Startseiten-Auswahl; sonst null. */
  order: number | null
  /** Phase 2 (Print-Verkauf); Phase 1 immer null. */
  print: null
}

/** Erzeugte Breiten je Format. Die URLs ergeben sich per Konvention. */
export interface PhotoVariants {
  avif: number[]
  webp: number[]
  jpeg: number[]
}

/**
 * Ein Foto, wie es das Frontend sieht (`app/data/photos.index.json`).
 * Bild-URLs werden nicht gespeichert, sondern per Konvention gebildet:
 * `/img/<slug>/<breite>.<ext>`.
 */
export interface PhotoIndexEntry {
  slug: string
  title: string
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
  /** Pixelmaße der größten erzeugten Stufe. */
  width: number
  height: number
  /** `width / height`, auf 6 Nachkommastellen gerundet. */
  aspectRatio: number
  orientation: Orientation
  /** Durchschnittsfarbe als `#rrggbb` — Kachel-Hintergrund ohne Blur. */
  color: string
  /** 20-px-WebP als Data-URI (Blur-up auf Hero und Detailseite). */
  lqip: string
  variants: PhotoVariants
  /** OpenGraph-Bild, 1200×630. */
  og: string
}

export interface TagCount {
  tag: Tag
  count: number
}

/** Der Client-Index — einzige Datenquelle des Frontends zur Laufzeit. */
export interface PhotoIndexFile {
  schema: 1
  generatedAt: string
  sourceMode: SourceMode
  /** Slug des Hero-Fotos; null nur, wenn es kein einziges Foto gibt. */
  heroSlug: string | null
  tags: TagCount[]
  photos: PhotoIndexEntry[]
}

export type SourceMode = 'content' | 'demo'

/** Eine konkret geschriebene Bilddatei unter `public/img/`. */
export interface ManifestFile {
  format: VariantFormat
  width: number
  height: number
  /** Pfad relativ zur Site-Wurzel, z. B. `/img/<slug>/960.avif`. */
  path: string
  bytes: number
}

/** Ein Foto im vollständigen Build-Manifest (`photos.manifest.json`). */
export interface ManifestPhoto extends PhotoIndexEntry {
  /** Maße der Quelldatei vor dem Resizen. */
  sourceWidth: number
  sourceHeight: number
  sourceBytes: number
  /** SHA-256 der Quelldatei (Kurzform), Grundlage des inkrementellen Builds. */
  sourceHash: string
  files: ManifestFile[]
  ogFile: ManifestFile
  /** Summe aller erzeugten Dateien dieses Fotos in Byte. */
  totalBytes: number
}

/** Das vollständige Manifest — Build-Artefakt, nicht ausgeliefert. */
export interface PhotoManifest {
  schema: 1
  generatedAt: string
  sourceMode: SourceMode
  /** Quellverzeichnis relativ zur Projektwurzel (Diagnose). */
  sourceDir: string
  heroSlug: string | null
  tags: TagCount[]
  photos: ManifestPhoto[]
}
