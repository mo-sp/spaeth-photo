import { describe, expect, it } from 'vitest'
import { clipSwapAction, type ClipSwapAction } from '../useSiteVideo.ts'

const DARK = 'flock-over-reeds'
const LIGHT = 'misty-lake-sunrise'

/** One run of the swap, asking the question it asks at that point. */
function ask(
  run: number,
  latest: number,
  showing: string,
  wanted: string,
  faded = false,
): ClipSwapAction {
  return clipSwapAction({ showing, wanted, run, latest, faded })
}

describe('clipSwapAction', () => {
  it('loads straight away when the element carries nothing yet', () => {
    expect(ask(1, 1, '', DARK)).toBe('load')
  })

  it('fades the outgoing picture out before loading the new one', () => {
    expect(ask(2, 2, DARK, LIGHT)).toBe('fade')
    expect(ask(2, 2, DARK, LIGHT, true)).toBe('load')
  })

  it('does nothing when the wanted picture is the one on the element', () => {
    expect(ask(1, 1, DARK, DARK)).toBe('nothing')
    expect(ask(1, 1, DARK, DARK, true)).toBe('nothing')
  })

  it('abandons a run that a newer one has overtaken', () => {
    expect(ask(1, 2, DARK, LIGHT, true)).toBe('abandon')
    // Even where it would otherwise have work to do, and even before its fade.
    expect(ask(1, 3, DARK, LIGHT)).toBe('abandon')
  })
})

/**
 * The race the fade opens: 320 ms in which the visitor can pick again. Replayed
 * as the component runs it — a run asks before its fade and again after it, and
 * the second answer is the one that decides what is written.
 */
describe('clipSwapAction across a fade', () => {
  it('lets the picture the palette came back to stay, and silences the run that left it', () => {
    // Dark is on screen and playing.
    let latest = 0
    const showing = DARK

    // Click "Light": run A wants the light clip and starts its fade.
    const runA = ++latest
    expect(ask(runA, latest, showing, LIGHT)).toBe('fade')

    // 100 ms later, click "Shadow": run B finds the dark clip already on the
    // element, so there is nothing to load — it only has to show it again.
    const runB = ++latest
    expect(ask(runB, latest, showing, DARK)).toBe('nothing')

    // A wakes at 320 ms. Without the second question it would write the light
    // clip under a dark palette and leave it there.
    expect(ask(runA, latest, showing, DARK, true)).toBe('abandon')
  })

  it('gives the newest run the load when the palette settles on the other side', () => {
    let latest = 0
    let showing = DARK

    const runA = ++latest
    expect(ask(runA, latest, showing, LIGHT)).toBe('fade')

    // Back to dark, then to light again while A is still waiting.
    const runB = ++latest
    expect(ask(runB, latest, showing, DARK)).toBe('nothing')
    const runC = ++latest
    expect(ask(runC, latest, showing, LIGHT)).toBe('fade')

    expect(ask(runA, latest, showing, LIGHT, true)).toBe('abandon')
    expect(ask(runC, latest, showing, LIGHT, true)).toBe('load')
    showing = LIGHT
    expect(ask(runC, latest, showing, LIGHT, true)).toBe('nothing')
  })

  it('abandons every waiting run once the page is left', () => {
    let latest = 1
    const runA = latest
    expect(ask(runA, latest, DARK, LIGHT)).toBe('fade')
    // Unmount bumps the run, so nothing still waiting writes on the way out.
    latest += 1
    expect(ask(runA, latest, DARK, LIGHT, true)).toBe('abandon')
  })
})
