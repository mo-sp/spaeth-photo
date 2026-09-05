import type { MaybeRefOrGetter } from 'vue'
import { BRAND_NAME } from '#shared/constants/brand'
import { OG_HEIGHT, OG_WIDTH } from '#shared/constants/images'

/**
 * The per-page head tags: title, description and preview image. Canonical,
 * hreflang and `og:locale` belong to the whole page tree and live in
 * `layouts/default.vue`.
 *
 * Absolute URLs come from `runtimeConfig.public.siteUrl`, a *build* variable:
 * a static site has no request at runtime to derive a host from.
 */

/** Shown in `og:site_name` and appended to the OG title. */
export const SITE_NAME = BRAND_NAME

export interface SiteSeoImage {
  /** Site-relative path, e.g. `/img/<slug>/og.jpg`. */
  path: string
  alt: string
}

export interface SiteSeoInput {
  /**
   * Page title, without the `– MS-Media` suffix that `titleTemplate` adds.
   * Omitted on the home page, which titles itself.
   */
  title?: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  ogType?: 'website' | 'article' | 'profile'
  /**
   * Preview image. Defaults to the hero photo's OG crop, so that every page
   * unfurls with a picture — a photo site whose links preview as text has
   * given away the one thing it has.
   */
  image?: MaybeRefOrGetter<SiteSeoImage | null>
}

export function useSiteSeo(input: SiteSeoInput) {
  const { siteUrl } = useRuntimeConfig().public
  const { hero } = usePhotos()
  const { locale, t } = useI18n()

  const heroImage = () =>
    hero === null ? null : { path: hero.og, alt: photoAlt(hero, locale.value) }

  const title = () => (input.title === undefined ? undefined : toValue(input.title))
  const description = () => toValue(input.description)
  const image = () => (input.image === undefined ? heroImage() : toValue(input.image))

  useSeoMeta({
    title,
    description,
    ogType: input.ogType ?? 'website',
    ogSiteName: SITE_NAME,
    // The crawler that reads og:title rarely reads <title>, so it gets the
    // full document title rather than the bare page name.
    ogTitle: () => {
      const value = title()
      return value === undefined ? t('site.title') : `${value} – ${SITE_NAME}`
    },
    ogDescription: description,
    ogImage: () => {
      const value = image()
      return value === null ? undefined : absoluteUrl(siteUrl, value.path)
    },
    ogImageWidth: () => (image() === null ? undefined : OG_WIDTH),
    ogImageHeight: () => (image() === null ? undefined : OG_HEIGHT),
    ogImageAlt: () => image()?.alt,
    ogImageType: () => (image() === null ? undefined : 'image/jpeg'),
    twitterCard: () => (image() === null ? 'summary' : 'summary_large_image'),
  })
}
