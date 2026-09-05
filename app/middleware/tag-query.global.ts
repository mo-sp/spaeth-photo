/**
 * Alte Filter-URLs auf die Pfadform bringen: `/galerie?tag=segeln` →
 * `/galerie/segeln`.
 *
 * Die Spec sah den Filter als Query vor; die Umsetzung nutzt Pfadrouten
 * (Begründung in docs/architecture.md). Geteilte Links aus der Entwurfsphase
 * sollen trotzdem am Ziel ankommen. Nur im Browser: beim Prerendern gibt es
 * keine Query-Routen, und `ignore: [/\?/]` hält sie auch draußen.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  if (to.path !== '/galerie') return

  const tag = parseTag(to.query.tag)
  if (tag === null) return

  const query = { ...to.query }
  delete query.tag
  return navigateTo({ path: `/galerie/${tag}`, query }, { replace: true })
})
