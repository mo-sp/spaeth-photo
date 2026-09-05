import type { InjectionKey } from 'vue'
import type { PhotoIndexEntry, Tag } from '#shared/types/photo'

/**
 * State of the detail page: the photo, its neighbours and the filter context.
 *
 * The tag is *soft* state. It rides in `?tag=`, but the page is prerendered
 * under `/photo/<slug>` without a query, so it may only take effect after
 * hydration — otherwise the hydrated tree would differ from the delivered HTML.
 */
function createPhotoNav() {
  const route = useRoute()
  const { photos } = usePhotos()
  const { path } = useI18n()

  const hydrated = useHydrated()

  const slug = computed(() => String(route.params.slug ?? ''))

  const queryTag = computed<Tag | null>(() => (hydrated.value ? parseTag(route.query.tag) : null))

  const tag = computed<Tag | null>(() => effectiveTag(photos, slug.value, queryTag.value))

  /** The list prev/next run in: the filter context, otherwise everything. */
  const list = computed<PhotoIndexEntry[]>(() => filterByTag(photos, tag.value))

  const nav = computed(() => neighbours(list.value, slug.value))

  /** Passes the filter context on to every link of the page. */
  const query = computed(() => {
    const value: Record<string, string> = {}
    if (tag.value !== null) value.tag = tag.value
    return value
  })

  const backTo = computed(() => path(tag.value === null ? '/gallery' : `/gallery/${tag.value}`))

  /** A neighbour's target, filter context included. */
  function pathTo(photo: PhotoIndexEntry | null) {
    return photo === null ? null : { path: path(`/photo/${photo.slug}`), query: query.value }
  }

  return { hydrated, tag, slug, list, nav, query, backTo, pathTo }
}

export type PhotoNav = ReturnType<typeof createPhotoNav>

const PHOTO_NAV = Symbol('photo-nav') as InjectionKey<PhotoNav>

/**
 * Created once in the layout, because the page and the sidebar components are
 * siblings rather than ancestor and descendant — three instantiations would
 * derive the same state three times.
 */
export function providePhotoNav(): PhotoNav {
  const nav = createPhotoNav()
  provide(PHOTO_NAV, nav)
  return nav
}

export function usePhotoNav(): PhotoNav {
  const provided = inject(PHOTO_NAV, null)
  if (provided !== null) return provided
  // Reachable only outside the default layout, where the derivation is correct
  // but no longer shared — worth knowing about while developing.
  if (import.meta.dev) {
    console.warn('[usePhotoNav] no provided instance; deriving a private one')
  }
  return createPhotoNav()
}
