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
  it('renders what it does not know yet', async () => {
    const result = await decide({ ...base, entry: undefined, readHash: async () => 'hash-new' })
    expect(result).toMatchObject({ verdict: 'new', render: true, sourceHash: 'hash-new' })
  })

  it('does not read the content at all when mtime and size match', async () => {
    const readHash = vi.fn(async () => 'hash-alt')
    const result = await decide({ ...base, readHash })
    expect(result.verdict).toBe('cache')
    expect(result.render).toBe(false)
    expect(readHash).not.toHaveBeenCalled()
  })

  it('trusts the content over the timestamp when the mtime differs', async () => {
    // A fresh checkout sets new mtimes without changing a file.
    const readHash = vi.fn(async () => 'hash-alt')
    const result = await decide({ ...base, stat: { mtimeMs: 9999, size: 500 }, readHash })
    expect(readHash).toHaveBeenCalledOnce()
    expect(result.verdict).toBe('cache')
    expect(result.render).toBe(false)
  })

  it('re-renders when the content has changed', async () => {
    const result = await decide({
      ...base,
      stat: { mtimeMs: 9999, size: 501 },
      readHash: async () => 'hash-new',
    })
    expect(result).toMatchObject({ verdict: 'changed', render: true })
  })

  it('rewrites the manifest on changed YAML but encodes no image', async () => {
    const result = await decide({ ...base, metaHash: 'meta-neu', readHash: async () => 'hash-alt' })
    expect(result).toMatchObject({ verdict: 'metadata', render: false })
  })

  it('re-renders when an output file is missing', async () => {
    const result = await decide({
      ...base,
      outputsPresent: () => false,
      readHash: async () => 'hash-alt',
    })
    expect(result).toMatchObject({ verdict: 'output missing', render: true })
  })

  it('renders on --force without any check', async () => {
    const outputsPresent = vi.fn(() => true)
    const result = await decide({ ...base, force: true, outputsPresent, readHash: async () => 'h' })
    expect(result).toMatchObject({ verdict: 'forced', render: true })
    expect(outputsPresent).not.toHaveBeenCalled()
  })
})

describe('loadCache', () => {
  it('discards a cache that belongs to different settings', () => {
    const file = path.join(dir, 'settings.json')
    const cache = emptyCache()
    cache.entries.x = entry
    saveCache(file, cache)

    expect(Object.keys(loadCache(file, cache.settingsHash).entries)).toEqual(['x'])
    expect(loadCache(file, 'a-different-hash').entries).toEqual({})
  })

  it('discards a broken cache instead of failing on it', () => {
    const file = path.join(dir, 'broken.json')
    writeFileSync(file, '{ this is not JSON')
    expect(loadCache(file).entries).toEqual({})
  })

  it('copes with a missing file', () => {
    expect(loadCache(path.join(dir, 'does-not-exist.json')).entries).toEqual({})
  })
})

describe('settingsHash', () => {
  it('is stable across calls', () => {
    expect(settingsHash()).toBe(settingsHash())
  })
})

describe('hashFile', () => {
  it('depends on the content, not on the name', async () => {
    const a = path.join(dir, 'a.bin')
    const b = path.join(dir, 'b.bin')
    writeFileSync(a, 'same content')
    writeFileSync(b, 'same content')
    expect(await hashFile(a)).toBe(await hashFile(b))

    writeFileSync(b, 'different content')
    expect(await hashFile(a)).not.toBe(await hashFile(b))
  })
})
