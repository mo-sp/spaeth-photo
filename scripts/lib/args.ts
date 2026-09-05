import { parseArgs } from 'node:util'

/**
 * Dünne Hülle um `node:util.parseArgs`. Kein commander: die beiden CLIs haben
 * zusammen ein Dutzend Flags, und die Standardbibliothek deckt das ab.
 */

export interface OptionSpec {
  type: 'string' | 'boolean'
  short?: string
  /** Platzhalter für die Hilfe, z. B. `<dir>`. */
  placeholder?: string
  description: string
}

export type OptionSpecs = Record<string, OptionSpec>

export interface ParsedFlags {
  /** Boolescher Schalter; nicht gesetzt = false. */
  bool(name: string): boolean
  /** Wert eines `--name <wert>`-Flags; nicht gesetzt = undefined. */
  str(name: string): string | undefined
  positionals: string[]
}

export class CliError extends Error {}

export function parseFlags(
  specs: OptionSpecs,
  argv: string[] = process.argv.slice(2),
): ParsedFlags {
  const options: Record<string, { type: 'string' | 'boolean'; short?: string }> = {
    help: { type: 'boolean', short: 'h' },
  }
  for (const [name, spec] of Object.entries(specs)) {
    options[name] = spec.short ? { type: spec.type, short: spec.short } : { type: spec.type }
  }

  let values: Record<string, string | boolean | (string | boolean)[] | undefined>
  let positionals: string[]
  try {
    const parsed = parseArgs({ args: argv, options, allowPositionals: true, strict: true })
    values = parsed.values as typeof values
    positionals = parsed.positionals
  } catch (error) {
    throw new CliError(error instanceof Error ? error.message : String(error))
  }

  return {
    bool(name) {
      return values[name] === true
    },
    str(name) {
      const value = values[name]
      return typeof value === 'string' ? value : undefined
    },
    positionals,
  }
}

/** Hilfetext aus derselben Spezifikation, damit beides nicht auseinanderläuft. */
export function formatHelp(usage: string, specs: OptionSpecs): string {
  const rows = Object.entries(specs).map(([name, spec]) => {
    const flag = `--${name}${spec.placeholder ? ' ' + spec.placeholder : ''}`
    return [spec.short ? `-${spec.short}, ${flag}` : `    ${flag}`, spec.description] as const
  })
  const width = Math.max(...rows.map(([left]) => left.length))
  const lines = rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`)
  return [usage, '', 'Optionen:', ...lines, `  ${'    --help'.padEnd(width)}  Diese Hilfe`].join(
    '\n',
  )
}

/** true, wenn `--help` gesetzt ist (vor dem Zugriff auf andere Flags prüfen). */
export function wantsHelp(argv: string[] = process.argv.slice(2)): boolean {
  return argv.includes('--help') || argv.includes('-h')
}
