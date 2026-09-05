/**
 * The two themes, the key they are stored under and the script that applies a
 * stored one before the first paint. Pure, because the inline head script, the
 * composable and the tests all have to agree on the same three strings.
 */

export const THEMES = ['dark', 'light'] as const

export type Theme = (typeof THEMES)[number]

/** The palette every page ships with; `light` is opt-in, by choice or by system. */
export const DEFAULT_THEME: Theme = 'dark'

/** `localStorage`, not a cookie — the site sets none (hard rule). */
export const THEME_STORAGE_KEY = 'ms-theme'

/** A stored or attribute value, or `null` if it is neither theme. */
export function parseTheme(value: unknown): Theme | null {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
    ? (value as Theme)
    : null
}

/**
 * Longest the page may stay hidden behind an intro that never starts. The
 * overlay marks itself `running` as soon as it takes over, so this only fires
 * when the bundle has not hydrated by then — a slow connection then gets the
 * page instead of a black screen, and no intro.
 */
export const INTRO_FAILSAFE_MS = 3000

/**
 * Runs in `<head>` before the first paint, so a returning visitor never sees
 * the other theme flash. It does three things and nothing else: apply the
 * stored theme, mark the intro as pending when there is no stored choice and
 * the document is the home page (`data-page`, set by the page itself), and arm
 * the failsafe above. Without JavaScript none of it happens, which is the
 * plain, unhidden page — the state crawlers see.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement;var s=null;try{s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(s==='light'||s==='dark'){d.dataset.theme=s;return}if(d.dataset.page==='home'){d.dataset.intro='pending';setTimeout(function(){if(d.dataset.intro==='pending')delete d.dataset.intro},${INTRO_FAILSAFE_MS})}})()`
