import type { MaybeRefOrGetter } from 'vue'
import { OG_HEIGHT, OG_WIDTH } from '#shared/constants/images'

/**
 * The head tags every page of this site needs, in one place.
 *
 * Before this existed, six pages each repeated the same block: read
 * `siteUrl`, feed `description` into `og:description` a second time, spell out
 * the OG image and its size, set `twitter:card`, and add a canonical link.
 * Six copies is six chances for them to drift apart — and the ones that had
 * drifted were exactly the ones a social preview would show: only the home
 * page and the photo pages carried an `og:image` at all, so a link to
 * `/galerie` or `/ueber` unfurled as a bare text card.
 *
 * Absolute URLs come from `runtimeConfig.public.siteUrl`, which is a *build*
 * variable: a static site has no request at runtime to derive a host from.
 * When it is unset, `absoluteUrl` leaves the path relative — see
 * `shared/utils/url.ts` for why that is preferable to inventing a domain.
 */

/** Shown in `og:site_name` and appended to the OG title. */
export const SITE_NAME = 'Moritz Späth'

/** The home page's own title; also the OG title of pages without one. */
export const SITE_TITLE = 'Moritz Späth – Fotografie'

export interface SiteSeoImage {
  /** Site-relative path, e.g. `/img/<slug>/og.jpg`. */
  path: string
  alt: string
}

export interface SiteSeoInput {
  /**
   * Page title, without the `– Moritz Späth` suffix that `titleTemplate`
   * adds. Omitted on the home page, which titles itself.
   */
  title?: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  /** Canonical path. Always query-free: `?tag=` is a view, not a page. */
  path: MaybeRefOrGetter<string>
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

  const heroImage: SiteSeoImage | null = hero
    ? { path: hero.og, alt: hero.alt ?? hero.title }
    : null

  const title = () => (input.title === undefined ? undefined : toValue(input.title))
  const description = () => toValue(input.description)
  const image = () => (input.image === undefined ? heroImage : toValue(input.image))
  const canonical = () => absoluteUrl(siteUrl, toValue(input.path))

  useSeoMeta({
    title,
    description,
    ogType: input.ogType ?? 'website',
    ogSiteName: SITE_NAME,
    ogLocale: 'de_DE',
    // The crawler that reads og:title rarely reads <title>, so it gets the
    // full document title rather than the bare page name.
    ogTitle: () => {
      const value = title()
      return value === undefined ? SITE_TITLE : `${value} – ${SITE_NAME}`
    },
    ogDescription: description,
    ogUrl: canonical,
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

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })
}
