import type { Theme } from '../utils/theme.ts'

/**
 * The background clip of each palette. Light and shadow are two pictures, not
 * one picture treated twice: the dark side keeps its dimmed evening flight, the
 * light side gets a bright clip of its own, and the switch changes both the
 * ground and what moves behind it.
 *
 * The slugs name directories in the private content repo (`content/video/…`).
 * Unlike a photograph's slug a clip's is not a product URL and not immutable —
 * nothing links to it, so replacing or renaming a clip breaks no rule.
 */
export const THEME_CLIPS = {
  dark: 'flock-over-reeds',
  light: 'misty-lake-sunrise',
} as const satisfies Record<Theme, string>

/** Every clip the site can show, in a stable order. */
export const CLIP_SLUGS: readonly string[] = Object.values(THEME_CLIPS)

export function clipSlug(theme: Theme): string {
  return THEME_CLIPS[theme]
}

/**
 * Which clips the build publishes, given the ones it found: all of them, or
 * none. A palette whose clip is missing would switch the ground without
 * switching the picture, which is a half-built feature rather than a graceful
 * fallback — so the start page falls back to its hero photograph instead.
 *
 * Split from the file system so the rule can be tested; `nuxt.config.ts` does
 * the looking and reports what it found.
 */
export function publishableClips(found: readonly string[]): string[] {
  return CLIP_SLUGS.every((slug) => found.includes(slug)) ? [...CLIP_SLUGS] : []
}
