import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { renderPhoto } from '../../scripts/lib/variants.ts'

/**
 * Farb-Regressionstest.
 *
 * Die Pipeline verlässt sich darauf, dass libvips die sRGB-Werte der Web-Quelle
 * unverändert durchreicht: kein `toColorspace`, kein mitgeschriebenes Profil,
 * profillose Ausgaben, die jeder Browser als sRGB liest. Wäre irgendwo eine
 * Konvertierung im Spiel — etwa eine Interpretation der Werte als linear —,
 * verschöben sich vor allem die mittleren Töne dramatisch (128 würde zu 55
 * oder 186). Die Sättigungsspitzen allein würden das nicht zeigen, deshalb
 * enthält das Testbild auch ein Mittelgrau.
 *
 * Läuft nicht in `pnpm test`, sondern in `pnpm test:integration`: der Test
 * kodiert echte Bilder und braucht Sekunden statt Millisekunden.
 */

const PATCHES: Array<{ name: string; rgb: [number, number, number] }> = [
  { name: 'Rot', rgb: [255, 0, 0] },
  { name: 'Mittelgrau', rgb: [128, 128, 128] },
  { name: 'Grün', rgb: [0, 255, 0] },
  { name: 'Orange', rgb: [255, 128, 0] },
]

const WIDTH = 1024
const BAND = 256

const dir = mkdtempSync(path.join(tmpdir(), 'spaeth-color-'))
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

/** Farbe in der Mitte eines Streifens, relativ zur Bildhöhe. */
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

describe('Farbmanagement der Varianten-Pipeline', () => {
  it('reicht sRGB-Werte unverändert durch alle Formate', async () => {
    const sourceFile = path.join(dir, 'patches.jpg')
    await makeSource(sourceFile)

    const outDir = path.join(dir, 'out')
    const result = await renderPhoto({
      sourceFile,
      slug: 'farbprobe',
      outDir,
      write: (file, data) => writeFile(file, data),
    })

    expect(result.files.length).toBeGreaterThan(0)

    for (const file of result.files) {
      const onDisk = path.join(outDir, path.basename(file.path))
      for (const [band, patch] of PATCHES.entries()) {
        const [r, g, b] = await sample(onDisk, band)
        const message = `${path.basename(file.path)} · ${patch.name}`
        // Verlustbehaftete Encoder dürfen um wenige Stufen daneben liegen;
        // eine falsche Farbraumkonvertierung läge um Dutzende daneben.
        expect(Math.abs(r - patch.rgb[0]), `${message} R`).toBeLessThanOrEqual(3)
        expect(Math.abs(g - patch.rgb[1]), `${message} G`).toBeLessThanOrEqual(3)
        expect(Math.abs(b - patch.rgb[2]), `${message} B`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('schreibt keine Metadaten und kein Profil in die Ausgaben', async () => {
    const sourceFile = path.join(dir, 'patches.jpg')
    const outDir = path.join(dir, 'out')
    const result = await renderPhoto({
      sourceFile,
      slug: 'farbprobe',
      outDir,
      write: (file, data) => writeFile(file, data),
    })

    for (const file of [...result.files, result.ogFile]) {
      const metadata = await sharp(path.join(outDir, path.basename(file.path))).metadata()
      expect(metadata.exif, file.path).toBeUndefined()
      expect(metadata.icc, file.path).toBeUndefined()
      expect(metadata.xmp, file.path).toBeUndefined()
    }
  })
})
