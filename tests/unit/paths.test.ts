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
  it('erkennt echte Kindpfade', () => {
    expect(isInside('/a/b', '/a/b/c')).toBe(true)
    expect(isInside('/a/b', '/a/b/c/d.txt')).toBe(true)
  })

  it('lässt sich von einem gemeinsamen Namenspräfix nicht täuschen', () => {
    // /a/bc liegt NICHT in /a/b — ein reiner Zeichenkettenvergleich fiele hier um.
    expect(isInside('/a/b', '/a/bc')).toBe(false)
    expect(isInside('/a/b', '/a/b-anders/x')).toBe(false)
  })

  it('erkennt Ausbrüche über ..', () => {
    expect(isInside('/a/b', '/a/b/../../etc/passwd')).toBe(false)
    expect(isInside('/a/b', '/a')).toBe(false)
  })

  it('zählt ein Verzeichnis nicht als sein eigenes Kind', () => {
    expect(isInside('/a/b', '/a/b')).toBe(false)
    expect(isInside('/a/b', '/a/b/')).toBe(false)
  })
})

describe('assertInside', () => {
  it('gibt den normalisierten Pfad zurück', () => {
    expect(assertInside('/a/b', '/a/b/./c')).toBe(path.resolve('/a/b/c'))
  })

  it('wirft, statt außerhalb zu arbeiten', () => {
    expect(() => assertInside('/a/b', '/a/b/../x')).toThrow()
    expect(() => assertInside('/a/b', '/etc/passwd')).toThrow()
  })
})

describe('expandHome', () => {
  it('ersetzt nur ein führendes ~', () => {
    expect(expandHome('~')).toBe(homedir())
    expect(expandHome('~/bilder')).toBe(path.join(homedir(), 'bilder'))
    expect(expandHome('/tmp/~/x')).toBe('/tmp/~/x')
    expect(expandHome('~nutzer/x')).toBe('~nutzer/x')
  })
})

describe('fromRoot', () => {
  it('bezieht relative Pfade auf die Projektwurzel, nicht auf das Arbeitsverzeichnis', () => {
    expect(fromRoot('content')).toBe(path.join(ROOT, 'content'))
    expect(fromRoot('/tmp/x')).toBe('/tmp/x')
  })
})

describe('displayPath', () => {
  it('kürzt Pfade innerhalb des Projekts', () => {
    expect(displayPath(path.join(ROOT, 'public', 'img'))).toBe('public/img')
    expect(displayPath('/etc/hosts')).toBe('/etc/hosts')
  })
})

describe('resolveSource', () => {
  it('erkennt den Demo-Content als solchen', () => {
    const resolved = resolveSource('demo-content')
    expect(resolved.mode).toBe('demo')
    expect(resolved.sourceDir).toBe(path.join(DEMO_DIR, 'photos', 'source'))
  })

  it('fällt auf den Demo-Content zurück, wenn der Override ins Leere zeigt', () => {
    // Genau der Fall eines fremden Clones ohne Zugriff auf das private Submodule:
    // der Build darf daran nicht scheitern.
    const resolved = resolveSource('/gibt/es/nicht')
    expect(['content', 'demo']).toContain(resolved.mode)
    expect(resolved.sourceDir).not.toBe('/gibt/es/nicht')
  })
})
