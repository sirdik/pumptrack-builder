import { frictionExitSpeed, pumpGainSpeed, rollerExitSpeed, bermExitSpeed, runPhysics } from '../../engine/physics'
import type { TrackLayout, TrackSettings } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

describe('frictionExitSpeed', () => {
  it('reduces speed over a 10m straight at 5 m/s', () => {
    const exit = frictionExitSpeed(5, 10)
    // v² = 25 - 2 * 0.012 * 9.81 * 10 = 25 - 2.3544 = 22.6456
    expect(exit).toBeCloseTo(Math.sqrt(22.6456), 3)
  })

  it('does not return negative speed', () => {
    expect(frictionExitSpeed(0.1, 1000)).toBe(0)
  })
})

describe('pumpGainSpeed', () => {
  it('computes gain for 0.30m roller at 0.72 efficiency', () => {
    // sqrt(2 * 9.81 * 0.30 * 0.72) = sqrt(4.238) ≈ 2.058
    expect(pumpGainSpeed(0.30, 0.72)).toBeCloseTo(2.058, 2)
  })
})

describe('rollerExitSpeed', () => {
  it('exit speed is higher than entry for a pumped roller', () => {
    const exit = rollerExitSpeed(4.0, 0.30, 0.72, 1.0)
    expect(exit).toBeGreaterThan(4.0)
  })
})

describe('bermExitSpeed', () => {
  it('loses speed on a plain berm (no compression exit)', () => {
    const exit = bermExitSpeed(4.0, 12.0, false, 0.30, 0.72)
    expect(exit).toBeLessThan(4.0)
  })

  it('gains a small bonus with compression exit', () => {
    const plain = bermExitSpeed(4.0, 12.0, false, 0.30, 0.72)
    const comp  = bermExitSpeed(4.0, 12.0, true,  0.30, 0.72)
    expect(comp).toBeGreaterThan(plain)
  })
})

describe('runPhysics', () => {
  const settings: TrackSettings = { ...DEFAULT_SETTINGS, entrySpeedMs: 4.0 }

  const layout: TrackLayout = {
    topology: 'loop',
    centerlinePath: [],
    elements: [
      { type: 'straight', id: 's1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, widthM: 2.5 },
      { type: 'roller',   id: 'r1', position: { x: 10, y: 0 }, widthM: 1.2, heightM: 0.30 },
      { type: 'berm',     id: 'b1', position: { x: 20, y: 0 }, radiusM: 4.0, bankingDeg: 22, sweepDeg: 90, entrySpeedMs: 4.0 },
    ],
    ridability: { passed: false, minSpeedMs: 0, segments: [], warnings: [] },
  }

  it('returns a report with one segment per element', () => {
    const report = runPhysics(layout, settings)
    expect(report.segments).toHaveLength(3)
  })

  it('marks fast segments as ok', () => {
    const report = runPhysics(layout, settings)
    expect(report.segments[0].status).toBe('ok')
  })

  it('passed is false when any segment fails', () => {
    const slowLayout: TrackLayout = {
      ...layout,
      elements: [
        { type: 'straight', id: 's1', start: { x: 0, y: 0 }, end: { x: 500, y: 0 }, widthM: 2.5 },
      ],
    }
    const report = runPhysics(slowLayout, { ...settings, entrySpeedMs: 1.0 })
    expect(report.passed).toBe(false)
  })
})
