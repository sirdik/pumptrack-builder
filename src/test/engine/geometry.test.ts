import {
  distance, polygonPerimeter, polygonArea, polygonCentroid,
  polygonContainsPoint, insetPolygon, pointsToSVGPath, catmullRomPath,
  getBoundingBox, angleBetween,
} from '../../engine/geometry'
import type { Point } from '../../types'

const square: Point[] = [
  { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
]

describe('distance', () => {
  it('computes distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 5)
  })
})

describe('polygonPerimeter', () => {
  it('computes perimeter of a square', () => {
    expect(polygonPerimeter(square)).toBeCloseTo(40, 5)
  })
})

describe('polygonArea', () => {
  it('computes area of a 10×10 square', () => {
    expect(polygonArea(square)).toBeCloseTo(100, 5)
  })
})

describe('polygonCentroid', () => {
  it('centroid of square is at centre', () => {
    const c = polygonCentroid(square)
    expect(c.x).toBeCloseTo(5, 5)
    expect(c.y).toBeCloseTo(5, 5)
  })
})

describe('polygonContainsPoint', () => {
  it('contains interior point', () => {
    expect(polygonContainsPoint(square, { x: 5, y: 5 })).toBe(true)
  })
  it('does not contain exterior point', () => {
    expect(polygonContainsPoint(square, { x: 15, y: 5 })).toBe(false)
  })
})

describe('insetPolygon', () => {
  it('insets a square by 1m on each side', () => {
    const inset = insetPolygon(square, 1)
    expect(inset.length).toBe(4)
    // With radial inset from centroid, corners move further than edges
    inset.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0.7)
      expect(p.x).toBeLessThanOrEqual(9.3)
      expect(p.y).toBeGreaterThanOrEqual(0.7)
      expect(p.y).toBeLessThanOrEqual(9.3)
    })
  })
})

describe('pointsToSVGPath', () => {
  it('generates a closed path string', () => {
    const path = pointsToSVGPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }], true)
    expect(path).toMatch(/^M/)
    expect(path).toMatch(/Z$/)
  })
})

describe('catmullRomPath', () => {
  it('returns more points than input', () => {
    const result = catmullRomPath(square, 10)
    expect(result.length).toBeGreaterThan(square.length)
  })
})

describe('getBoundingBox', () => {
  it('returns correct bounds', () => {
    const bb = getBoundingBox(square)
    expect(bb.minX).toBe(0)
    expect(bb.maxX).toBe(10)
    expect(bb.minY).toBe(0)
    expect(bb.maxY).toBe(10)
    expect(bb.width).toBe(10)
    expect(bb.height).toBe(10)
  })
})

describe('angleBetween', () => {
  it('angle from origin to right is 0', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0, 5)
  })
  it('angle from origin to up is PI/2', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2, 5)
  })
})
