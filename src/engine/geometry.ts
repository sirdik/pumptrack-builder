import type { Point } from '../types'

export interface BoundingBox {
  minX: number; maxX: number; minY: number; maxY: number
  width: number; height: number
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function polygonPerimeter(pts: Point[]): number {
  let total = 0
  for (let i = 0; i < pts.length; i++) {
    total += distance(pts[i], pts[(i + 1) % pts.length])
  }
  return total
}

export function polygonArea(pts: Point[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  return Math.abs(area) / 2
}

export function polygonCentroid(pts: Point[]): Point {
  let x = 0, y = 0
  for (const p of pts) { x += p.x; y += p.y }
  return { x: x / pts.length, y: y / pts.length }
}

export function polygonContainsPoint(polygon: Point[], point: Point): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function getBoundingBox(pts: Point[]): BoundingBox {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

export function insetPolygon(pts: Point[], dist: number): Point[] {
  const centroid = polygonCentroid(pts)
  return pts.map(p => {
    const d = distance(p, centroid)
    if (d === 0) return p
    const ratio = Math.max(0, (d - dist) / d)
    return { x: centroid.x + (p.x - centroid.x) * ratio, y: centroid.y + (p.y - centroid.y) * ratio }
  })
}

export function pointsToSVGPath(pts: Point[], closed: boolean): string {
  if (pts.length === 0) return ''
  const parts = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
  return parts.join(' ') + (closed ? ' Z' : '')
}

export function catmullRomPath(pts: Point[], segments: number): Point[] {
  if (pts.length < 2) return pts
  const result: Point[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let t = 0; t < segments; t++) {
      const s = t / segments
      const s2 = s * s, s3 = s2 * s
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3)
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * s + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3)
      result.push({ x, y })
    }
  }
  result.push(pts[pts.length - 1])
  return result
}
