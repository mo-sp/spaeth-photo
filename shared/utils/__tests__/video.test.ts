import { describe, expect, it } from 'vitest'
import { VIDEO_FILES, VIDEO_LARGE_WIDTH, posterUrl, videoSources, videoUrl } from '../video.ts'

describe('videoUrl', () => {
  it('follows the /video/<slug>/<file> convention', () => {
    expect(videoUrl('sample-clip', VIDEO_FILES.mp4_1080)).toBe('/video/sample-clip/1080.mp4')
    expect(posterUrl('sample-clip')).toBe('/video/sample-clip/poster.jpg')
  })
})

describe('videoSources', () => {
  it('gives a wide viewport the 1080p MP4', () => {
    expect(videoSources('sample-clip', VIDEO_LARGE_WIDTH)).toEqual([
      { src: '/video/sample-clip/1080.mp4', type: 'video/mp4' },
    ])
  })

  it('gives a narrow viewport the 720p pair, WebM first', () => {
    expect(videoSources('sample-clip', VIDEO_LARGE_WIDTH - 1)).toEqual([
      { src: '/video/sample-clip/720.webm', type: 'video/webm' },
      { src: '/video/sample-clip/720.mp4', type: 'video/mp4' },
    ])
  })

  it('never offers a rendition the encoder does not write', () => {
    const files = new Set(Object.values(VIDEO_FILES))
    for (const width of [320, 768, 1024, 1920, 3840]) {
      for (const source of videoSources('sample-clip', width)) {
        expect(files).toContain(source.src.split('/').at(-1))
      }
    }
  })
})
