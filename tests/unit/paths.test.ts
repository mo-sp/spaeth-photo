import { homedir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEMO_DIR,
  ROOT,
  assertInside,
  displayPath,
  expandHome,
  fromRoot,
  isInside,
  resolveSource,
} from '../../scripts/lib/paths.ts'

describe('isInside', () => {
  it('recognises real child paths', () => {
    expect(isInside('/a/b', '/a/b/c')).toBe(true)
    expect(isInside('/a/b', '/a/b/c/d.txt')).toBe(true)
  })

  it('is not fooled by a shared name prefix', () => {
    // /a/bc is NOT inside /a/b — a plain string comparison would fall over here.
    expect(isInside('/a/b', '/a/bc')).toBe(false)
    expect(isInside('/a/b', '/a/b-anders/x')).toBe(false)
  })

  it('recognises escapes via ..', () => {
    expect(isInside('/a/b', '/a/b/../../etc/passwd')).toBe(false)
    expect(isInside('/a/b', '/a')).toBe(false)
  })

  it('does not count a directory as its own child', () => {
    expect(isInside('/a/b', '/a/b')).toBe(false)
    expect(isInside('/a/b', '/a/b/')).toBe(false)
  })
})

describe('assertInside', () => {
  it('returns the normalised path', () => {
    expect(assertInside('/a/b', '/a/b/./c')).toBe(path.resolve('/a/b/c'))
  })

  it('throws rather than working outside', () => {
    expect(() => assertInside('/a/b', '/a/b/../x')).toThrow()
    expect(() => assertInside('/a/b', '/etc/passwd')).toThrow()
  })
})

describe('expandHome', () => {
  it('replaces only a leading ~', () => {
    expect(expandHome('~')).toBe(homedir())
    expect(expandHome('~/photos')).toBe(path.join(homedir(), 'photos'))
    expect(expandHome('/tmp/~/x')).toBe('/tmp/~/x')
    expect(expandHome('~user/x')).toBe('~user/x')
  })
})

describe('fromRoot', () => {
  it('resolves relative paths against the project root, not the working directory', () => {
    expect(fromRoot('content')).toBe(path.join(ROOT, 'content'))
    expect(fromRoot('/tmp/x')).toBe('/tmp/x')
  })
})

describe('displayPath', () => {
  it('shortens paths inside the project', () => {
    expect(displayPath(path.join(ROOT, 'public', 'img'))).toBe('public/img')
    expect(displayPath('/etc/hosts')).toBe('/etc/hosts')
  })
})

describe('resolveSource', () => {
  it('recognises the demo content as such', () => {
    const resolved = resolveSource('demo-content')
    expect(resolved.mode).toBe('demo')
    expect(resolved.sourceDir).toBe(path.join(DEMO_DIR, 'photos', 'source'))
  })

  it('falls back to the demo content when the override points nowhere', () => {
    // The case of a foreign clone without access to the private submodule: the
    // build must not fail over it.
    const resolved = resolveSource('/does/not/exist')
    expect(['content', 'demo']).toContain(resolved.mode)
    expect(resolved.sourceDir).not.toBe('/does/not/exist')
  })
})
