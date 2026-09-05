/**
 * Rewrites the German paths of P4-P7 and the old `?tag=` filter query to their
 * current form. Client-side only: a static host cannot answer with a 301, and
 * the site was never deployed under those addresses.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const rewritten = rewriteLegacyPath(to.path)
  if (rewritten !== null) {
    return navigateTo({ path: rewritten, query: to.query, hash: to.hash }, { replace: true })
  }

  if (to.path !== '/gallery') return
  const tag = parseTag(to.query.tag)
  if (tag === null) return

  const query = { ...to.query }
  delete query.tag
  return navigateTo({ path: `/gallery/${tag}`, query }, { replace: true })
})
