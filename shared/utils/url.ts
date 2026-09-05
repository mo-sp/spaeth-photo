/**
 * Absolute URLs für OpenGraph, Canonical und (ab P7) die Sitemap.
 *
 * Die Basis steht in `runtimeConfig.public.siteUrl` und wird beim Build
 * gesetzt (Coolify: BUILD-Variable) — bei einer statischen Seite gibt es zur
 * Laufzeit niemanden mehr, der sie einsetzen könnte. Fehlt sie, bleibt der
 * Pfad relativ: eine erfundene Domain wäre schlimmer als eine unvollständige
 * Angabe, und der Build soll daran nicht scheitern.
 */
export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.trim().replace(/\/+$/, '')
  if (base === '') return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
