import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  decide,
  emptyCache,
  hashFile,
  loadCache,
  saveCache,
  settingsHash,
  type CacheEntry,
} from '../../scripts/lib/cache.ts'
import type { RenderResult } from '../../scripts/lib/variants.ts'

const dir = mkdtempSync(path.join(tmpdir(), 'spaeth-cache-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const render = {
  files: [{ format: 'avif', width: 480, height: 320, path: '/img/x/480.avif', bytes: 1 }],
  ogFile: { format: 'jpeg', width: 1200, height: 630, path: '/img/x/og.jpg', bytes: 1 },
} as unknown as RenderResult

const entry: CacheEntry = {
  sourceHash: 'hash-alt',
  mtimeMs: 1000,
  size: 500,
  metaHash: 'meta-alt',
  render,
}

const base = {
  entry,
  stat: { mtimeMs: 1000, size: 500 },
  metaHash: 'meta-alt',
  force: false,
  outputsPresent: () => true,
}

describe('decide', () => {
  it('rendert, was es noch nicht kennt', async () => {
    const result = await decide({ ...base, entry: undefined, readHash: async () => 'hash-neu' })
    expect(result).toMatchObject({ verdict: 'neu', render: true, sourceHash: 'hash-neu' })
  })

  it('liest den Inhalt gar nicht erst, wenn mtime und Größe stimmen', async () => {
    const readHash = vi.fn(async () => 'hash-alt')
    const result = await decide({ ...base, readHash })
    expect(result.verdict).toBe('cache')
    expect(result.render).toBe(false)
    expect(readHash).not.toHaveBeenCalled()
  })

  it('vertraut bei abweichender mtime dem Inhalt, nicht dem Zeitstempel', async () => {
    // Ein frischer Checkout setzt neue mtimes, ohne eine Datei zu ändern.
    const readHash = vi.fn(async () => 'hash-alt')
    const result = await decide({ ...base, stat: { mtimeMs: 9999, size: 500 }, readHash })
    expect(readHash).toHaveBeenCalledOnce()
    expect(result.verdict).toBe('cache')
    expect(result.render).toBe(false)
  })

  it('rendert neu, wenn sich der Inhalt geändert hat', async () => {
    const result = await decide({
      ...base,
      stat: { mtimeMs: 9999, size: 501 },
      readHash: async () => 'hash-neu',
    })
    expect(result).toMatchObject({ verdict: 'geändert', render: true })
  })

  it('schreibt bei geänderter YAML das Manifest neu, kodiert aber kein Bild', async () => {
    const result = await decide({ ...base, metaHash: 'meta-neu', readHash: async () => 'hash-alt' })
    expect(result).toMatchObject({ verdict: 'metadaten', render: false })
  })

  it('rendert neu, wenn eine Ausgabedatei fehlt', async () => {
    const result = await decide({
      ...base,
      outputsPresent: () => false,
      readHash: async () => 'hash-alt',
    })
    expect(result).toMatchObject({ verdict: 'ausgabe fehlt', render: true })
  })

  it('rendert bei --force ohne jede Prüfung', async () => {
    const outputsPresent = vi.fn(() => true)
    const result = await decide({ ...base, force: true, outputsPresent, readHash: async () => 'h' })
    expect(result).toMatchObject({ verdict: 'erzwungen', render: true })
    expect(outputsPresent).not.toHaveBeenCalled()
  })
})

describe('loadCache', () => {
  it('verwirft einen Cache, der zu anderen Einstellungen gehört', () => {
    const file = path.join(dir, 'settings.json')
    const cache = emptyCache()
    cache.entries.x = entry
    saveCache(file, cache)

    expect(Object.keys(loadCache(file, cache.settingsHash).entries)).toEqual(['x'])
    expect(loadCache(file, 'ein-anderer-hash').entries).toEqual({})
  })

  it('verwirft einen kaputten Cache, statt daran zu scheitern', () => {
    const file = path.join(dir, 'kaputt.json')
    writeFileSync(file, '{ das ist kein JSON')
    expect(loadCache(file).entries).toEqual({})
  })

  it('kommt ohne vorhandene Datei aus', () => {
    expect(loadCache(path.join(dir, 'gibt-es-nicht.json')).entries).toEqual({})
  })
})

describe('settingsHash', () => {
  it('ist stabil über mehrere Aufrufe', () => {
    expect(settingsHash()).toBe(settingsHash())
  })
})

describe('hashFile', () => {
  it('hängt am Inhalt, nicht am Namen', async () => {
    const a = path.join(dir, 'a.bin')
    const b = path.join(dir, 'b.bin')
    writeFileSync(a, 'gleicher Inhalt')
    writeFileSync(b, 'gleicher Inhalt')
    expect(await hashFile(a)).toBe(await hashFile(b))

    writeFileSync(b, 'anderer Inhalt')
    expect(await hashFile(a)).not.toBe(await hashFile(b))
  })
})
