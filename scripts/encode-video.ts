#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { VIDEO_FILES } from '../shared/utils/video.ts'
import { CliError, formatHelp, parseFlags, wantsHelp, type OptionSpecs } from './lib/args.ts'
import { CONTENT_DIR, displayPath, expandHome, fromRoot } from './lib/paths.ts'
import { createReporter, formatBytes, formatDuration } from './lib/report.ts'
import { isValidSlug } from './lib/slug.ts'

/**
 * Turns one source clip into the background renditions of the start page:
 * `content/video/<slug>/` with a 1080p and a 720p H.264 MP4, a 720p VP9 WebM
 * and a poster frame. The source clip lives outside every repository and is
 * only ever read, exactly like the photographic originals.
 */

/** A background loop, not a film: 30 fps halves the bitrate of a 60 fps source. */
const FPS = 30

/** Seconds of the source that become the loop. */
const DURATION = 10

interface Rendition {
  file: string
  height: number
  /** Constant-quality target; measured against the ~1 MB / 0.4 MB / 0.3 MB budget. */
  crf: number
  encoder: 'h264' | 'vp9'
}

const RENDITIONS: Rendition[] = [
  { file: VIDEO_FILES.mp4_1080, height: 1080, crf: 25, encoder: 'h264' },
  { file: VIDEO_FILES.mp4_720, height: 720, crf: 26, encoder: 'h264' },
  { file: VIDEO_FILES.webm_720, height: 720, crf: 34, encoder: 'vp9' },
]

/** Long edge and quality of the poster frame; it is a background, not a print. */
const POSTER_WIDTH = 1600
const POSTER_QUALITY = 72

const OPTIONS: OptionSpecs = {
  source: {
    type: 'string',
    placeholder: '<file>',
    description: 'Source clip (required); a relative path resolves against $VIDEO_SOURCE_DIR',
  },
  slug: {
    type: 'string',
    placeholder: '<slug>',
    description: 'Target directory below the video root (required, kebab-case ASCII)',
  },
  out: {
    type: 'string',
    placeholder: '<dir>',
    description: 'Video root for the output (default: content/video)',
  },
  start: { type: 'string', placeholder: '<s>', description: 'Seconds to skip in the source' },
  duration: {
    type: 'string',
    placeholder: '<s>',
    description: `Length of the loop in seconds (default: ${DURATION})`,
  },
  poster: {
    type: 'string',
    placeholder: '<s>',
    description: 'Second inside the loop the poster is taken from (default: 1)',
  },
  ffmpeg: {
    type: 'string',
    placeholder: '<path>',
    description: 'ffmpeg binary (default: $FFMPEG, else ffmpeg)',
  },
  'dry-run': { type: 'boolean', description: 'Write nothing, only report' },
  force: { type: 'boolean', description: 'Overwrite existing renditions (default: skip them)' },
}

const USAGE = 'Usage: pnpm encode-video --source <file> --slug <slug> [options]'

function numberFlag(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    throw new CliError(`--${name} expects a non-negative number, not "${raw}"`)
  }
  return value
}

/** Runs a binary and turns a non-zero exit into a CliError carrying its stderr. */
function run(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (result.error !== undefined) {
    throw new CliError(`${path.basename(binary)} could not be run: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim().split('\n').slice(-4).join('\n')
    throw new CliError(`${path.basename(binary)} failed (exit ${result.status})\n${detail}`)
  }
  return result.stdout
}

interface Probe {
  width: number
  height: number
  duration: number
  /** False where ffprobe was not there and the figures are placeholders. */
  measured: boolean
}

/** The dimensions of the largest rendition, so a dry run plans all of them. */
const UNMEASURED: Probe = {
  width: Number.POSITIVE_INFINITY,
  height: Number.POSITIVE_INFINITY,
  duration: Number.POSITIVE_INFINITY,
  measured: false,
}

/** Measures if it can; a dry run is worth having on a machine without ffmpeg. */
function probeOrGuess(ffprobe: string, file: string): Probe {
  try {
    return probe(ffprobe, file)
  } catch {
    return UNMEASURED
  }
}

function probe(ffprobe: string, file: string): Probe {
  const raw = run(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height:format=duration',
    '-of',
    'json',
    file,
  ])
  const parsed = JSON.parse(raw) as {
    streams?: Array<{ width?: number; height?: number }>
    format?: { duration?: string }
  }
  const stream = parsed.streams?.[0]
  if (stream?.width === undefined || stream.height === undefined) {
    throw new CliError(`no video stream in ${displayPath(file)}`)
  }
  return {
    width: stream.width,
    height: stream.height,
    duration: Number(parsed.format?.duration ?? 0),
    measured: true,
  }
}

/**
 * Shared front of every encode. `-map 0:v:0` alone drops audio, subtitle and
 * the camera's data streams, and `-map_metadata -1` drops everything the source
 * carried — which is the point: nothing of the recording reaches a visitor.
 *
 * What `+bitexact` adds is narrower than it sounds. It removes ffmpeg's version
 * numbers, not the names: the delivered files still say `encoder=Lavc libx264`
 * and `Lavc libvpx-vp9`, the WebM still says `encoder=Lavf`, and the MP4 still
 * carries `major_brand`. Measured, not assumed — an empty `-metadata encoder=`
 * does not clear those, because the muxer writes them after metadata mapping.
 * They name the tool, never the source or its owner.
 */
function inputArgs(source: string, start: number, duration: number): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(start),
    '-i',
    source,
    '-t',
    String(duration),
    '-map',
    '0:v:0',
    '-map_metadata',
    '-1',
    '-fflags',
    '+bitexact',
  ]
}

/** `format=yuv420p` is the 10-bit source's way down to 8 bit; every player reads it. */
function filterArgs(height: number): string[] {
  return ['-vf', `fps=${FPS},scale=-2:${height}:flags=lanczos,format=yuv420p`]
}

function encoderArgs(rendition: Rendition): string[] {
  if (rendition.encoder === 'vp9') {
    return [
      '-c:v',
      'libvpx-vp9',
      '-crf',
      String(rendition.crf),
      '-b:v',
      '0',
      '-row-mt',
      '1',
      '-cpu-used',
      '2',
      '-deadline',
      'good',
      '-flags:v',
      '+bitexact',
    ]
  }
  return [
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    String(rendition.crf),
    '-profile:v',
    'high',
    // The whole file is one loop, so the browser needs the header up front.
    '-movflags',
    '+faststart',
    // The one identifying tag that can be removed: without this the track is
    // labelled `handler_name=VideoHandler`.
    '-empty_hdlr_name',
    '1',
    '-flags:v',
    '+bitexact',
  ]
}

async function main(): Promise<void> {
  if (wantsHelp()) {
    console.log(formatHelp(USAGE, OPTIONS))
    return
  }

  const flags = parseFlags(OPTIONS)
  const dryRun = flags.bool('dry-run')
  const force = flags.bool('force')

  const slug = flags.str('slug')
  if (slug === undefined) throw new CliError('no target: pass --slug <slug>')
  if (!isValidSlug(slug)) {
    throw new CliError(`--slug must be lowercase, kebab-case and ASCII, not "${slug}"`)
  }

  // No default: the clip lives outside every repository, so its location is the
  // operator's and must not be baked into a public file.
  const rawSource = flags.str('source')
  if (rawSource === undefined) {
    throw new CliError(
      'no source clip: pass --source <file> (a relative path resolves against ' +
        '$VIDEO_SOURCE_DIR, see .env.example)',
    )
  }
  const baseDir = process.env.VIDEO_SOURCE_DIR
  const expanded = expandHome(rawSource)
  const source =
    path.isAbsolute(expanded) || baseDir === undefined
      ? fromRoot(expanded)
      : path.resolve(expandHome(baseDir), expanded)
  if (!existsSync(source)) throw new CliError(`source clip not found: ${displayPath(source)}`)

  const outRoot = fromRoot(flags.str('out') ?? path.join(CONTENT_DIR, 'video'))
  const outDir = path.join(outRoot, slug)

  const start = numberFlag(flags.str('start'), 'start', 0)
  const duration = numberFlag(flags.str('duration'), 'duration', DURATION)
  const posterAt = numberFlag(flags.str('poster'), 'poster', 1)

  const ffmpeg = expandHome(flags.str('ffmpeg') ?? process.env.FFMPEG ?? 'ffmpeg')
  // ffprobe ships next to ffmpeg; a bare command name stays a bare command name.
  const ffprobe = ffmpeg.includes(path.sep) ? path.join(path.dirname(ffmpeg), 'ffprobe') : 'ffprobe'

  const reporter = createReporter()
  // A dry run reports the plan, and the plan does not need the source measured:
  // without this, `--dry-run` fails on a machine that has no ffmpeg at all.
  const info = dryRun ? probeOrGuess(ffprobe, source) : probe(ffprobe, source)

  reporter.info(
    info.measured
      ? `Source  ${displayPath(source)} (${info.width}×${info.height}, ${info.duration.toFixed(1)} s)`
      : `Source  ${displayPath(source)} (not measured — no ffprobe)`,
  )
  reporter.info(`Target  ${displayPath(outDir)}${dryRun ? '  [dry-run]' : ''}`)
  reporter.info(`Loop    ${start} s + ${duration} s · ${FPS} fps · no audio · no metadata`)
  reporter.info('')

  if (info.measured && duration > info.duration - start) {
    reporter.warn(slug, `source is only ${info.duration.toFixed(1)} s — the loop will be shorter`)
  }

  if (!dryRun) mkdirSync(outDir, { recursive: true })

  const started = Date.now()
  let totalBytes = 0
  let written = 0

  for (const rendition of RENDITIONS) {
    const target = path.join(outDir, rendition.file)
    // Never upscale: a rendition taller than the source is not written at all.
    if (rendition.height > info.height) {
      reporter.warn(rendition.file, `source is only ${info.height}px tall — rendition skipped`)
      continue
    }
    if (existsSync(target) && !force) {
      reporter.step('exists', rendition.file, `${formatBytes(statSync(target).size)} · skipped`)
      continue
    }
    if (dryRun) {
      reporter.step(
        'would',
        rendition.file,
        `${rendition.height}p · ${rendition.encoder} crf ${rendition.crf}`,
      )
      continue
    }

    const startedOne = Date.now()
    run(ffmpeg, [
      ...inputArgs(source, start, duration),
      ...filterArgs(rendition.height),
      ...encoderArgs(rendition),
      target,
    ])
    const bytes = statSync(target).size
    totalBytes += bytes
    written += 1
    reporter.step(
      'encode',
      rendition.file,
      `${rendition.height}p · ${rendition.encoder} crf ${rendition.crf} · ` +
        `${formatBytes(bytes)} · ${formatDuration(Date.now() - startedOne)}`,
    )
  }

  const poster = path.join(outDir, VIDEO_FILES.poster)
  if (existsSync(poster) && !force) {
    reporter.step('exists', VIDEO_FILES.poster, `${formatBytes(statSync(poster).size)} · skipped`)
  } else if (dryRun) {
    reporter.step('would', VIDEO_FILES.poster, `${Math.min(POSTER_WIDTH, info.width)}px wide`)
  } else {
    // The frame leaves ffmpeg as PNG and becomes a JPEG in sharp: same encoder,
    // same quality scale and the same metadata stripping as every photo.
    const frame = path.join(outDir, '.poster-frame.png')
    run(ffmpeg, [...inputArgs(source, start + posterAt, 1), '-frames:v', '1', frame])
    try {
      await sharp(frame)
        .resize({
          width: Math.min(POSTER_WIDTH, info.width),
          withoutEnlargement: true,
          kernel: 'lanczos3',
        })
        .jpeg({ quality: POSTER_QUALITY, mozjpeg: true })
        .toFile(poster)
    } finally {
      // Whatever happened above, the intermediate frame is not left behind.
      rmSync(frame, { force: true })
    }
    const bytes = statSync(poster).size
    totalBytes += bytes
    written += 1
    reporter.step('poster', VIDEO_FILES.poster, `at ${posterAt} s · ${formatBytes(bytes)}`)
  }

  reporter.info('')
  reporter.info(
    `  ${written} file(s) written${totalBytes > 0 ? ` · ${formatBytes(totalBytes)}` : ''} · ` +
      `${formatDuration(Date.now() - started)}`,
  )
  reporter.finish()
}

try {
  await main()
} catch (error) {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`)
    process.exitCode = 1
  } else {
    throw error
  }
}
