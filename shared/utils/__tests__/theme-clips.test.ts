import { describe, expect, it } from 'vitest'
import { CLIP_SLUGS, THEME_CLIPS, clipSlug } from '../../constants/video.ts'
import { THEMES } from '../theme.ts'
import { posterUrl, videoUrl } from '../video.ts'

describe('THEME_CLIPS', () => {
  it('names one clip per theme', () => {
    expect(Object.keys(THEME_CLIPS).sort()).toEqual([...THEMES].sort())
  })

  it('gives the two themes different clips', () => {
    expect(new Set(CLIP_SLUGS).size).toBe(CLIP_SLUGS.length)
  })

  it('uses slugs that are legal URL segments', () => {
    for (const slug of CLIP_SLUGS) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})

describe('clipSlug', () => {
  it('resolves a theme to its clip', () => {
    expect(clipSlug('dark')).toBe(THEME_CLIPS.dark)
    expect(clipSlug('light')).toBe(THEME_CLIPS.light)
  })

  it('feeds the /video/<slug>/<file> convention', () => {
    expect(posterUrl(clipSlug('light'))).toBe(videoUrl(THEME_CLIPS.light, 'poster.jpg'))
  })
})
