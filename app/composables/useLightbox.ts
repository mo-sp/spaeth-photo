import type { PhotoIndexEntry } from '#shared/types/photo'

/**
 * Die Lightbox lebt in der URL (`?foto=<slug>`), nicht in einem Store.
 *
 * Damit ist sie teilbar, der Zurück-Knopf schließt sie, und Galerie-Seite wie
 * Dialog leiten ihren Zustand aus derselben Quelle ab — ohne dass die eine der
 * anderen etwas mitteilen müsste.
 */

/**
 * Ob dieser Tab die Lightbox selbst auf den Verlauf gelegt hat. Modul-Scope,
 * aber ausschließlich im Browser geschrieben: beim Prerendern wird nichts
 * geöffnet, es kann also nichts zwischen zwei Anfragen hängen bleiben. Ohne
 * das Flag würde ein `back()` beim Schließen die Seite verlassen, wenn jemand
 * mit `?foto=…` in der Adresszeile eingestiegen ist.
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

  /** Öffnen legt genau einen Eintrag auf den Verlauf. */
  function open(target: string) {
    pushedByLightbox.value = true
    return router.push({ path: route.path, query: { ...route.query, foto: target } })
  }

  /** Blättern ersetzt ihn, sonst sammelt der Zurück-Knopf jede Kachel ein. */
  function go(target: string) {
    return router.replace({ path: route.path, query: { ...route.query, foto: target } })
  }

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
