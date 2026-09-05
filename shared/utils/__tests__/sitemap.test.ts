import { describe, expect, it } from 'vitest'
import type { SitemapPhoto } from '../sitemap.ts'
import {
  buildSitemap,
  newest,
  photoImage,
  sitemapEntries,
  urlElement,
  xmlEscape,
} from '../sitemap.ts'

function photo(slug: string, options: Partial<SitemapPhoto> = {}): SitemapPhoto {
  return {
    slug,
    title: slug,
    date: '2024-05-01',
    tags: ['sailing'],
    variants: { jpeg: [960, 1600] },
    ...options,
  }
}

const SITE = 'https://example.org'

describe('newest', () => {
  it('takes the latest date, not the last entry', () => {
    expect(newest([photo('a', { date: '2023-01-01' }), photo('b', { date: '2024-07-09' })])).toBe(
      '2024-07-09',
    )
  })

  it('is undefined for an empty list', () => {
    expect(newest([])).toBeUndefined()
  })
})

describe('photoImage', () => {
  it('picks the widest JPEG variant', () => {
    expect(photoImage(photo('x', { variants: { jpeg: [960, 1600] } }))).toEqual(['/img/x/1600.jpg'])
  })

  it('names no image when the photo has no JPEG', () => {
    expect(photoImage(photo('x', { variants: { jpeg: [] } }))).toEqual([])
  })
})

describe('sitemapEntries', () => {
  const photos = [
    photo('a', { date: '2024-01-01', tags: ['sailing'] }),
    photo('b', { date: '2024-09-09', tags: ['nature'] }),
  ]

  it('lists home, gallery, every used tag and every photo', () => {
    expect(sitemapEntries(photos).map((entry) => entry.path)).toEqual([
      '/',
      '/gallery',
      '/gallery/nature',
      '/gallery/sailing',
      '/photo/a',
      '/photo/b',
    ])
  })

  it('omits the draft text pages', () => {
    const paths = sitemapEntries(photos).map((entry) => entry.path)
    expect(paths).not.toContain('/about')
    expect(paths).not.toContain('/legal-notice')
    expect(paths).not.toContain('/privacy')
  })

  it('gives the listing pages the newest date they show', () => {
    const [home, gallery] = sitemapEntries(photos)
    expect(home?.lastmod).toBe('2024-09-09')
    expect(gallery?.lastmod).toBe('2024-09-09')
  })

  it('gives a tag page the newest date within that tag', () => {
    const sailing = sitemapEntries(photos).find((entry) => entry.path === '/gallery/sailing')
    expect(sailing?.lastmod).toBe('2024-01-01')
  })

  it('gives a photo page its own capture date', () => {
    const entry = sitemapEntries(photos).find((e) => e.path === '/photo/b')
    expect(entry?.lastmod).toBe('2024-09-09')
  })

  it('falls the German image title back to the English one', () => {
    const [entry] = sitemapEntries([photo('a', { title: 'Harbour', titleDe: 'Hafen' })]).slice(-1)
    expect(entry?.imageTitles).toEqual({ en: 'Harbour', de: 'Hafen' })

    const [plain] = sitemapEntries([photo('a', { title: 'Harbour' })]).slice(-1)
    expect(plain?.imageTitles).toEqual({ en: 'Harbour', de: 'Harbour' })
  })
})

describe('xmlEscape', () => {
  it('escapes every character that would break the document', () => {
    expect(xmlEscape(`Fish & <chips> "quoted" 'single'`)).toBe(
      'Fish &amp; &lt;chips&gt; &quot;quoted&quot; &apos;single&apos;',
    )
  })

  it('leaves ordinary text alone', () => {
    expect(xmlEscape('Harbour at dawn')).toBe('Harbour at dawn')
  })
})

describe('urlElement', () => {
  const entry = {
    path: '/photo/a',
    lastmod: '2024-05-01',
    images: ['/img/a/1600.jpg'],
    imageTitles: { en: 'Fish & chips', de: 'Fisch & Pommes' },
  }

  it('names the locale it was asked for in <loc>', () => {
    expect(urlElement(SITE, entry, 'en')).toContain(`<loc>${SITE}/photo/a</loc>`)
    expect(urlElement(SITE, entry, 'de')).toContain(`<loc>${SITE}/de/photo/a</loc>`)
  })

  it('lists every locale plus x-default as alternates, identically in both', () => {
    const alternates = (locale: 'en' | 'de') =>
      urlElement(SITE, entry, locale)
        .split('\n')
        .filter((line) => line.includes('xhtml:link'))

    expect(alternates('en')).toEqual([
      `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/photo/a" />`,
      `    <xhtml:link rel="alternate" hreflang="de" href="${SITE}/de/photo/a" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/photo/a" />`,
    ])
    expect(alternates('de')).toEqual(alternates('en'))
  })

  it('escapes the image title', () => {
    expect(urlElement(SITE, entry, 'en')).toContain('<image:title>Fish &amp; chips</image:title>')
  })

  it('omits lastmod when there is none', () => {
    expect(urlElement(SITE, { path: '/gallery' }, 'en')).not.toContain('<lastmod>')
  })

  it('omits the image block when there is no image', () => {
    expect(urlElement(SITE, { path: '/gallery' }, 'en')).not.toContain('<image:image>')
  })
})

describe('buildSitemap', () => {
  it('emits one <url> per entry and locale', () => {
    const xml = buildSitemap(SITE, [photo('a')])
    expect(xml.match(/<url>/g)?.length).toBe(sitemapEntries([photo('a')]).length * 2)
  })

  it('declares the image and xhtml namespaces it uses', () => {
    const xml = buildSitemap(SITE, [photo('a')])
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
  })
})
