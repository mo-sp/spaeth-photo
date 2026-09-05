import { describe, expect, it } from 'vitest'
import { CLIP_SLUGS, clipSlug, publishableClips } from '../../constants/video.ts'
import { THEMES } from '../theme.ts'

describe('THEME_CLIPS', () => {
  it('gives the two palettes two different clips', () => {
    // The point of the mapping: a switch changes the picture, not just the
    // ground. One slug written twice would make the switch look broken.
    expect(new Set(THEMES.map(clipSlug)).size).toBe(THEMES.length)
  })

  it('uses slugs that are legal as a URL segment and a directory name', () => {
    for (const slug of CLIP_SLUGS) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('publishes exactly the clips a palette can ask for', () => {
    // What `nuxt.config.ts` serves and what the component requests come from
    // the same constant; a slug in one and not the other is a 404 or dead bytes.
    expect([...CLIP_SLUGS].sort()).toEqual(THEMES.map(clipSlug).sort())
  })
})

describe('publishableClips', () => {
  it('publishes all of them when all of them are there', () => {
    expect(publishableClips([...CLIP_SLUGS])).toEqual([...CLIP_SLUGS])
  })

  it('keeps the order of the constant, not the order they were found in', () => {
    expect(publishableClips([...CLIP_SLUGS].reverse())).toEqual([...CLIP_SLUGS])
  })

  it('publishes none when a palette is missing its clip', () => {
    // Half the feature is worse than none: the ground would switch and the
    // picture would not.
    for (const slug of CLIP_SLUGS) {
      const missingOne = CLIP_SLUGS.filter((other) => other !== slug)
      expect(publishableClips(missingOne)).toEqual([])
    }
  })

  it('publishes none when nothing is there at all', () => {
    expect(publishableClips([])).toEqual([])
  })

  it('ignores a clip that no palette asks for', () => {
    expect(publishableClips([...CLIP_SLUGS, 'some-other-encode'])).toEqual([...CLIP_SLUGS])
    expect(publishableClips(['some-other-encode'])).toEqual([])
  })
})
