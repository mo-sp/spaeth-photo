import en from '~/i18n/en.json'
import de from '~/i18n/de.json'
import type { Locale } from '#shared/utils/i18n'

/**
 * Two dictionaries, a lookup and a path helper; @nuxtjs/i18n was rejected
 * (docs/architecture.md). The locale is derived from `route.path` on every
 * render and never stored, so no state can disagree with the URL.
 */

export type MessageKey = keyof typeof en

/** `satisfies` makes a missing German key a type error, not a raw key on the page. */
const DICTIONARIES = { en, de } satisfies Record<Locale, Record<MessageKey, string>>

/** Values are interpolated into `{name}` placeholders. */
export type MessageParams = Record<string, string | number>

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const template = DICTIONARIES[locale][key]
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function useI18n() {
  const route = useRoute()

  const locale = computed<Locale>(() => localeOf(route.path))

  /** A string in the current locale. */
  function t(key: MessageKey, params?: MessageParams): string {
    return translate(locale.value, key, params)
  }

  /** Two-form plural; English and German agree on the one/other split. */
  function tn(key: 'count.photos', count: number, display: string | number = count): string {
    const form = count === 1 ? `${key}.one` : `${key}.other`
    return t(form as MessageKey, { n: display })
  }

  /** A link target in the current locale. */
  function path(to: string): string {
    return localePath(to, locale.value)
  }

  /** A tag's display label in the current locale. */
  function tag(value: string): string {
    return tagLabel(value, locale.value)
  }

  return { locale, t, tn, path, tag }
}
