import { existsSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { VARIANT_EXTENSION } from '../../shared/constants/images.ts'
import { assertInside, displayPath } from './paths.ts'
import type { Reporter } from './report.ts'
import { isValidSlug } from './slug.ts'

/**
 * Aufräumen verwaister Ausgaben unterhalb des Bild-Ausgabeverzeichnisses.
 *
 * Diese Funktion löscht — sie ist deshalb die einzige Stelle der Pipeline, die
 * ihre Vorbedingungen selbst prüft, statt sich auf den Aufrufer zu verlassen.
 * Sie räumt nur auf, wenn der Lauf ein vollständiges Bild des Sollzustands
 * hatte:
 *
 * - **`--only` unterbindet das Aufräumen vollständig.** Bei einem Teillauf ist
 *   `keep` per Definition unvollständig: Slugs, die weder gerendert wurden noch
 *   einen Cache-Eintrag haben, fehlen darin, obwohl ihre Ausgaben gültig sind.
 * - **Fehler unterbinden das Aufräumen.** Ein Foto mit kaputter YAML-Datei
 *   fällt aus dem Sollzustand heraus; der Lauf schreibt wegen des Fehlers
 *   ohnehin nichts, also darf er erst recht nichts löschen. Der Fehlerpfad ist
 *   nie destruktiv.
 * - **Ohne Quellbilder wird nicht aufgeräumt.** Ein leeres `keep` ist viel
 *   wahrscheinlicher ein Konfigurationsfehler als die Ansage, alles zu löschen.
 * - **`protectedSlugs`** bleiben unangetastet, auch wenn sie nicht in `keep`
 *   stehen.
 *
 * Was übrig bleibt, ist dreifach abgesichert: nur Pfade unterhalb von `dir`
 * (`assertInside`), nur Verzeichnisse mit gültigem Slug-Namen, nur Dateien,
 * deren Name dem Muster der erzeugten Varianten entspricht. Alles andere —
 * `README.md`, `.gitkeep`, Symlinks, fremde Verzeichnisse — wird gemeldet und
 * liegen gelassen.
 */

/** Nur diese Dateinamen dürfen unterhalb von `<dir>/<slug>/` liegen. */
export const OUTPUT_FILE_PATTERN = new RegExp(
  `^(?:\\d+\\.(?:${Object.values(VARIANT_EXTENSION).join('|')})|og\\.jpg)$`,
)

export interface CleanupOptions {
  /** Ausgabeverzeichnis, üblicherweise `public/img`. Es wird nie verlassen. */
  dir: string
  /** Sollzustand: Slug → erlaubte Dateinamen. */
  keep: Map<string, Set<string>>
  reporter: Reporter
  /** Nur berichten, nichts anfassen. */
  dryRun?: boolean
  /** Der Lauf war ein Teillauf (`--only`) — dann wird gar nicht aufgeräumt. */
  partial?: boolean
  /** Der Lauf hatte Fehler — dann wird gar nicht aufgeräumt. */
  hasErrors?: boolean
  /** Slugs, deren Ausgaben unabhängig von `keep` bleiben müssen. */
  protectedSlugs?: ReadonlySet<string>
}

export interface CleanupResult {
  files: number
  dirs: number
  /** Grund, falls gar nicht aufgeräumt wurde. */
  skipped: 'partial' | 'errors' | 'leer' | 'kein-verzeichnis' | null
}

export function cleanupOrphans(options: CleanupOptions): CleanupResult {
  const { dir, keep, reporter, dryRun = false, partial = false, hasErrors = false } = options
  const protectedSlugs = options.protectedSlugs ?? new Set<string>()
  const removed: CleanupResult = { files: 0, dirs: 0, skipped: null }

  if (partial) {
    reporter.info('  Cleanup übersprungen (--only): der Lauf kennt nur einen Teil des Bestands.')
    return { ...removed, skipped: 'partial' }
  }
  if (hasErrors) {
    reporter.info('  Cleanup übersprungen (Fehler): der Fehlerpfad löscht nichts.')
    return { ...removed, skipped: 'errors' }
  }
  if (!existsSync(dir)) return { ...removed, skipped: 'kein-verzeichnis' }
  if (keep.size === 0) {
    reporter.warn('cleanup', 'keine Quellbilder — es wird nichts aufgeräumt')
    return { ...removed, skipped: 'leer' }
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = assertInside(dir, path.join(dir, entry.name))

    // Ein Symlink ist für readdir kein Verzeichnis; er landet hier und bleibt
    // liegen. Einen Symlink zu löschen hieße, über das Ausgabeverzeichnis
    // hinauszugreifen — genau das, was assertInside verhindern soll.
    if (entry.isSymbolicLink()) {
      reporter.warn('cleanup', `Symlink bleibt unangetastet: ${displayPath(full)}`)
      continue
    }

    if (!entry.isDirectory()) {
      reporter.warn('cleanup', `unerwartete Datei bleibt liegen: ${displayPath(full)}`)
      continue
    }

    const allowed = keep.get(entry.name)
    if (!allowed) {
      if (!isValidSlug(entry.name)) {
        reporter.warn('cleanup', `unerwartetes Verzeichnis bleibt liegen: ${displayPath(full)}`)
        continue
      }
      if (protectedSlugs.has(entry.name)) {
        reporter.warn('cleanup', `${entry.name}: Ausgaben bleiben stehen (Foto mit Fehler)`)
        continue
      }
      const count = readdirSync(full).length
      reporter.step(dryRun ? 'entfiele' : 'entfernt', entry.name, `${count} Dateien · Quelle fehlt`)
      if (!dryRun) rmSync(full, { recursive: true, force: true })
      removed.dirs += 1
      continue
    }

    for (const file of readdirSync(full, { withFileTypes: true })) {
      if (allowed.has(file.name)) continue
      const target = assertInside(full, path.join(full, file.name))
      if (!file.isFile() || file.isSymbolicLink() || !OUTPUT_FILE_PATTERN.test(file.name)) {
        reporter.warn('cleanup', `unerwarteter Eintrag bleibt liegen: ${displayPath(target)}`)
        continue
      }
      reporter.step(
        dryRun ? 'entfiele' : 'entfernt',
        `${entry.name}/${file.name}`,
        'Variante entfällt',
      )
      if (!dryRun) unlinkSync(target)
      removed.files += 1
    }
  }

  return removed
}
