/** How the background clip is shown; see `docs/architecture.md`, "Start page". */
export type VideoVariant = 'full' | 'band'

/**
 * Prototype scaffolding: `?video=band` shows the clip as a hero band instead of
 * the full-page background, so the two light-mode treatments can be compared
 * side by side in the preview. Goes away once P11 has decided.
 */
export const VIDEO_QUERY = 'video'

/**
 * The clip and where it belongs. `videoSlug` is a build value: without a clip in
 * the private content repo it is empty, and the home page keeps its hero photo.
 */
export function useSiteVideo() {
  const { videoSlug } = useRuntimeConfig().public
  const route = useRoute()
  const hydrated = useHydrated()

  // The home page of either tree, and nowhere else: a deep link opens on the
  // page it names, never on the start page's stage.
  const active = computed(() => videoSlug !== '' && stripLocale(pagePath(route.path)) === '/')

  // Read only after hydration: the prerendered HTML knows no query string, and
  // the first client render has to match it.
  const variant = computed<VideoVariant>(() =>
    hydrated.value && route.query[VIDEO_QUERY] === 'band' ? 'band' : 'full',
  )

  return { slug: videoSlug, active, variant }
}

/**
 * The beat at which the clip starts. The intro holds it back until the wordmark
 * has had the stage; without an intro the backdrop releases it itself.
 */
export function useVideoStarted() {
  return useState('video-started', () => false)
}
