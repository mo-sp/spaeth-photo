import type { PhotoIndexEntry, Tag } from '#shared/types/photo'

/**
 * Der Zustand der Detailseite: das Foto, seine Nachbarn und der Filterkontext.
 *
 * Der Tag ist hier **weicher** Zustand. Er steht als `?tag=` in der URL, aber
 * die Seite selbst ist unter `/foto/<slug>` prerendert — ohne Query. Läse die
 * Komponente die Query schon beim ersten Rendern, unterschiede sich der
 * hydrierte Baum vom ausgelieferten HTML (andere Nachbarn, anderer Zähler,
 * anderer Rückweg), und Vue müsste ihn verwerfen.
 *
 * Deshalb das `hydrated`-Flag aus `onMounted`: server- und clientseitig ist der
 * erste Durchlauf identisch (ungefilterte Liste), erst danach zieht der Filter.
 * `import.meta.client` reicht dafür nicht — es ist im Browser schon beim
 * Hydrieren wahr und erzeugt genau den Unterschied, den es vermeiden soll.
 */
export function usePhotoNav() {
  const route = useRoute()
  const { photos } = usePhotos()
  const { path } = useI18n()

  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })

  const slug = computed(() => String(route.params.slug ?? ''))

  const queryTag = computed<Tag | null>(() => (hydrated.value ? parseTag(route.query.tag) : null))

  /**
   * Der Filterkontext gilt nur, wenn das Bild in ihm überhaupt vorkommt.
   * `/foto/anleger-im-gegenlicht?tag=segeln` ist von Hand zusammengesetzt oder
   * ein alt gewordener Link — ohne diese Prüfung stünde dort „00 / 04" ohne
   * Nachbarn, und der Rückweg führte in eine Galerie, in der das Bild nicht ist.
   */
  const tag = computed<Tag | null>(() => {
    const wanted = queryTag.value
    if (wanted === null) return null
    const current = photos.find((entry) => entry.slug === slug.value)
    return current?.tags.includes(wanted) ? wanted : null
  })

  /** Die Liste, in der Prev/Next laufen: der Filterkontext, sonst alles. */
  const list = computed<PhotoIndexEntry[]>(() => filterByTag(photos, tag.value))

  const nav = computed(() => neighbours(list.value, slug.value))

  /** Reicht den Filterkontext an jeden Link der Seite weiter. */
  const query = computed(() => {
    const value: Record<string, string> = {}
    if (tag.value !== null) value.tag = tag.value
    return value
  })

  /** Der Rückweg führt in die gefilterte Galerie, wenn es einen Filter gibt. */
  const backTo = computed(() =>
    path(tag.value === null ? '/gallery' : `/gallery/${tag.value}`),
  )

  /** Ziel eines Nachbarn — mitsamt Filterkontext. */
  function pathTo(photo: PhotoIndexEntry | null) {
    return photo === null ? null : { path: path(`/photo/${photo.slug}`), query: query.value }
  }

  return { hydrated, tag, slug, list, nav, query, backTo, pathTo }
}
