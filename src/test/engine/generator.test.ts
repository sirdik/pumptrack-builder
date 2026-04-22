import { generateTrack, resolvePreset } from '../../engine/generator'
import type { LandBoundary, TrackSettings } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

const squareLand: LandBoundary = {
  unit: 'meters',
  points: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }],
}

const settings: TrackSettings = { ...DEFAULT_SETTINGS, entrySpeedMs: 4.0 }

describe('resolvePreset', () => {
  it('uses preset values when settings are null', () => {
    const resolved = resolvePreset(settings)
    expect(resolved.rollerHeightM).toBe(0.30)
    expect(resolved.bermRadiusM).toBe(4.00)
  })

  it('uses override when set', () => {
    const resolved = resolvePreset({ ...settings, rollerHeightM: 0.45 })
    expect(resolved.rollerHeightM).toBe(0.45)
  })
})

describe('generateTrack', () => {
  it('returns a layout with elements for a 30×20m plot', () => {
    const layout = generateTrack(squareLand, settings, 'loop')
    expect(layout.elements.length).toBeGreaterThan(0)
    expect(layout.topology).toBe('loop')
  })

  it('includes at least one berm', () => {
    const layout = generateTrack(squareLand, settings, 'loop')
    expect(layout.elements.some(e => e.type === 'berm')).toBe(true)
  })

  it('includes at least one roller', () => {
    const layout = generateTrack(squareLand, settings, 'loop')
    expect(layout.elements.some(e => e.type === 'roller')).toBe(true)
  })

  it('ridability report is populated', () => {
    const layout = generateTrack(squareLand, settings, 'loop')
    expect(layout.ridability.segments.length).toBeGreaterThan(0)
  })

  it('generates a snake layout', () => {
    const layout = generateTrack(squareLand, settings, 'snake')
    expect(layout.topology).toBe('snake')
    expect(layout.elements.length).toBeGreaterThan(0)
  })
})
