/**
 * Where the background clip's renditions live and which one a viewport gets.
 * Like the photo variants, the URLs are a convention rather than data:
 * `/video/<slug>/<file>`. The encoder writes exactly these file names.
 */

export const VIDEO_FILES = {
  mp4_1080: '1080.mp4',
  mp4_720: '720.mp4',
  webm_720: '720.webm',
  poster: 'poster.jpg',
} as const

export interface VideoSource {
  src: string
  type: string
}

export function videoUrl(slug: string, file: string): string {
  return `/video/${slug}/${file}`
}

export function posterUrl(slug: string): string {
  return videoUrl(slug, VIDEO_FILES.poster)
}

/** Below this CSS width the 720p renditions are wide enough for a cover fit. */
export const VIDEO_LARGE_WIDTH = 1024

/**
 * The `<source>` list for one viewport, most preferred first. A narrow screen
 * gets the 720p pair — VP9 first, because it is a third of the bytes and every
 * engine that cannot read it falls through to the MP4. A wide screen gets the
 * 1080p MP4: the only WebM rendition is 720p, and offering it first would hand
 * a desktop the smaller picture.
 */
export function videoSources(slug: string, viewportWidth: number): VideoSource[] {
  if (viewportWidth >= VIDEO_LARGE_WIDTH) {
    return [{ src: videoUrl(slug, VIDEO_FILES.mp4_1080), type: 'video/mp4' }]
  }
  return [
    { src: videoUrl(slug, VIDEO_FILES.webm_720), type: 'video/webm' },
    { src: videoUrl(slug, VIDEO_FILES.mp4_720), type: 'video/mp4' },
  ]
}
