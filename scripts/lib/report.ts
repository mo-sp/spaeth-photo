import { styleText } from 'node:util'

/**
 * Ausgabe und Fehlersammlung der CLIs. Kein chalk: `node:util.styleText` kann
 * dasselbe und prüft selbst, ob der Zielstream Farbe unterstützt (NO_COLOR,
 * Pipe in eine Datei, CI ohne TTY).
 *
 * Grundsatz der Ausgabe: **eine Zeile je Änderung**, unveränderte Bilder
 * schweigen. Am Ende eine Summenzeile und, falls etwas anzumerken war, eine
 * Tabelle aus WARN- und ERROR-Zeilen.
 */

export type IssueLevel = 'error' | 'warn'

export interface Issue {
  level: IssueLevel
  /** Bezugspunkt, meist ein Slug oder ein Dateiname. */
  scope: string
  message: string
}

export interface Reporter {
  info(message: string): void
  step(label: string, subject: string, detail?: string): void
  warn(scope: string, message: string): void
  error(scope: string, message: string): void
  issues: Issue[]
  counts(): { errors: number; warnings: number }
  /**
   * Gibt die gesammelten Meldungen aus und setzt `process.exitCode`:
   * Fehler immer, Warnungen nur mit `--strict`.
   */
  finish(options?: { strict?: boolean }): void
}

function color(text: string, format: Parameters<typeof styleText>[0]): string {
  return styleText(format, text, { stream: process.stdout, validateStream: true })
}

const LEVEL_STYLE: Record<IssueLevel, { label: string; format: 'red' | 'yellow' }> = {
  error: { label: 'ERROR', format: 'red' },
  warn: { label: 'WARN ', format: 'yellow' },
}

export function createReporter(): Reporter {
  const issues: Issue[] = []

  const reporter: Reporter = {
    issues,
    info(message) {
      console.log(message)
    },
    step(label, subject, detail) {
      const padded = color(label.padEnd(9), 'cyan')
      console.log(`  ${padded}${subject}${detail ? color(`  ${detail}`, 'gray') : ''}`)
    },
    warn(scope, message) {
      issues.push({ level: 'warn', scope, message })
    },
    error(scope, message) {
      issues.push({ level: 'error', scope, message })
    },
    counts() {
      return {
        errors: issues.filter((issue) => issue.level === 'error').length,
        warnings: issues.filter((issue) => issue.level === 'warn').length,
      }
    },
    finish(options = {}) {
      const { errors, warnings } = reporter.counts()
      if (issues.length > 0) {
        console.log('')
        const width = Math.max(...issues.map((issue) => issue.scope.length))
        for (const issue of issues) {
          const style = LEVEL_STYLE[issue.level]
          console.log(
            `  ${color(style.label, style.format)}  ${issue.scope.padEnd(width)}  ${issue.message}`,
          )
        }
      }
      if (errors > 0) {
        process.exitCode = 1
      } else if (warnings > 0 && options.strict) {
        console.log('')
        console.log(color(`  --strict: ${warnings} Warnung(en) gelten als Fehler.`, 'yellow'))
        process.exitCode = 1
      }
    },
  }

  return reporter
}

/** `1536000` → `1,5 MB`. Deutsche Schreibweise, weil alle Ausgaben deutsch sind. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0).replace('.', ',')} KB`
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`
}

/** `2345` → `2,3 s`. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}
