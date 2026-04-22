# Pumptrack Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React web app that generates rideable pumptrack layouts from a user-defined land boundary, validates them with a basic energy model, and displays the result in 2D and 3D.

**Architecture:** Pure client-side Vite + React + TypeScript app. A headless engine layer (geometry, physics, generator) handles all computation; Zustand holds all project state; SVG renders the interactive 2D editor and React Three Fiber renders the 3D view. No backend — persistence is JSON export/import.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Zustand 4, React Three Fiber 8, Drei 9, Three.js, Vitest, React Testing Library, jsdom

---

## File Map

```
src/
  types/index.ts              All shared TypeScript types + preset constants
  engine/
    geometry.ts               Polygon math, Catmull-Rom spline, SVG path helpers
    physics.ts                Energy model — speed at each track segment
    generator.ts              Path topology search + berm/roller placement
  store/useProjectStore.ts    Zustand store — single source of truth
  utils/
    io.ts                     .ptb JSON export / import
    units.ts                  Metric ↔ imperial conversion
  components/
    App.tsx                   Root — three-column layout shell
    TopBar.tsx                Title, Import, Export buttons
    Sidebar.tsx               Container for all left-panel controls
    TopologySelector.tsx      Loop / Fig-8 / Snake / Hybrid buttons
    BikeTypeSelector.tsx      MTB / BMX / Mixed toggle
    DifficultySelector.tsx    Beginner / Intermediate / Expert toggle
    AdvancedParams.tsx        Roller height, spacing, berm radius inputs
    GenerateButton.tsx        Triggers generator, writes result to store
    LandEditor/
      LandEditor.tsx          Tab container (Draw / Dimensions / Upload)
      DrawInput.tsx           SVG polygon drawing canvas
      DimensionsInput.tsx     Width × length form → rectangle boundary
      UploadInput.tsx         Image upload + boundary trace overlay
    TrackEditor.tsx           SVG overlay — draggable track elements
    ThreeDView.tsx            R3F scene — 3D track visualization
    RidabilityPanel.tsx       Score + per-segment speed table
    ConstructionPanel.tsx     Element counts, track length, fill volume
  test/
    engine/geometry.test.ts
    engine/physics.test.ts
    engine/generator.test.ts
    utils/units.test.ts
    utils/io.test.ts
    store/useProjectStore.test.ts
    setup.ts
```

---

## Task 1: Project Scaffolding + Vitest

**Files:**
- Create: `vite.config.ts`, `vitest.config.ts`, `src/test/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Scaffold Vite project**

Run in `C:/webdev/pumptrack-builder`:
```bash
npm create vite@latest . -- --template react-ts
```
Accept prompts to overwrite existing files (LICENSE, README are already there).

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install zustand three @react-three/fiber @react-three/drei
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/three
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

In the `"scripts"` section, add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 7: Write a sanity test**

Create `src/test/sanity.test.ts`:
```ts
describe('sanity', () => {
  it('1 + 1 = 2', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 8: Run test to verify setup**

```bash
npm test
```
Expected: `1 passed`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite React TS project with Vitest"
```

---

## Task 2: TypeScript Types + Preset Constants

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create `src/types/index.ts`**

```ts
export type BikeType = 'mtb' | 'bmx' | 'mixed'
export type Difficulty = 'beginner' | 'intermediate' | 'expert'
export type Topology = 'loop' | 'figure8' | 'snake' | 'hybrid'
export type SegmentStatus = 'ok' | 'warning' | 'fail'
export type LandUnit = 'meters' | 'feet'

export interface Point {
  x: number
  y: number
}

export interface LandBoundary {
  points: Point[]
  unit: LandUnit
}

export interface TrackSettings {
  bikeType: BikeType
  difficulty: Difficulty
  riderWeightKg: number      // reserved for Phase 2 — not used in Phase 1 physics
  entrySpeedMs: number
  rollerHeightM: number | null
  rollerSpacingM: number | null
  bermRadiusM: number | null
  bermBankingDeg: number | null  // null = computed from speed
  transitionLengthM: number | null
}

export type TrackElement =
  | { type: 'roller';   id: string; position: Point; widthM: number; heightM: number }
  | { type: 'berm';     id: string; position: Point; radiusM: number; bankingDeg: number; sweepDeg: number; entrySpeedMs: number }
  | { type: 'straight'; id: string; start: Point; end: Point; widthM: number }

export interface SegmentReport {
  elementId: string
  entrySpeedMs: number
  exitSpeedMs: number
  status: SegmentStatus
}

export interface RidabilityReport {
  passed: boolean
  minSpeedMs: number
  segments: SegmentReport[]
  warnings: string[]
}

export interface TrackLayout {
  topology: Topology
  elements: TrackElement[]
  centerlinePath: Point[]
  ridability: RidabilityReport
}

export interface Project {
  version: string
  name: string
  createdAt: string
  settings: TrackSettings
  land: LandBoundary
  track: TrackLayout | null
}

export interface HeightField {
  width: number
  height: number
  scaleM: number
  data: Float32Array
}

// ─── Preset tables ────────────────────────────────────────────────────────────

export interface PresetValues {
  rollerHeightM: number
  rollerSpacingM: number
  bermRadiusM: number
  pumpEfficiency: number
  defaultEntrySpeedMs: number
}

export const PRESETS: Record<Difficulty, PresetValues> = {
  beginner:     { rollerHeightM: 0.20, rollerSpacingM: 3.50, bermRadiusM: 5.00, pumpEfficiency: 0.60, defaultEntrySpeedMs: 3.0 },
  intermediate: { rollerHeightM: 0.30, rollerSpacingM: 2.50, bermRadiusM: 4.00, pumpEfficiency: 0.72, defaultEntrySpeedMs: 4.0 },
  expert:       { rollerHeightM: 0.40, rollerSpacingM: 2.00, bermRadiusM: 3.00, pumpEfficiency: 0.85, defaultEntrySpeedMs: 5.5 },
}

export const TRACK_WIDTHS: Record<BikeType, number> = { mtb: 2.5, bmx: 2.0, mixed: 2.5 }
export const ROLLER_WIDTHS: Record<BikeType, number> = { mtb: 1.2, bmx: 0.9, mixed: 1.2 }

export const DEFAULT_SETTINGS: TrackSettings = {
  bikeType: 'mtb',
  difficulty: 'intermediate',
  riderWeightKg: 80,
  entrySpeedMs: 4.0,
  rollerHeightM: null,
  rollerSpacingM: null,
  bermRadiusM: null,
  bermBankingDeg: null,
  transitionLengthM: null,
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types and preset constants"
```

---

## Task 3: Unit Utilities

**Files:**
- Create: `src/utils/units.ts`, `src/test/utils/units.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/utils/units.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- units
```
Expected: FAIL — `Cannot find module '../../utils/units'`

- [ ] **Step 3: Create `src/utils/units.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- units
```
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/utils/units.ts src/test/utils/units.test.ts
git commit -m "feat: add unit conversion utilities"
```

---

## Task 4: Geometry Engine

**Files:**
- Create: `src/engine/geometry.ts`, `src/test/engine/geometry.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/engine/geometry.test.ts`:
```ts
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
    inset.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0.9)
      expect(p.x).toBeLessThanOrEqual(9.1)
      expect(p.y).toBeGreaterThanOrEqual(0.9)
      expect(p.y).toBeLessThanOrEqual(9.1)
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- geometry
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/engine/geometry.ts`**

```ts
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

// Inset a convex polygon by offsetting each vertex toward the centroid
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

// Catmull-Rom spline — returns `segments` interpolated points per input segment
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- geometry
```
Expected: all passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/geometry.ts src/test/engine/geometry.test.ts
git commit -m "feat: add geometry engine"
```

---

## Task 5: Physics Engine

**Files:**
- Create: `src/engine/physics.ts`, `src/test/engine/physics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/engine/physics.test.ts`:
```ts
import { frictionExitSpeed, pumpGainSpeed, rollerExitSpeed, bermExitSpeed, runPhysics } from '../../engine/physics'
import type { TrackLayout, TrackSettings } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

const G = 9.81
const MU = 0.012

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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- physics
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/engine/physics.ts`**

```ts
import type { TrackLayout, TrackSettings, RidabilityReport, SegmentReport } from '../types'
import { PRESETS } from '../types'
import { distance } from './geometry'

const G = 9.81
const MU = 0.012  // rolling resistance coefficient (packed dirt)
const MIN_SPEED = 1.5  // m/s — fail threshold
const WARN_SPEED = 2.5  // m/s — warning threshold

export function frictionExitSpeed(entrySpeed: number, dist: number): number {
  const v2 = entrySpeed ** 2 - 2 * MU * G * dist
  return Math.sqrt(Math.max(0, v2))
}

export function pumpGainSpeed(rollerHeight: number, pumpEfficiency: number): number {
  return Math.sqrt(2 * G * rollerHeight * pumpEfficiency)
}

export function rollerExitSpeed(
  entrySpeed: number,
  rollerHeight: number,
  pumpEfficiency: number,
  transitionLength: number,
): number {
  const gain = pumpGainSpeed(rollerHeight, pumpEfficiency)
  const afterPump = Math.sqrt(entrySpeed ** 2 + gain ** 2)
  return frictionExitSpeed(afterPump, transitionLength)
}

export function bermExitSpeed(
  entrySpeed: number,
  arcLength: number,
  hasCompressionExit: boolean,
  rollerHeight: number,
  pumpEfficiency: number,
): number {
  const afterFriction = frictionExitSpeed(entrySpeed, arcLength)
  if (!hasCompressionExit) return afterFriction
  const compressionGain = pumpGainSpeed(rollerHeight * 0.3, pumpEfficiency)
  return Math.sqrt(afterFriction ** 2 + compressionGain ** 2)
}

export function runPhysics(layout: TrackLayout, settings: TrackSettings): RidabilityReport {
  const preset = PRESETS[settings.difficulty]
  const pumpEff = preset.pumpEfficiency
  const rollerH = settings.rollerHeightM ?? preset.rollerHeightM
  const transLen = settings.transitionLengthM ?? 1.0

  let speed = settings.entrySpeedMs
  let minSpeed = speed
  const segments: SegmentReport[] = []
  const warnings: string[] = []

  for (const el of layout.elements) {
    const entry = speed
    let exit: number

    if (el.type === 'straight') {
      exit = frictionExitSpeed(entry, distance(el.start, el.end))
    } else if (el.type === 'roller') {
      exit = rollerExitSpeed(entry, el.heightM, pumpEff, transLen)
    } else {
      const arcLen = el.radiusM * (el.sweepDeg * Math.PI / 180)
      exit = bermExitSpeed(entry, arcLen, true, rollerH, pumpEff)
    }

    const status: SegmentReport['status'] = exit < MIN_SPEED ? 'fail' : exit < WARN_SPEED ? 'warning' : 'ok'
    if (status === 'fail') warnings.push(`${el.id}: speed too low (${exit.toFixed(1)} m/s)`)

    segments.push({ elementId: el.id, entrySpeedMs: entry, exitSpeedMs: exit, status })
    minSpeed = Math.min(minSpeed, exit)
    speed = exit
  }

  return { passed: !segments.some(s => s.status === 'fail'), minSpeedMs: minSpeed, segments, warnings }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- physics
```
Expected: all passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/physics.ts src/test/engine/physics.test.ts
git commit -m "feat: add physics energy model"
```

---

## Task 6: Track Generator

**Files:**
- Create: `src/engine/generator.ts`, `src/test/engine/generator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/engine/generator.test.ts`:
```ts
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
    expect(resolved.rollerHeightM).toBe(0.30)   // intermediate preset
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- generator
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/engine/generator.ts`**

```ts
import type {
  LandBoundary, TrackSettings, TrackLayout, TrackElement,
  Topology, Point, PresetValues,
} from '../types'
import { PRESETS, TRACK_WIDTHS, ROLLER_WIDTHS } from '../types'
import {
  insetPolygon, catmullRomPath, polygonPerimeter, distance,
  getBoundingBox, angleBetween, polygonCentroid,
} from './geometry'
import { runPhysics } from './physics'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export interface ResolvedPreset extends PresetValues {
  trackWidthM: number
  rollerWidthM: number
}

export function resolvePreset(s: TrackSettings): ResolvedPreset {
  const preset = PRESETS[s.difficulty]
  return {
    rollerHeightM:    s.rollerHeightM    ?? preset.rollerHeightM,
    rollerSpacingM:   s.rollerSpacingM   ?? preset.rollerSpacingM,
    bermRadiusM:      s.bermRadiusM      ?? preset.bermRadiusM,
    pumpEfficiency:   preset.pumpEfficiency,
    defaultEntrySpeedMs: preset.defaultEntrySpeedMs,
    trackWidthM:      TRACK_WIDTHS[s.bikeType],
    rollerWidthM:     ROLLER_WIDTHS[s.bikeType],
  }
}

function toMeters(pts: Point[]): Point[] {
  return pts.map(p => ({ x: p.x * 0.3048, y: p.y * 0.3048 }))
}

let _id = 0
function nextId(prefix: string): string { return `${prefix}-${++_id}` }

// ─── Banking angle from speed and radius ─────────────────────────────────────

function bankingAngleDeg(speedMs: number, radiusM: number): number {
  return (Math.atan2(speedMs ** 2, radiusM * 9.81) * 180) / Math.PI
}

// ─── Element placement ───────────────────────────────────────────────────────

function placeElements(
  centerline: Point[],
  settings: TrackSettings,
  p: ResolvedPreset,
): TrackElement[] {
  const elements: TrackElement[] = []
  let currentSpeed = settings.entrySpeedMs

  for (let i = 1; i < centerline.length - 1; i++) {
    const prev = centerline[i - 1]
    const curr = centerline[i]
    const next = centerline[i + 1]

    const a1 = angleBetween(prev, curr)
    const a2 = angleBetween(curr, next)
    let da = Math.abs(a2 - a1) * (180 / Math.PI)
    if (da > 180) da = 360 - da

    // Place a berm at corners > 20°
    if (da > 20) {
      const banking = settings.bermBankingDeg !== null
        ? settings.bermBankingDeg
        : bankingAngleDeg(currentSpeed, p.bermRadiusM)
      const berm: TrackElement = {
        type: 'berm',
        id: nextId('berm'),
        position: curr,
        radiusM: p.bermRadiusM,
        bankingDeg: banking,
        sweepDeg: da,
        entrySpeedMs: currentSpeed,
      }
      elements.push(berm)
      const arcLen = p.bermRadiusM * (da * Math.PI / 180)
      currentSpeed = Math.max(0, currentSpeed - 0.012 * 9.81 * arcLen / currentSpeed)
      continue
    }

    // Place rollers on straights
    const segDist = distance(prev, curr)
    if (segDist >= p.rollerSpacingM) {
      const numRollers = Math.floor(segDist / p.rollerSpacingM)
      for (let r = 0; r < numRollers; r++) {
        const t = (r + 0.5) / numRollers
        const pos: Point = { x: prev.x + (curr.x - prev.x) * t, y: prev.y + (curr.y - prev.y) * t }
        elements.push({
          type: 'roller', id: nextId('roller'), position: pos,
          widthM: p.rollerWidthM, heightM: p.rollerHeightM,
        })
      }
    } else if (i > 0 && elements.length > 0) {
      // Add a straight segment between features
      elements.push({
        type: 'straight', id: nextId('straight'),
        start: prev, end: curr, widthM: p.trackWidthM,
      })
    }
  }

  return elements
}

// ─── Topology: loop ──────────────────────────────────────────────────────────

function buildLoop(land: LandBoundary, p: ResolvedPreset): Point[] {
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const clearance = p.trackWidthM / 2 + 0.5
  const inset = insetPolygon(pts, clearance)
  // Close the loop
  return catmullRomPath([...inset, inset[0]], 8)
}

// ─── Topology: snake ─────────────────────────────────────────────────────────

function buildSnake(land: LandBoundary, p: ResolvedPreset): Point[] {
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const bb = getBoundingBox(pts)
  const laneHeight = p.bermRadiusM * 2 + p.trackWidthM
  const nLanes = Math.max(2, Math.floor((bb.height - p.trackWidthM) / laneHeight))
  const xLeft  = bb.minX + p.bermRadiusM + p.trackWidthM / 2
  const xRight = bb.maxX - p.bermRadiusM - p.trackWidthM / 2
  const path: Point[] = []

  for (let i = 0; i < nLanes; i++) {
    const y = bb.minY + p.trackWidthM / 2 + p.bermRadiusM + i * laneHeight
    if (i % 2 === 0) {
      path.push({ x: xLeft, y })
      path.push({ x: xRight, y })
    } else {
      path.push({ x: xRight, y })
      path.push({ x: xLeft, y })
    }
  }
  return catmullRomPath(path, 10)
}

// ─── Topology: figure8 ───────────────────────────────────────────────────────

function buildFigure8(land: LandBoundary, p: ResolvedPreset): Point[] {
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const bb = getBoundingBox(pts)
  const cx = bb.minX + bb.width / 2
  const cy = bb.minY + bb.height / 2
  const rx = bb.width / 2 - p.bermRadiusM - p.trackWidthM
  const ry = bb.height / 4 - p.trackWidthM

  const topLoop: Point[] = []
  const botLoop: Point[] = []
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    topLoop.push({ x: cx + rx * Math.cos(a), y: cy - ry - ry * Math.sin(a) })
    botLoop.push({ x: cx + rx * Math.cos(a), y: cy + ry + ry * Math.sin(a) })
  }
  return catmullRomPath([...topLoop, ...botLoop], 6)
}

// ─── Topology: hybrid ────────────────────────────────────────────────────────

function buildHybrid(land: LandBoundary, p: ResolvedPreset): Point[] {
  const outer = buildLoop(land, p)
  const pts = land.unit === 'feet' ? toMeters(land.points) : land.points
  const centroid = polygonCentroid(pts)
  // Insert a short inner branch from the centroid and back
  const mid = Math.floor(outer.length / 2)
  const branch: Point[] = [outer[mid], centroid, outer[mid]]
  return [...outer.slice(0, mid), ...catmullRomPath(branch, 4), ...outer.slice(mid)]
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function generateTrack(
  land: LandBoundary,
  settings: TrackSettings,
  topology: Topology,
  _heightMap?: null,
): TrackLayout {
  _id = 0  // reset element ID counter per generation
  const p = resolvePreset(settings)

  const centerline =
    topology === 'loop'    ? buildLoop(land, p)    :
    topology === 'snake'   ? buildSnake(land, p)   :
    topology === 'figure8' ? buildFigure8(land, p) :
                             buildHybrid(land, p)

  const elements = placeElements(centerline, settings, p)
  const draft: TrackLayout = { topology, elements, centerlinePath: centerline, ridability: { passed: false, minSpeedMs: 0, segments: [], warnings: [] } }

  // Validate and attempt one round of adjustment
  let ridability = runPhysics(draft, settings)
  if (!ridability.passed) {
    // Add a roller before each failing segment
    const failIds = new Set(ridability.segments.filter(s => s.status === 'fail').map(s => s.elementId))
    const patched: TrackElement[] = []
    for (const el of elements) {
      if (failIds.has(el.id) && el.type !== 'roller') {
        const pos = el.type === 'berm' ? el.position : el.start
        patched.push({ type: 'roller', id: nextId('roller-patch'), position: pos, widthM: p.rollerWidthM, heightM: p.rollerHeightM })
      }
      patched.push(el)
    }
    const patched_draft = { ...draft, elements: patched }
    ridability = runPhysics(patched_draft, settings)
    return { ...patched_draft, ridability }
  }

  return { ...draft, ridability }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- generator
```
Expected: all passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/generator.ts src/test/engine/generator.test.ts
git commit -m "feat: add track generator with loop/snake/figure8/hybrid topologies"
```

---

## Task 7: Zustand Store

**Files:**
- Create: `src/store/useProjectStore.ts`, `src/test/store/useProjectStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/store/useProjectStore.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react'
import { useProjectStore } from '../../store/useProjectStore'
import type { LandBoundary } from '../../types'

const land: LandBoundary = {
  unit: 'meters',
  points: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }],
}

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('starts with null track', () => {
    const { result } = renderHook(() => useProjectStore())
    expect(result.current.project.track).toBeNull()
  })

  it('setLand updates the land boundary', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => result.current.setLand(land))
    expect(result.current.project.land.points).toHaveLength(4)
  })

  it('setTopology updates the topology and clears track', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => result.current.setTopology('snake'))
    expect(result.current.topology).toBe('snake')
  })

  it('generate populates project.track', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setLand(land)
      result.current.generate()
    })
    expect(result.current.project.track).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- useProjectStore
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/store/useProjectStore.ts`**

```ts
import { create } from 'zustand'
import type { Project, TrackSettings, LandBoundary, Topology } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { generateTrack } from '../engine/generator'

interface ProjectStore {
  project: Project
  topology: Topology
  setLand: (land: LandBoundary) => void
  setSettings: (settings: Partial<TrackSettings>) => void
  setTopology: (topology: Topology) => void
  generate: () => void
  reset: () => void
  loadProject: (project: Project) => void
}

const initialProject = (): Project => ({
  version: '1',
  name: 'Untitled Project',
  createdAt: new Date().toISOString(),
  settings: { ...DEFAULT_SETTINGS },
  land: { points: [], unit: 'meters' },
  track: null,
})

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: initialProject(),
  topology: 'loop',

  setLand: (land) =>
    set(s => ({ project: { ...s.project, land, track: null } })),

  setSettings: (patch) =>
    set(s => ({
      project: {
        ...s.project,
        settings: { ...s.project.settings, ...patch },
        track: null,
      },
    })),

  setTopology: (topology) => set({ topology }),

  generate: () => {
    const { project, topology } = get()
    if (project.land.points.length < 3) return
    const track = generateTrack(project.land, project.settings, topology)
    set(s => ({ project: { ...s.project, track } }))
  },

  reset: () => set({ project: initialProject(), topology: 'loop' }),

  loadProject: (project) => set({ project }),
}))
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- useProjectStore
```
Expected: all passed

- [ ] **Step 5: Commit**

```bash
git add src/store/useProjectStore.ts src/test/store/useProjectStore.test.ts
git commit -m "feat: add Zustand project store"
```

---

## Task 8: Save / Load Utilities

**Files:**
- Create: `src/utils/io.ts`, `src/test/utils/io.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/utils/io.test.ts`:
```ts
import { serialiseProject, deserialiseProject } from '../../utils/io'
import type { Project } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

const project: Project = {
  version: '1',
  name: 'Test',
  createdAt: '2026-04-22T00:00:00.000Z',
  settings: { ...DEFAULT_SETTINGS },
  land: { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], unit: 'meters' },
  track: null,
}

describe('io', () => {
  it('round-trips a project through serialise/deserialise', () => {
    const json = serialiseProject(project)
    const result = deserialiseProject(json)
    expect(result.name).toBe('Test')
    expect(result.land.points).toHaveLength(3)
    expect(result.version).toBe('1')
  })

  it('throws on invalid JSON', () => {
    expect(() => deserialiseProject('not json')).toThrow()
  })

  it('throws when version field is missing', () => {
    const bad = JSON.stringify({ name: 'no version' })
    expect(() => deserialiseProject(bad)).toThrow('Invalid .ptb file')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- io
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/utils/io.ts`**

```ts
import type { Project } from '../types'

export function serialiseProject(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function deserialiseProject(json: string): Project {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) {
    throw new Error('Invalid .ptb file: missing version field')
  }
  return parsed as Project
}

export function downloadProject(project: Project): void {
  const blob = new Blob([serialiseProject(project)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/\s+/g, '-')}.ptb`
  a.click()
  URL.revokeObjectURL(url)
}

export function uploadProject(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(deserialiseProject(e.target?.result as string))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- io
```
Expected: 3 passed

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/io.ts src/test/utils/io.test.ts
git commit -m "feat: add .ptb save/load utilities"
```

---

## Task 9: App Shell + TopBar

**Files:**
- Create: `src/components/TopBar.tsx`, `src/components/App.tsx`, `src/App.css`

- [ ] **Step 1: Replace `src/App.tsx` with the layout shell**

```tsx
import { useState } from 'react'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import TrackEditor from './components/TrackEditor'
import ThreeDView from './components/ThreeDView'
import RidabilityPanel from './components/RidabilityPanel'
import ConstructionPanel from './components/ConstructionPanel'
import './App.css'

export default function App() {
  const [view, setView] = useState<'2d' | '3d'>('2d')

  return (
    <div className="app">
      <TopBar />
      <div className="app-body">
        <aside className="sidebar-col">
          <Sidebar />
        </aside>
        <main className="canvas-col">
          <div className="view-toggle">
            <button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>2D</button>
            <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>3D</button>
          </div>
          {view === '2d' ? <TrackEditor /> : <ThreeDView />}
        </main>
        <aside className="right-col">
          <RidabilityPanel />
          <ConstructionPanel />
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/App.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f1f0f; color: #e0e0e0; height: 100vh; }
.app { display: flex; flex-direction: column; height: 100vh; }
.app-body { display: grid; grid-template-columns: 240px 1fr 260px; flex: 1; overflow: hidden; }
.sidebar-col { border-right: 1px solid #2a3a2a; overflow-y: auto; }
.canvas-col { position: relative; background: #1a2a1a; display: flex; flex-direction: column; }
.right-col { border-left: 1px solid #2a3a2a; overflow-y: auto; display: flex; flex-direction: column; }
.view-toggle { position: absolute; top: 12px; right: 12px; z-index: 10; display: flex; gap: 4px; }
.view-toggle button { padding: 4px 12px; border: 1px solid #2a3a2a; background: #1a2a1a; color: #888; cursor: pointer; border-radius: 4px; font-size: 12px; }
.view-toggle button.active { background: #4a7a30; color: white; border-color: #4a7a30; }
```

- [ ] **Step 3: Create `src/components/TopBar.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'
import { downloadProject, uploadProject } from '../utils/io'

export default function TopBar() {
  const { project, loadProject } = useProjectStore()

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ptb'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const loaded = await uploadProject(file)
        loadProject(loaded)
      } catch {
        alert('Could not load file. Make sure it is a valid .ptb file.')
      }
    }
    input.click()
  }

  return (
    <header className="topbar">
      <span className="topbar-title">Pumptrack Builder</span>
      <span className="topbar-name">{project.name}</span>
      <div className="topbar-actions">
        <button onClick={handleImport}>Import</button>
        <button className="primary" onClick={() => downloadProject(project)}>Export / Save</button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Add TopBar styles to `src/App.css`**

```css
.topbar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: #0a180a; border-bottom: 1px solid #2a3a2a; }
.topbar-title { font-weight: 700; color: #7ab450; }
.topbar-name { color: #888; flex: 1; font-size: 13px; }
.topbar-actions { display: flex; gap: 8px; }
.topbar-actions button { padding: 4px 12px; border: 1px solid #2a3a2a; background: #1a2a1a; color: #ccc; cursor: pointer; border-radius: 4px; font-size: 12px; }
.topbar-actions button.primary { background: #4a7a30; color: white; border-color: #4a7a30; }
```

- [ ] **Step 5: Create stub components so App.tsx compiles**

Create `src/components/Sidebar.tsx`:
```tsx
export default function Sidebar() { return <div className="sidebar-inner">Sidebar</div> }
```

Create `src/components/TrackEditor.tsx`:
```tsx
export default function TrackEditor() { return <svg className="track-canvas" width="100%" height="100%" /> }
```

Create `src/components/ThreeDView.tsx`:
```tsx
export default function ThreeDView() { return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>3D view coming soon</div> }
```

Create `src/components/RidabilityPanel.tsx`:
```tsx
export default function RidabilityPanel() { return <div className="panel">Ridability</div> }
```

Create `src/components/ConstructionPanel.tsx`:
```tsx
export default function ConstructionPanel() { return <div className="panel">Construction</div> }
```

- [ ] **Step 6: Update `src/main.tsx`** to mount App (Vite template does this already — verify it looks like this):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Start dev server and verify layout renders**

```bash
npm run dev
```
Open http://localhost:5173. You should see a dark three-column layout with the topbar.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add app shell, topbar, and stub components"
```

---

## Task 10: Sidebar — Settings Controls

**Files:**
- Replace: `src/components/Sidebar.tsx`
- Create: `src/components/BikeTypeSelector.tsx`, `src/components/DifficultySelector.tsx`, `src/components/TopologySelector.tsx`, `src/components/AdvancedParams.tsx`, `src/components/GenerateButton.tsx`
- Create: `src/components/LandEditor/LandEditor.tsx` (stub with tabs)

- [ ] **Step 1: Create `src/components/BikeTypeSelector.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'
import type { BikeType } from '../types'

const options: BikeType[] = ['mtb', 'bmx', 'mixed']

export default function BikeTypeSelector() {
  const { project, setSettings } = useProjectStore()
  return (
    <div className="control-group">
      <label className="control-label">Bike Type</label>
      <div className="toggle-row">
        {options.map(o => (
          <button
            key={o}
            className={project.settings.bikeType === o ? 'active' : ''}
            onClick={() => setSettings({ bikeType: o })}
          >
            {o.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/DifficultySelector.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'
import type { Difficulty } from '../types'

const options: Difficulty[] = ['beginner', 'intermediate', 'expert']

export default function DifficultySelector() {
  const { project, setSettings } = useProjectStore()
  return (
    <div className="control-group">
      <label className="control-label">Difficulty</label>
      <div className="toggle-row">
        {options.map(o => (
          <button
            key={o}
            className={project.settings.difficulty === o ? 'active' : ''}
            onClick={() => setSettings({ difficulty: o })}
          >
            {o.charAt(0).toUpperCase() + o.slice(1, 5)}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/TopologySelector.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'
import type { Topology } from '../types'

const options: { value: Topology; label: string }[] = [
  { value: 'loop', label: 'Loop' },
  { value: 'figure8', label: 'Fig-8' },
  { value: 'snake', label: 'Snake' },
  { value: 'hybrid', label: 'Hybrid' },
]

export default function TopologySelector() {
  const { topology, setTopology } = useProjectStore()
  return (
    <div className="control-group">
      <label className="control-label">Track Topology</label>
      <div className="toggle-row">
        {options.map(o => (
          <button
            key={o.value}
            className={topology === o.value ? 'active' : ''}
            onClick={() => setTopology(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/AdvancedParams.tsx`**

```tsx
import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { PRESETS } from '../types'

export default function AdvancedParams() {
  const [open, setOpen] = useState(false)
  const { project, setSettings } = useProjectStore()
  const s = project.settings
  const preset = PRESETS[s.difficulty]

  const numInput = (
    label: string,
    value: number | null,
    defaultVal: number,
    onChange: (v: number | null) => void,
  ) => (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <input
        type="number"
        step="0.01"
        className="param-input"
        value={value ?? ''}
        placeholder={String(defaultVal)}
        onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
      />
    </div>
  )

  return (
    <div className="control-group">
      <button className="advanced-toggle" onClick={() => setOpen(o => !o)}>
        Advanced {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="advanced-body">
          {numInput('Roller height (m)', s.rollerHeightM, preset.rollerHeightM, v => setSettings({ rollerHeightM: v }))}
          {numInput('Roller spacing (m)', s.rollerSpacingM, preset.rollerSpacingM, v => setSettings({ rollerSpacingM: v }))}
          {numInput('Berm radius (m)', s.bermRadiusM, preset.bermRadiusM, v => setSettings({ bermRadiusM: v }))}
          {numInput('Entry speed (m/s)', s.entrySpeedMs, preset.defaultEntrySpeedMs, v => setSettings({ entrySpeedMs: v ?? preset.defaultEntrySpeedMs }))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/GenerateButton.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'

export default function GenerateButton() {
  const { project, generate } = useProjectStore()
  const disabled = project.land.points.length < 3

  return (
    <button
      className="generate-btn"
      disabled={disabled}
      onClick={generate}
      title={disabled ? 'Define a land boundary first' : 'Generate track layout'}
    >
      ⚡ Generate Track
    </button>
  )
}
```

- [ ] **Step 6: Create `src/components/LandEditor/LandEditor.tsx` stub**

```tsx
import { useState } from 'react'
import DimensionsInput from './DimensionsInput'

type Tab = 'draw' | 'dimensions' | 'upload'

export default function LandEditor() {
  const [tab, setTab] = useState<Tab>('dimensions')
  return (
    <div className="control-group">
      <label className="control-label">Land Boundary</label>
      <div className="toggle-row">
        {(['draw', 'dimensions', 'upload'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="land-tab-body">
        {tab === 'dimensions' && <DimensionsInput />}
        {tab === 'draw' && <p className="coming-soon">Draw mode: coming in next task</p>}
        {tab === 'upload' && <p className="coming-soon">Upload mode: coming in next task</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/LandEditor/DimensionsInput.tsx`**

```tsx
import { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import type { LandBoundary, LandUnit } from '../../types'

function rectBoundary(w: number, h: number, unit: LandUnit): LandBoundary {
  return {
    unit,
    points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
  }
}

export default function DimensionsInput() {
  const { setLand } = useProjectStore()
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [unit, setUnit] = useState<LandUnit>('meters')

  const apply = () => {
    const w = parseFloat(width), h = parseFloat(height)
    if (!w || !h || w <= 0 || h <= 0) return
    setLand(rectBoundary(w, h, unit))
  }

  return (
    <div className="dimensions-form">
      <div className="param-row">
        <span className="param-label">Width</span>
        <input className="param-input" type="number" min="1" value={width} onChange={e => setWidth(e.target.value)} placeholder="e.g. 30" />
      </div>
      <div className="param-row">
        <span className="param-label">Length</span>
        <input className="param-input" type="number" min="1" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 20" />
      </div>
      <div className="param-row">
        <span className="param-label">Unit</span>
        <select className="param-input" value={unit} onChange={e => setUnit(e.target.value as LandUnit)}>
          <option value="meters">Meters</option>
          <option value="feet">Feet</option>
        </select>
      </div>
      <button className="apply-btn" onClick={apply}>Apply</button>
    </div>
  )
}
```

- [ ] **Step 8: Replace `src/components/Sidebar.tsx`**

```tsx
import LandEditor from './LandEditor/LandEditor'
import BikeTypeSelector from './BikeTypeSelector'
import DifficultySelector from './DifficultySelector'
import TopologySelector from './TopologySelector'
import AdvancedParams from './AdvancedParams'
import GenerateButton from './GenerateButton'
import './Sidebar.css'

export default function Sidebar() {
  return (
    <div className="sidebar-inner">
      <LandEditor />
      <BikeTypeSelector />
      <DifficultySelector />
      <TopologySelector />
      <AdvancedParams />
      <div className="sidebar-spacer" />
      <GenerateButton />
    </div>
  )
}
```

- [ ] **Step 9: Create `src/components/Sidebar.css`**

```css
.sidebar-inner { display: flex; flex-direction: column; gap: 0; padding: 0; height: 100%; }
.control-group { padding: 12px; border-bottom: 1px solid #2a3a2a; }
.control-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; display: block; margin-bottom: 6px; }
.toggle-row { display: flex; gap: 4px; }
.toggle-row button { flex: 1; padding: 4px 0; font-size: 11px; border: 1px solid #2a3a2a; background: #1a2a1a; color: #888; cursor: pointer; border-radius: 4px; }
.toggle-row button.active { background: #4a7a30; color: white; border-color: #4a7a30; }
.advanced-toggle { width: 100%; text-align: left; padding: 4px 0; font-size: 11px; background: none; border: none; color: #888; cursor: pointer; }
.advanced-body { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.param-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.param-label { font-size: 11px; color: #888; white-space: nowrap; }
.param-input { width: 80px; padding: 3px 6px; background: #0f1f0f; border: 1px solid #2a3a2a; color: #ccc; border-radius: 4px; font-size: 12px; }
.land-tab-body { margin-top: 8px; }
.dimensions-form { display: flex; flex-direction: column; gap: 6px; }
.apply-btn { margin-top: 4px; padding: 4px 10px; background: #2a3a2a; border: 1px solid #3a4a3a; color: #ccc; cursor: pointer; border-radius: 4px; font-size: 12px; align-self: flex-end; }
.coming-soon { font-size: 11px; color: #555; padding: 8px 0; }
.sidebar-spacer { flex: 1; }
.generate-btn { margin: 12px; padding: 10px; background: #4a7a30; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; }
.generate-btn:disabled { background: #2a3a2a; color: #555; cursor: not-allowed; }
```

- [ ] **Step 10: Verify in browser**

```bash
npm run dev
```
Sidebar should show all controls. Enter width=30, length=20, click Apply, then Generate Track. No errors in console.

- [ ] **Step 11: Commit**

```bash
git add src/components/
git commit -m "feat: add sidebar controls and land dimensions input"
```

---

## Task 11: 2D Track Editor

**Files:**
- Replace: `src/components/TrackEditor.tsx`

- [ ] **Step 1: Replace `src/components/TrackEditor.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { pointsToSVGPath, getBoundingBox } from '../engine/geometry'
import { convertPoints } from '../utils/units'
import type { TrackElement, Point } from '../types'

const CANVAS_PADDING = 40
const CANVAS_W = 800
const CANVAS_H = 600

export default function TrackEditor() {
  const { project } = useProjectStore()
  const { land, track } = project
  const landPts = useMemo(
    () => convertPoints(land.points, land.unit, 'meters'),
    [land],
  )

  const { scale, offsetX, offsetY } = useMemo(() => {
    if (landPts.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 }
    const bb = getBoundingBox(landPts)
    const scaleX = (CANVAS_W - CANVAS_PADDING * 2) / (bb.width || 1)
    const scaleY = (CANVAS_H - CANVAS_PADDING * 2) / (bb.height || 1)
    const scale = Math.min(scaleX, scaleY)
    const offsetX = CANVAS_PADDING - bb.minX * scale + ((CANVAS_W - CANVAS_PADDING * 2) - bb.width * scale) / 2
    const offsetY = CANVAS_PADDING - bb.minY * scale + ((CANVAS_H - CANVAS_PADDING * 2) - bb.height * scale) / 2
    return { scale, offsetX, offsetY }
  }, [landPts])

  const toSVG = (p: Point) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY })

  const landSVGPts = landPts.map(toSVG)
  const landPath = pointsToSVGPath(landSVGPts, true)

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width="100%"
      height="100%"
      style={{ display: 'block', flex: 1 }}
    >
      {/* Grid */}
      <defs>
        <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse" x={offsetX % scale} y={offsetY % scale}>
          <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#2a3a2a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Land boundary */}
      {landPts.length >= 3 && (
        <path d={landPath} fill="rgba(120,180,80,0.08)" stroke="#7ab450" strokeWidth="2" strokeDasharray="8,4" />
      )}

      {/* Centerline */}
      {track && (
        <polyline
          points={track.centerlinePath.map(p => { const s = toSVG(p); return `${s.x},${s.y}` }).join(' ')}
          fill="none"
          stroke="#f5a623"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />
      )}

      {/* Track elements */}
      {track?.elements.map(el => <ElementShape key={el.id} element={el} toSVG={toSVG} scale={scale} />)}

      {/* Empty state */}
      {landPts.length === 0 && (
        <text x={CANVAS_W / 2} y={CANVAS_H / 2} textAnchor="middle" fill="#555" fontSize="14">
          Define land boundary in the sidebar to get started
        </text>
      )}
    </svg>
  )
}

function ElementShape({ element, toSVG, scale }: { element: TrackElement; toSVG: (p: Point) => Point; scale: number }) {
  if (element.type === 'roller') {
    const s = toSVG(element.position)
    const w = element.widthM * scale
    return <rect x={s.x - w / 2} y={s.y - 3} width={w} height={6} rx="2" fill="#f5a623" opacity="0.9" />
  }
  if (element.type === 'berm') {
    const s = toSVG(element.position)
    const r = element.radiusM * scale
    return <circle cx={s.x} cy={s.y} r={Math.max(4, r * 0.3)} fill="none" stroke="#e74c3c" strokeWidth="6" opacity="0.6" />
  }
  if (element.type === 'straight') {
    const a = toSVG(element.start), b = toSVG(element.end)
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#888" strokeWidth="2" opacity="0.4" />
  }
  return null
}
```

- [ ] **Step 2: Verify in browser**

Generate a track (enter dimensions, click Generate). The 2D canvas should render the land boundary (dashed green) and the generated track (orange centerline, orange rollers, red berms).

- [ ] **Step 3: Commit**

```bash
git add src/components/TrackEditor.tsx
git commit -m "feat: add 2D SVG track editor"
```

---

## Task 12: Land Editor — Draw Mode

**Files:**
- Create: `src/components/LandEditor/DrawInput.tsx`
- Modify: `src/components/LandEditor/LandEditor.tsx`

- [ ] **Step 1: Create `src/components/LandEditor/DrawInput.tsx`**

```tsx
import { useState, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { distance } from '../../engine/geometry'
import type { Point } from '../../types'

const W = 200, H = 160, SNAP_DIST = 10

export default function DrawInput() {
  const { setLand } = useProjectStore()
  const [pts, setPts] = useState<Point[]>([])
  const [closed, setClosed] = useState(false)

  const addPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (closed) return
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const p: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (pts.length >= 3 && distance(p, pts[0]) < SNAP_DIST) {
      setClosed(true)
      setLand({ points: pts, unit: 'meters' })
      return
    }
    setPts(prev => [...prev, p])
  }, [pts, closed, setLand])

  const reset = () => { setPts([]); setClosed(false) }

  return (
    <div>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
        Click to add vertices. Click near start to close.
      </p>
      <svg
        width={W} height={H}
        style={{ background: '#0f1f0f', border: '1px solid #2a3a2a', borderRadius: 4, cursor: closed ? 'default' : 'crosshair', display: 'block' }}
        onClick={addPoint}
      >
        {pts.length > 1 && (
          <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#7ab450" strokeWidth="1.5" />
        )}
        {closed && pts.length > 2 && (
          <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(120,180,80,0.1)" stroke="#7ab450" strokeWidth="1.5" />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 5 : 3} fill={i === 0 ? '#7ab450' : '#ccc'} />
        ))}
        {closed && <text x={W / 2} y={H - 6} textAnchor="middle" fill="#7ab450" fontSize="10">Boundary set ✓</text>}
      </svg>
      <button className="apply-btn" onClick={reset} style={{ marginTop: 6 }}>Reset</button>
    </div>
  )
}
```

- [ ] **Step 2: Wire Draw tab into LandEditor.tsx**

Replace the `{tab === 'draw' && <p ...>}` line:
```tsx
import DrawInput from './DrawInput'
// ...
{tab === 'draw' && <DrawInput />}
```

- [ ] **Step 3: Verify in browser**

Switch to Draw tab, click to place 4+ vertices, click near first point to close. The land boundary should appear in the main canvas.

- [ ] **Step 4: Commit**

```bash
git add src/components/LandEditor/
git commit -m "feat: add draw mode for land boundary input"
```

---

## Task 13: Land Editor — Upload Mode

**Files:**
- Create: `src/components/LandEditor/UploadInput.tsx`
- Modify: `src/components/LandEditor/LandEditor.tsx`

- [ ] **Step 1: Create `src/components/LandEditor/UploadInput.tsx`**

```tsx
import { useState, useRef, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { distance } from '../../engine/geometry'
import type { Point } from '../../types'

const W = 200, H = 160, SNAP_DIST = 10

export default function UploadInput() {
  const { setLand } = useProjectStore()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [pts, setPts] = useState<Point[]>([])
  const [closed, setClosed] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    setPts([])
    setClosed(false)
  }

  const addPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (closed) return
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const p: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (pts.length >= 3 && distance(p, pts[0]) < SNAP_DIST) {
      setClosed(true)
      setLand({ points: pts, unit: 'meters' })
      return
    }
    setPts(prev => [...prev, p])
  }, [pts, closed, setLand])

  const reset = () => { setPts([]); setClosed(false) }

  return (
    <div>
      <input type="file" accept="image/*,.svg" onChange={handleFile} style={{ fontSize: 11, marginBottom: 4 }} />
      {imgUrl ? (
        <>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Trace the boundary over the image.</p>
          <svg
            width={W} height={H}
            style={{ border: '1px solid #2a3a2a', borderRadius: 4, cursor: closed ? 'default' : 'crosshair', display: 'block' }}
            onClick={addPoint}
          >
            <image href={imgUrl} width={W} height={H} preserveAspectRatio="xMidYMid meet" />
            {pts.length > 1 && <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#7ab450" strokeWidth="1.5" />}
            {closed && <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(120,180,80,0.15)" stroke="#7ab450" strokeWidth="1.5" />}
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 5 : 3} fill={i === 0 ? '#7ab450' : '#f5a623'} />)}
            {closed && <text x={W / 2} y={H - 6} textAnchor="middle" fill="#7ab450" fontSize="10">Boundary set ✓</text>}
          </svg>
          <button className="apply-btn" onClick={reset} style={{ marginTop: 6 }}>Reset trace</button>
        </>
      ) : (
        <p style={{ fontSize: 11, color: '#555' }}>Upload a site plan image to trace over.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire Upload tab into LandEditor.tsx**

```tsx
import UploadInput from './UploadInput'
// ...
{tab === 'upload' && <UploadInput />}
```

- [ ] **Step 3: Verify in browser**

Upload any image, trace a boundary over it, close the polygon. Main canvas should update.

- [ ] **Step 4: Commit**

```bash
git add src/components/LandEditor/
git commit -m "feat: add image upload + trace mode for land boundary"
```

---

## Task 14: Ridability Panel

**Files:**
- Replace: `src/components/RidabilityPanel.tsx`

- [ ] **Step 1: Replace `src/components/RidabilityPanel.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'
import './Panel.css'

export default function RidabilityPanel() {
  const track = useProjectStore(s => s.project.track)

  if (!track) {
    return (
      <div className="panel">
        <div className="panel-label">Ridability</div>
        <p className="panel-empty">Generate a track to see the ridability score.</p>
      </div>
    )
  }

  const { ridability } = track
  const statusColor = ridability.passed ? '#2ecc71' : '#e74c3c'

  return (
    <div className="panel">
      <div className="panel-label">Ridability Score</div>
      <div className="ridability-summary">
        <span className="ridability-icon" style={{ color: statusColor }}>
          {ridability.passed ? '✓' : '✗'}
        </span>
        <div>
          <div style={{ fontWeight: 600, color: statusColor, fontSize: 13 }}>
            {ridability.passed ? 'Rideable' : 'Not Rideable'}
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>
            Min speed: {ridability.minSpeedMs.toFixed(1)} m/s
          </div>
        </div>
      </div>
      <div className="segment-list">
        {ridability.segments.map(seg => (
          <div key={seg.elementId} className="segment-row">
            <span className="segment-id">{seg.elementId}</span>
            <span className={`segment-status ${seg.status}`}>
              {seg.status === 'ok' ? '✓' : seg.status === 'warning' ? '⚠' : '✗'}{' '}
              {seg.exitSpeedMs.toFixed(1)} m/s
            </span>
          </div>
        ))}
      </div>
      {ridability.warnings.length > 0 && (
        <div className="warning-list">
          {ridability.warnings.map((w, i) => <div key={i} className="warning-item">{w}</div>)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/Panel.css`**

```css
.panel { padding: 12px; border-bottom: 1px solid #2a3a2a; }
.panel-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
.panel-empty { font-size: 11px; color: #555; }
.ridability-summary { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.ridability-icon { font-size: 28px; font-weight: 700; }
.segment-list { display: flex; flex-direction: column; gap: 3px; }
.segment-row { display: flex; justify-content: space-between; font-size: 11px; }
.segment-id { color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
.segment-status.ok { color: #2ecc71; }
.segment-status.warning { color: #f39c12; }
.segment-status.fail { color: #e74c3c; }
.warning-list { margin-top: 8px; }
.warning-item { font-size: 11px; color: #e74c3c; padding: 2px 0; }
```

- [ ] **Step 3: Update `src/components/ConstructionPanel.tsx`**

```tsx
import { useProjectStore } from '../store/useProjectStore'
import { polygonPerimeter } from '../engine/geometry'
import { convertPoints } from '../utils/units'

export default function ConstructionPanel() {
  const { project } = useProjectStore()
  const { track, land } = project

  if (!track) return <div className="panel"><div className="panel-label">Construction Data</div><p className="panel-empty">No track generated yet.</p></div>

  const rollers = track.elements.filter(e => e.type === 'roller')
  const berms   = track.elements.filter(e => e.type === 'berm')
  const trackLength = polygonPerimeter(track.centerlinePath)
  const rollerVol = rollers.length * 0.30 * 1.2 * 2.5  // rough estimate: h × w × roller width

  const row = (label: string, value: string) => (
    <div className="segment-row" style={{ marginBottom: 4 }}>
      <span className="segment-id">{label}</span>
      <span style={{ fontSize: 11, color: '#ccc' }}>{value}</span>
    </div>
  )

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-label">Construction Data</div>
      {row('Track length', `${trackLength.toFixed(1)} m`)}
      {row('Rollers', `${rollers.length} pcs`)}
      {row('Berms', `${berms.length} pcs`)}
      {row('Est. fill vol.', `~${rollerVol.toFixed(0)} m³`)}
      {row('Track width', `${project.settings.bikeType === 'bmx' ? '2.0' : '2.5'} m`)}
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Generate a track. Right panel should show ridability score and construction data.

- [ ] **Step 5: Commit**

```bash
git add src/components/RidabilityPanel.tsx src/components/ConstructionPanel.tsx src/components/Panel.css
git commit -m "feat: add ridability panel and construction data panel"
```

---

## Task 15: 3D Visualization

**Files:**
- Replace: `src/components/ThreeDView.tsx`

- [ ] **Step 1: Replace `src/components/ThreeDView.tsx`**

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../store/useProjectStore'
import type { Point } from '../types'

function TrackMesh({ path }: { path: Point[] }) {
  const geometry = useMemo(() => {
    if (path.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(
      path.map(p => new THREE.Vector3(p.x, 0, p.y)),
      true,
    )
    return new THREE.TubeGeometry(curve, path.length * 4, 0.05, 8, true)
  }, [path])

  if (!geometry) return null
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#f5a623" />
    </mesh>
  )
}

function RollerMesh({ position, height, width }: { position: Point; height: number; width: number }) {
  return (
    <mesh position={[position.x, height / 2, position.y]}>
      <cylinderGeometry args={[width / 2, width / 2, height, 12]} />
      <meshStandardMaterial color="#f5a623" />
    </mesh>
  )
}

function BermMesh({ position, radius, banking }: { position: Point; radius: number; banking: number }) {
  return (
    <mesh position={[position.x, 0.1, position.y]} rotation={[0, 0, (banking * Math.PI) / 180]}>
      <torusGeometry args={[radius, 0.15, 8, 32, Math.PI]} />
      <meshStandardMaterial color="#e74c3c" opacity={0.7} transparent />
    </mesh>
  )
}

export default function ThreeDView() {
  const track = useProjectStore(s => s.project.track)

  return (
    <Canvas
      style={{ flex: 1, display: 'block' }}
      camera={{ position: [20, 20, 20], fov: 50 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Grid args={[100, 100]} cellColor="#2a3a2a" sectionColor="#3a4a3a" />
      <OrbitControls />

      {track && (
        <>
          <TrackMesh path={track.centerlinePath} />
          {track.elements.map(el => {
            if (el.type === 'roller')
              return <RollerMesh key={el.id} position={el.position} height={el.heightM} width={el.widthM} />
            if (el.type === 'berm')
              return <BermMesh key={el.id} position={el.position} radius={el.radiusM} banking={el.bankingDeg} />
            return null
          })}
        </>
      )}
    </Canvas>
  )
}
```

- [ ] **Step 2: Verify in browser**

Generate a track, switch to 3D view. You should see an orange tube for the centerline, rollers as cylinders, berms as red torus arcs. Orbit with mouse.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThreeDView.tsx
git commit -m "feat: add R3F 3D visualization with track mesh"
```

---

## Task 16: Final Polish + Full Test Run

**Files:**
- Modify: `src/test/sanity.test.ts` (delete it)
- Run full test suite

- [ ] **Step 1: Delete sanity test**

```bash
rm src/test/sanity.test.ts
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```
Expected: all tests pass (geometry, physics, generator, units, io, store)

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Build**

```bash
npm run build
```
Expected: build succeeds with no errors

- [ ] **Step 5: Final browser check**

```bash
npm run dev
```
Walk through the full flow:
1. Enter land dimensions (30 × 20 m), click Apply
2. Click Generate Track
3. Verify ridability panel shows score
4. Verify construction data shows track length, roller/berm counts
5. Toggle to 3D — orbit around the track
6. Click Export/Save — a `.ptb` file downloads
7. Click Import — load the saved file back — track should reappear

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 pumptrack builder"
```

---

## Preset Reference

| Parameter | Beginner | Intermediate | Expert |
|---|---|---|---|
| Roller height | 0.20 m | 0.30 m | 0.40 m |
| Roller spacing | 3.50 m | 2.50 m | 2.00 m |
| Berm radius | 5.00 m | 4.00 m | 3.00 m |
| Pump efficiency | 60% | 72% | 85% |
| Default entry speed | 3.0 m/s | 4.0 m/s | 5.5 m/s |

## Speed Thresholds

| Speed | Status |
|---|---|
| ≥ 2.5 m/s | ok |
| 1.5 – 2.5 m/s | warning |
| < 1.5 m/s | fail |
