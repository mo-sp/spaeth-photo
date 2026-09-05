import { clipSlug } from '#shared/constants/video'

/**
 * The clip and whether this page shows one. Each palette has its own clip
 * (`shared/constants/video.ts`); `hasClips` is a build value, false when the
 * private content repo is not there, and the home page then keeps its hero
 * photograph.
 */
export function useSiteVideo() {
  const { hasClips } = useRuntimeConfig().public
  const route = useRoute()
  const { theme } = useTheme()

  // The home page of either tree, and nowhere else: a deep link opens on the
  // page it names, never on the start page's stage.
  const active = computed(() => hasClips && stripLocale(pagePath(route.path)) === '/')

  // `theme` is the default until `useTheme` reads the DOM on mount, so the
  // first client render still matches the prerendered HTML and only then
  // changes — the same rule the rest of the theme state follows.
  const slug = computed(() => clipSlug(theme.value))

  return { slug, active }
}

/**
 * The beat at which the clip starts. The intro holds it back until the wordmark
 * has had the stage; without an intro the backdrop releases it itself.
 */
export function useVideoStarted() {
  return useState('video-started', () => false)
}
