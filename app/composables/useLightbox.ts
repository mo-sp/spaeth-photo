import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * The lightbox lives in the URL (`?foto=<slug>`), not in a store: it is
 * shareable, the back button closes it, and page and dialog derive their state
 * from the same source.
 */

/**
 * Whether this tab pushed the lightbox onto the history itself. Module scope but
 * only ever written in the browser. Without the flag, closing a deep link
 * entered as `?foto=…` would `back()` right out of the site.
 */
const pushedByLightbox = ref(false)

export function useLightbox(photos: MaybeRefOrGetter<readonly PhotoIndexEntry[]>) {
  const route = useRoute()
  const router = useRouter()

  const list = computed(() => toValue(photos))

  const slug = computed(() => {
    const value = route.query.foto
    return typeof value === 'string' && value !== '' ? value : null
  })

  const current = computed(() => list.value.find((photo) => photo.slug === slug.value) ?? null)

  const isOpen = computed(() => current.value !== null)

  const nav = computed(() => neighbours(list.value, slug.value ?? ''))

  /** Opening pushes exactly one history entry. */
  function open(target: string) {
    pushedByLightbox.value = true
    return router.push({ path: route.path, query: { ...route.query, foto: target } })
  }

  /** Paging replaces it, or the back button would collect every tile. */
  function go(target: string) {
    return router.replace({ path: route.path, query: { ...route.query, foto: target } })
  }

  /**
   * The browser's back button closes the lightbox without running `close()`, so
   * the flag is reset whenever the state flips to closed, by any route.
   */
  watch(isOpen, (open) => {
    if (!open) pushedByLightbox.value = false
  })

  function close() {
    if (pushedByLightbox.value) {
      pushedByLightbox.value = false
      return router.back()
    }
    const query = { ...route.query }
    delete query.foto
    return router.replace({ path: route.path, query })
  }

  return { slug, current, isOpen, nav, open, go, close }
}
