import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { renderPhoto, type RenderResult } from '../../scripts/lib/variants.ts'

/**
 * Colour regression test. A stray conversion — reading the sRGB values as linear,
 * say — would shift the mid-tones dramatically (128 to 55 or 186) while the
 * saturated patches barely move, hence the mid grey in the test image.
 * Runs in `pnpm test:integration`, not `pnpm test`: it encodes real images.
 */

const PATCHES: Array<{ name: string; rgb: [number, number, number] }> = [
  { name: 'Red', rgb: [255, 0, 0] },
  { name: 'Mid grey', rgb: [128, 128, 128] },
  { name: 'Green', rgb: [0, 255, 0] },
  { name: 'Orange', rgb: [255, 128, 0] },
]

const WIDTH = 1024
const BAND = 256

const dir = mkdtempSync(path.join(tmpdir(), 'spaeth-color-'))
const sourceFile = path.join(dir, 'patches.jpg')
const outDir = path.join(dir, 'out')
afterAll(() => rmSync(dir, { recursive: true, force: true }))

async function makeSource(file: string): Promise<void> {
  const height = BAND * PATCHES.length
  const pixels = Buffer.alloc(WIDTH * height * 3)
  for (let y = 0; y < height; y += 1) {
    const patch = PATCHES[Math.floor(y / BAND)]!
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 3
      pixels[offset] = patch.rgb[0]
      pixels[offset + 1] = patch.rgb[1]
      pixels[offset + 2] = patch.rgb[2]
    }
  }
  await sharp(pixels, { raw: { width: WIDTH, height, channels: 3 } })
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .withIccProfile('srgb')
    .toFile(file)
}

/** Colour at the centre of a band, relative to the image height. */
async function sample(file: string, band: number): Promise<[number, number, number]> {
  const image = sharp(file)
  const { width, height } = await image.metadata()
  const y = Math.floor((height * (band + 0.5)) / PATCHES.length)
  const x = Math.floor(width / 2)
  const { data } = await image
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return [data[0]!, data[1]!, data[2]!]
}

let result: RenderResult

// Render once and run both checks on that: otherwise the second test would depend
// on the first having run and left its source behind.
beforeAll(async () => {
  await makeSource(sourceFile)
  result = await renderPhoto({
    sourceFile,
    slug: 'colour-patches',
    outDir,
    write: (file, data) => writeFile(file, data),
  })
})

describe('colour management of the variant pipeline', () => {
  it('passes sRGB values through every format unchanged', async () => {
    expect(result.files.length).toBeGreaterThan(0)

    for (const file of result.files) {
      const onDisk = path.join(outDir, path.basename(file.path))
      for (const [band, patch] of PATCHES.entries()) {
        const [r, g, b] = await sample(onDisk, band)
        const message = `${path.basename(file.path)} · ${patch.name}`
        // Lossy encoders may be off by a few steps; a wrong colour-space
        // conversion would be off by dozens.
        expect(Math.abs(r - patch.rgb[0]), `${message} R`).toBeLessThanOrEqual(3)
        expect(Math.abs(g - patch.rgb[1]), `${message} G`).toBeLessThanOrEqual(3)
        expect(Math.abs(b - patch.rgb[2]), `${message} B`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('writes no metadata and no profile into the outputs', async () => {
    for (const file of [...result.files, result.ogFile]) {
      const metadata = await sharp(path.join(outDir, path.basename(file.path))).metadata()
      expect(metadata.exif, file.path).toBeUndefined()
      expect(metadata.icc, file.path).toBeUndefined()
      expect(metadata.xmp, file.path).toBeUndefined()
    }
  })

  it('delivers a JPEG for a source below 960 px too', async () => {
    // 800 px wide: neither JPEG standard step applies. Without the fallback the
    // <img> in the frontend would have no src.
    const narrowFile = path.join(dir, 'narrow.jpg')
    await sharp(sourceFile).resize({ width: 800 }).jpeg({ quality: 90 }).toFile(narrowFile)
    const narrow = await renderPhoto({
      sourceFile: narrowFile,
      slug: 'narrow',
      outDir: path.join(dir, 'out-narrow'),
      write: (file, data) => writeFile(file, data),
    })
    expect(narrow.variants.jpeg).toEqual([800])
    expect(narrow.variants.avif).toEqual([480, 800])
  })
})
