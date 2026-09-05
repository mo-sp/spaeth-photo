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

/** What a run of the swap should do at the point it is asking. */
export type ClipSwapAction =
  /** The picture on screen is already the right one. */
  | 'nothing'
  /** Take the outgoing picture out first; ask again when it is gone. */
  | 'fade'
  /** Put the wanted clip's sources on the element and play. */
  | 'load'
  /** A newer run has taken over; write nothing at all. */
  | 'abandon'

export interface ClipSwapInput {
  /** Slug the element carries sources for; `''` before the first load. */
  showing: string
  /** Slug the current palette asks for. */
  wanted: string
  /** Sequence number of the run asking. */
  run: number
  /** Sequence number of the newest run started. */
  latest: number
  /** Whether this run has already faded the outgoing picture out. */
  faded: boolean
}

/**
 * The whole decision of a clip swap, asked once when a run starts and again
 * after its fade — which is the point of it. A fade is 320 ms of waiting, and in
 * that time the visitor can pick the other palette twice; a run that wrote its
 * clip on waking without asking again would leave the page in one palette and
 * the picture in another. `abandon` is what keeps an overtaken run silent, and
 * it is why the caller has to re-read the wanted slug rather than trust the one
 * it started with.
 */
export function clipSwapAction({
  showing,
  wanted,
  run,
  latest,
  faded,
}: ClipSwapInput): ClipSwapAction {
  if (run !== latest) return 'abandon'
  if (showing === wanted) return 'nothing'
  return showing === '' || faded ? 'load' : 'fade'
}
