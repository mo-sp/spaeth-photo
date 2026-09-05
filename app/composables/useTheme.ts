import { DEFAULT_THEME, THEME_STORAGE_KEY, parseTheme, type Theme } from '#shared/utils/theme'

/**
 * The chosen palette. The prerendered HTML carries no theme at all — the inline
 * head script writes `data-theme` before the first paint, and a `useHead`
 * binding would put a wrong, baked-in value into every static file. So this
 * composable reads the DOM on mount and writes the DOM on a choice; the ref is
 * only there so the switch can show which side is current.
 */
export function useTheme() {
  const theme = useState<Theme>('theme', () => DEFAULT_THEME)
  const hydrated = useHydrated()

  onMounted(() => {
    theme.value = readTheme()
  })

  /** What the page is actually showing: the attribute, else the system preference. */
  function readTheme(): Theme {
    const attribute = parseTheme(document.documentElement.dataset.theme)
    if (attribute !== null) return attribute
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : DEFAULT_THEME
  }

  /** Applies and stores a choice. `localStorage`, never a cookie (hard rule). */
  function setTheme(next: Theme): void {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // A browser that refuses storage still gets the theme, just not the memory.
    }
    theme.value = next
  }

  /**
   * `aria-pressed` for the switch — `undefined` until hydration, because the
   * server does not know the answer and a guess would be a hydration mismatch.
   */
  function isCurrent(candidate: Theme): boolean | undefined {
    return hydrated.value ? theme.value === candidate : undefined
  }

  return { theme, setTheme, isCurrent }
}
