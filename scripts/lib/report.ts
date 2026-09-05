import { styleText } from 'node:util'

/**
 * Output and error collection for the CLIs. Not chalk: `node:util.styleText`
 * does the same and checks by itself whether the target stream supports colour
 * (NO_COLOR, pipe into a file, CI without a TTY).
 *
 * One line per change; unchanged photos stay silent.
 */

export type IssueLevel = 'error' | 'warn'

export interface Issue {
  level: IssueLevel
  /** What the message is about, usually a slug or a file name. */
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
  /** Prints the collected messages; exits non-zero on errors, on warnings only with `--strict`. */
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
      const padded = color(label.padEnd(13), 'cyan')
      const name = subject.padEnd(30)
      console.log(`  ${padded}${name}${detail ? color(` ${detail}`, 'gray') : ''}`)
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
        console.log(color(`  --strict: ${warnings} warning(s) count as errors.`, 'yellow'))
        process.exitCode = 1
      }
    },
  }

  return reporter
}

/** `1536000` → `1.5 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** `2345` → `2.3 s`. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
