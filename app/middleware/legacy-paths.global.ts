/**
 * Rewrites the German paths and tag slugs of P4-P7, and the old `?tag=` filter
 * query, to their current form in whichever language tree they arrive in.
 * Client-side only: a static host cannot answer with a 301, and the site was
 * never deployed under those addresses.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const rewritten = rewriteLegacyPath(to.path)
  if (rewritten !== null) {
    return navigateTo({ path: rewritten, query: to.query, hash: to.hash }, { replace: true })
  }

  const locale = localeOf(to.path)
  if (stripLocale(to.path) !== '/gallery') return
  const raw = to.query.tag
  if (typeof raw !== 'string' || raw === '') return
  const tag = parseTag(raw) ?? parseTag(rewriteLegacyTag(raw) ?? '')
  if (tag === null) return

  const query = { ...to.query }
  delete query.tag
  return navigateTo({ path: localePath(`/gallery/${tag}`, locale), query }, { replace: true })
})
