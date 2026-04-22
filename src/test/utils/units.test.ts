import { metersToFeet, feetToMeters, convertPoints, convertDistance } from '../../utils/units'
import type { Point } from '../../types'

describe('units', () => {
  it('converts meters to feet', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 3)
  })

  it('converts feet to meters', () => {
    expect(feetToMeters(3.28084)).toBeCloseTo(1, 3)
  })

  it('round-trips', () => {
    expect(feetToMeters(metersToFeet(5))).toBeCloseTo(5, 5)
  })

  it('converts a point array from feet to meters', () => {
    const pts: Point[] = [{ x: 3.28084, y: 6.56168 }]
    const result = convertPoints(pts, 'feet', 'meters')
    expect(result[0].x).toBeCloseTo(1, 3)
    expect(result[0].y).toBeCloseTo(2, 3)
  })

  it('converts distance from feet to meters', () => {
    expect(convertDistance(1, 'feet', 'meters')).toBeCloseTo(0.3048, 4)
  })

  it('noop when units are same', () => {
    expect(convertDistance(5, 'meters', 'meters')).toBe(5)
  })
})
