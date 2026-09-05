import { parseArgs } from 'node:util'

/**
 * Thin wrapper around `node:util.parseArgs`. Not commander: the two CLIs have a
 * dozen flags between them, which the standard library covers.
 */

export interface OptionSpec {
  type: 'string' | 'boolean'
  short?: string
  /** Placeholder for the help text, e.g. `<dir>`. */
  placeholder?: string
  description: string
}

export type OptionSpecs = Record<string, OptionSpec>

export interface ParsedFlags {
  /** Boolean switch; unset = false. */
  bool(name: string): boolean
  /** Value of a `--name <value>` flag; unset = undefined. */
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

/** Help text built from the same spec, so the two cannot drift apart. */
export function formatHelp(usage: string, specs: OptionSpecs): string {
  const rows = Object.entries(specs).map(([name, spec]) => {
    const flag = `--${name}${spec.placeholder ? ' ' + spec.placeholder : ''}`
    return [spec.short ? `-${spec.short}, ${flag}` : `    ${flag}`, spec.description] as const
  })
  const width = Math.max(...rows.map(([left]) => left.length))
  const lines = rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`)
  return [usage, '', 'Options:', ...lines, `  ${'    --help'.padEnd(width)}  This help`].join('\n')
}

/** true if `--help` is set; check this before touching any other flag. */
export function wantsHelp(argv: string[] = process.argv.slice(2)): boolean {
  return argv.includes('--help') || argv.includes('-h')
}
