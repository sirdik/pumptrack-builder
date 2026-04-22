import type { Point, LandUnit } from '../types'

const M_PER_FOOT = 0.3048

export function metersToFeet(m: number): number {
  return m / M_PER_FOOT
}

export function feetToMeters(ft: number): number {
  return ft * M_PER_FOOT
}

export function convertDistance(value: number, from: LandUnit, to: LandUnit): number {
  if (from === to) return value
  return from === 'feet' ? feetToMeters(value) : metersToFeet(value)
}

export function convertPoints(points: Point[], from: LandUnit, to: LandUnit): Point[] {
  if (from === to) return points
  const factor = from === 'feet' ? M_PER_FOOT : 1 / M_PER_FOOT
  return points.map(p => ({ x: p.x * factor, y: p.y * factor }))
}
