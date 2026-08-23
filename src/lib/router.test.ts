import { describe, expect, it } from 'vitest'
import { HOME, normalise, ROUTES } from './router'

describe('path normalisation', () => {
  it('keeps the routes we serve', () => {
    for (const route of ROUTES) expect(normalise(route)).toBe(route)
  })

  it('sends the root to home', () => {
    expect(normalise('/')).toBe(HOME)
  })

  it('sends anything unknown to home rather than rendering nothing', () => {
    for (const path of ['/nope', '/offer/123', '/HOME', '/home/', '']) {
      expect(normalise(path)).toBe(HOME)
    }
  })

  it('is case sensitive, matching how the paths are actually served', () => {
    expect(normalise('/Offer')).toBe(HOME)
  })

  it('home is one of the routes it can return', () => {
    expect(ROUTES).toContain(HOME)
  })
})
