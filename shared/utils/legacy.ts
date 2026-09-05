/**
 * The German paths of P4-P7, mapped to the English ones. Nothing was ever
 * deployed under them; this only catches links shared during development.
 */
const LEGACY_PATHS: Record<string, string> = {
  '/galerie': '/gallery',
  '/foto': '/photo',
  '/ueber': '/about',
  '/impressum': '/legal-notice',
  '/datenschutz': '/privacy',
}

/** The English path for a legacy one, or `null` if it is not a legacy path. */
export function rewriteLegacyPath(path: string): string | null {
  for (const [from, to] of Object.entries(LEGACY_PATHS)) {
    if (path === from) return to
    if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`
  }
  return null
}
