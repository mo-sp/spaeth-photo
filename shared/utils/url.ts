/**
 * Absolute URLs for OpenGraph, canonical and the sitemap. The base comes from
 * `runtimeConfig.public.siteUrl`, a *build* variable — a static site has no
 * request at runtime. Missing base leaves the path relative rather than
 * inventing a host or failing the build.
 */
export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.trim().replace(/\/+$/, '')
  if (base === '') return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
