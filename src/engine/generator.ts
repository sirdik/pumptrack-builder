import type {
  LandBoundary, TrackSettings, TrackLayout, TrackElement,
  Topology, Point, PresetValues,
} from '../types'
import { PRESETS, TRACK_WIDTHS, ROLLER_WIDTHS } from '../types'
import {
  insetPolygon, catmullRomPath, distance,
  getBoundingBox, angleBetween, polygonCentroid,
} from './geometry'
import { runPhysics } from './physics'

export interface ResolvedPreset extends PresetValues {
  trackWidthM: number
  rollerWidthM: number
}

export function resolvePreset(s: TrackSettings): ResolvedPreset {
  const preset = PRESETS[s.difficulty]
  return {
    rollerHeightM:       s.rollerHeightM    ?? preset.rollerHeightM,
    rollerSpacingM:      s.rollerSpacingM   ?? preset.rollerSpacingM,
    bermRadiusM:         s.bermRadiusM      ?? preset.bermRadiusM,
    pumpEfficiency:      preset.pumpEfficiency,
    defaultEntrySpeedMs: preset.defaultEntrySpeedMs,
    trackWidthM:         TRACK_WIDTHS[s.bikeType],
    rollerWidthM:        ROLLER_WIDTHS[s.bikeType],
  }
}

function toMeters(pts: Point[]): Point[] {
  return pts.map(p => ({ x: p.x * 0.3048, y: p.y * 0.3048 }))
}

let _id = 0
function nextId(prefix: string): string { return `${prefix}-${++_id}` }

function bankingAngleDeg(speedMs: number, radiusM: number): number {
  return (Math.atan2(speedMs ** 2, radiusM * 9.81) * 180) / Math.PI
}

function placeElements(
  control: Point[],
  settings: TrackSettings,
  p: ResolvedPreset,
): TrackElement[] {
  const elements: TrackElement[] = []
  let currentSpeed = settings.entrySpeedMs
  const n = control.length

  // control is a closed path: control[0] == control[n-1]
  // Iterate every segment including the closing one (i from 1 to n-1 inclusive)
  for (let i = 1; i < n; i++) {
    const prev = control[i - 1]
    const curr = control[i]
    // For the closing point (== control[0]), look at control[1] as "next"
    const next = i < n - 1 ? control[i + 1] : control[1]

    // Rollers on the incoming segment prev→curr
    const segDist = distance(prev, curr)
    if (segDist >= p.rollerSpacingM) {
      const numRollers = Math.floor(segDist / p.rollerSpacingM)
      for (let r = 0; r < numRollers; r++) {
        const t = (r + 0.5) / numRollers
        elements.push({
          type: 'roller', id: nextId('roller'),
          position: { x: prev.x + (curr.x - prev.x) * t, y: prev.y + (curr.y - prev.y) * t },
          widthM: p.rollerWidthM, heightM: p.rollerHeightM,
        })
        currentSpeed = Math.max(0.1, currentSpeed - 0.012 * 9.81 * p.rollerSpacingM / Math.max(currentSpeed, 0.1))
      }
    } else if (segDist > 0.1) {
      elements.push({ type: 'straight', id: nextId('straight'), start: prev, end: curr, widthM: p.trackWidthM })
    }

    // Berm at curr if it's a sharp corner
    const a1 = angleBetween(prev, curr)
    const a2 = angleBetween(curr, next)
    let da = Math.abs(a2 - a1) * (180 / Math.PI)
    if (da > 180) da = 360 - da

    if (da > 20) {
      const banking = settings.bermBankingDeg !== null
        ? settings.bermBankingDeg
        : bankingAngleDeg(currentSpeed, p.bermRadiusM)
      elements.push({
        type: 'berm', id: nextId('berm'), position: curr,
        radiusM: p.bermRadiusM, bankingDeg: banking, sweepDeg: da, entrySpeedMs: currentSpeed,
      })
      const arcLen = p.bermRadiusM * (da * Math.PI / 180)
      currentSpeed = Math.max(0.1, currentSpeed - 0.012 * 9.81 * arcLen / Math.max(currentSpeed, 0.1))
    }
  }

  return elements
}

interface TrackPath { control: Point[]; centerline: Point[] }

function buildLoop(land: LandBoundary, p: ResolvedPreset): TrackPath {
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const inset = insetPolygon(pts, p.trackWidthM / 2 + 0.5)
  const control = [...inset, inset[0]]
  return { control, centerline: catmullRomPath(inset, 10, true) }
}

function buildSnake(land: LandBoundary, p: ResolvedPreset): TrackPath {
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const bb = getBoundingBox(pts)
  const laneHeight = p.bermRadiusM * 2 + p.trackWidthM
  let nLanes = Math.max(2, Math.floor((bb.height - p.trackWidthM) / laneHeight))
  if (nLanes % 2 !== 0) nLanes -= 1  // even lanes so last point matches first side
  const xLeft  = bb.minX + p.bermRadiusM + p.trackWidthM / 2
  const xRight = bb.maxX - p.bermRadiusM - p.trackWidthM / 2
  const unique: Point[] = []
  for (let i = 0; i < nLanes; i++) {
    const y = bb.minY + p.trackWidthM / 2 + p.bermRadiusM + i * laneHeight
    unique.push(i % 2 === 0 ? { x: xLeft, y } : { x: xRight, y })
    unique.push(i % 2 === 0 ? { x: xRight, y } : { x: xLeft, y })
  }
  const control = [...unique, unique[0]]
  return { control, centerline: catmullRomPath(unique, 10, true) }
}

function buildFigure8(land: LandBoundary, p: ResolvedPreset): TrackPath {
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const bb = getBoundingBox(pts)
  const cx = bb.minX + bb.width / 2
  const cy = bb.minY + bb.height / 2
  const rx = bb.width / 2 - p.bermRadiusM - p.trackWidthM
  const ry = bb.height / 4 - p.trackWidthM
  // Use 8 cardinal points per loop as control points so berms land at the tight turns
  const steps = 8
  const control: Point[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    control.push({ x: cx + rx * Math.cos(a), y: cy - ry - ry * Math.sin(a) })
  }
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    control.push({ x: cx + rx * Math.cos(a), y: cy + ry + ry * Math.sin(a) })
  }
  control.push(control[0])
  return { control, centerline: catmullRomPath(control.slice(0, -1), 8, true) }
}

function buildHybrid(land: LandBoundary, p: ResolvedPreset): TrackPath {
  const { control: outerCtrl } = buildLoop(land, p)
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const centroid = polygonCentroid(pts)
  const mid = Math.floor(outerCtrl.length / 2)
  // outerCtrl ends with duplicate first point — exclude it before inserting centroid
  const unique = [...outerCtrl.slice(0, mid), centroid, ...outerCtrl.slice(mid, -1)]
  const control = [...unique, unique[0]]
  return { control, centerline: catmullRomPath(unique, 8, true) }
}

export function generateTrack(
  land: LandBoundary,
  settings: TrackSettings,
  topology: Topology,
  _heightMap?: null,
): TrackLayout {
  _id = 0
  const p = resolvePreset(settings)
  const { control, centerline } =
    topology === 'loop'    ? buildLoop(land, p)    :
    topology === 'snake'   ? buildSnake(land, p)   :
    topology === 'figure8' ? buildFigure8(land, p) :
                             buildHybrid(land, p)

  const elements = placeElements(control, settings, p)
  const draft: TrackLayout = { topology, elements, centerlinePath: centerline, ridability: { passed: false, minSpeedMs: 0, segments: [], warnings: [] } }
  let ridability = runPhysics(draft, settings)

  if (!ridability.passed) {
    const failIds = new Set(ridability.segments.filter(s => s.status === 'fail').map(s => s.elementId))
    const patched: TrackElement[] = []
    for (const el of elements) {
      if (failIds.has(el.id) && el.type !== 'roller') {
        const pos = el.type === 'berm' ? el.position : el.start
        patched.push({ type: 'roller', id: nextId('roller-patch'), position: pos, widthM: p.rollerWidthM, heightM: p.rollerHeightM })
      }
      patched.push(el)
    }
    const patchedDraft = { ...draft, elements: patched }
    ridability = runPhysics(patchedDraft, settings)
    return { ...patchedDraft, ridability }
  }

  return { ...draft, ridability }
}
