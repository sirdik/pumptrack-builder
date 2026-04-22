# Pumptrack Builder — Design Spec
**Date:** 2026-04-22
**Status:** Approved

---

## Overview

A web application that generates rideable pumptrack layouts from a user-defined land boundary. The user provides the shape and dimensions of available land; the app calculates a track layout — path topology, roller placement, berm geometry — and validates that a rider can complete the loop without pedaling using a basic energy model.

Phase 2 (out of scope for this spec) adds height map input so the generator can incorporate the natural slope of the land.

---

## Target Users

All of the following, with the UI accessible to beginners but powerful enough for professionals:
- Track builders and club organizers planning a real build
- Hobbyists and homeowners designing a backyard pumptrack
- Professional designers and landscape architects

---

## Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 18 + TypeScript |
| 2D canvas | SVG (native React) |
| 3D rendering | React Three Fiber + Drei |
| State | Zustand |
| Backend | None (Phase 1) |
| Persistence | JSON export / import (`.ptb` file) |

---

## Folder Structure

```
src/
  components/
    LandEditor/         SVG canvas — draw/edit land boundary polygon
    TrackEditor/        SVG overlay — generated track elements, draggable
    ThreeDView/         R3F scene — 3D visualization
    Sidebar/            Land input tabs, bike type, difficulty, advanced params
    RidabilityPanel/    Score, per-segment speed table, warnings
    ConstructionPanel/  Element dimensions, fill volume, PDF export button
  engine/
    generator.ts        Path topology search + element placement
    physics.ts          Energy model — speed at every segment
    geometry.ts         Bezier curves, polygon ops, berm/roller profiles
  store/
    useProjectStore.ts  Zustand store — single source of truth
  types/
    index.ts            All shared TypeScript types
  utils/
    io.ts               JSON save / load (.ptb)
    units.ts            Metric ↔ imperial conversion
```

---

## Data Model

```typescript
interface Project {
  version: string
  name: string
  createdAt: string        // ISO 8601
  settings: TrackSettings
  land: LandBoundary
  track: TrackLayout | null
}

interface LandBoundary {
  points: Point[]          // polygon vertices, real-world units
  unit: 'meters' | 'feet'
}

interface TrackSettings {
  bikeType: 'mtb' | 'bmx' | 'mixed'
  difficulty: 'beginner' | 'intermediate' | 'expert'
  riderWeightKg: number    // reserved — used in Phase 2 for cut/fill load calculations; not used in Phase 1 energy model (mass cancels)
  entrySpeedMs: number
  // null = use preset default
  rollerHeightM: number | null
  rollerSpacingM: number | null
  bermRadiusM: number | null
  bermBankingDeg: number | null   // null = compute from speed
  transitionLengthM: number | null
}

interface TrackLayout {
  topology: 'loop' | 'figure8' | 'snake' | 'hybrid'
  elements: TrackElement[]
  centerlinePath: Point[]         // dense polyline along track centerline
  ridability: RidabilityReport
}

type TrackElement =
  | { type: 'roller';   id: string; position: Point; widthM: number; heightM: number }
  | { type: 'berm';     id: string; position: Point; radiusM: number; bankingDeg: number; sweepDeg: number; entrySpeedMs: number }
  | { type: 'straight'; id: string; start: Point; end: Point; widthM: number }

interface RidabilityReport {
  passed: boolean
  minSpeedMs: number
  segments: SegmentReport[]
  warnings: string[]
}

interface SegmentReport {
  elementId: string
  entrySpeedMs: number
  exitSpeedMs: number
  status: 'ok' | 'warning' | 'fail'
}

type Point = { x: number; y: number }
```

All internal calculations use metric (metres). The UI converts to feet when the user selects imperial; the save file always stores metres.

---

## Land Input

Three input methods, selectable via tabs in the sidebar:

- **Draw** — user clicks to place polygon vertices on an SVG canvas. Double-click or click the first point to close the shape.
- **Dimensions** — user enters width × length for a rectangular plot.
- **Upload** — user uploads a site plan image (PNG/JPG/SVG) which is rendered as a background layer; user traces the boundary over it.

---

## Track Generation Algorithm (`engine/generator.ts`)

### Step 1 — Path topology search

The generator evaluates four candidate topologies and scores each by total rideable track length that fits within the boundary (with a clearance margin of half the track width):

| Topology | Description |
|---|---|
| `loop` | Single closed loop following the inner perimeter |
| `figure8` | Loop with one crossing in the interior |
| `snake` | Switchback pattern weaving through the interior |
| `hybrid` | Outer loop with one interior branch |

The highest-scoring topology is used by default. The user can manually switch topology after generation.

### Step 2 — Berm placement

At every path corner with an angular change > 20°, insert a berm. Berm geometry is derived from the **actual rider entry speed** at that point (from the energy model), not from a fixed preset:

```
banking_angle = atan(v_entry² / (radius × g))
```

Radius is taken from `bermRadiusM` if the user has overridden it; otherwise it comes from the preset difficulty table (beginner: 5 m, intermediate: 4 m, expert: 3 m). Banking angle is always computed from the actual entry speed using the active radius — even when radius is overridden.

This ensures the berm perfectly balances centrifugal force at the expected speed — no lateral scrubbing. If the user changes anything upstream (roller spacing, entry speed), affected berms recompute automatically.

Berms with a compression exit (low point at the exit of the arc) are modelled as pump features and contribute a small speed gain in the energy model.

### Step 3 — Roller placement

Remaining straight and gently curved sections are divided into roller groups. Roller spacing is set to produce the target pump frequency for the active preset:

- Beginner: wider spacing, lower rollers (more forgiving)
- Expert: tighter spacing, taller rollers (higher speed, more precision required)

### Step 4 — Centerline smoothing

The full path is smoothed into a continuous Bezier curve used by both the 3D view and the energy model.

### Step 5 — Validate and adjust

Run the energy model. If any segment fails, attempt to add a roller or tighten spacing in that segment. Repeat up to 10 iterations. If still failing, flag with a warning rather than blocking the user.

---

## Physics / Energy Model (`engine/physics.ts`)

Walks the centerline from `entrySpeedMs` and computes exit speed for each segment:

```
for each segment:

  roller:
    speed_gain = sqrt(2 × g × rollerHeight × pumpEfficiency)
    exit_speed = sqrt(entry² + speed_gain²) − friction(distance)

  berm:
    validate: bankingAngle ≈ atan(v²/r/g), warn if deviation > 5°
    if compression exit: apply small pump gain (0.3 × roller gain)
    exit_speed = entry_speed − friction(arcLength)

  straight:
    exit_speed = entry_speed − friction(distance)

  thresholds:
    < 1.5 m/s → status: 'fail'
    < 2.5 m/s → status: 'warning'
    ≥ 2.5 m/s → status: 'ok'
```

`pumpEfficiency` constants by difficulty:
- Beginner: 0.60
- Intermediate: 0.72
- Expert: 0.85

Rolling resistance coefficient: 0.012 (standard MTB tire on packed dirt).

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  PumpTrack Builder          project.ptb        [Import] [Export] │
├──────────────┬──────────────────────────────┬───────────────────┤
│ Land Input   │  [loop][fig8][snake][hybrid] │ Ridability Score   │
│ [Draw][Dim.] │   SVG 2D Canvas              │  ✓ Rideable        │
│ [Upload]     │   (land boundary + track)    │  Min: 3.2 m/s      │
│              │                          [2D/3D] per-segment list │
│ Bike Type    │                              ├───────────────────┤
│ Difficulty   │                              │ Construction Data  │
│              │                              │  Track length      │
│ Advanced ▾   │                              │  Rollers / Berms   │
│  roller h.   │                              │  Est. fill vol.    │
│  spacing     │                              │  Track width       │
│  berm r.     │                              │                    │
│              │                              │ [Export PDF]       │
│ [Generate]   │                              │                    │
└──────────────┴──────────────────────────────┴───────────────────┘
```

- **Topology selector** (top of canvas) — four buttons: loop / fig-8 / snake / hybrid. Switches topology and re-runs the generator.
- **2D/3D toggle** (top-right of canvas) switches between SVG plan view and R3F 3D scene.
- In 2D view, track elements are draggable; the energy model re-runs on every drag end.
- In 3D view, the scene is read-only (orbit controls only).

---

## Save / Load

- File extension: `.ptb` (JSON)
- Export: serializes the full `Project` object
- Import: parses and validates the file, migrates old versions via a version field
- No auto-save; user triggers export explicitly

---

## Phase 2 Hook (Height Map)

`generator.ts` accepts an optional `heightMap: HeightField | null` parameter. When `null` (Phase 1), terrain is assumed flat. When provided (Phase 2), the generator adjusts element heights to match natural ground elevation, and the energy model accounts for gravitational gain/loss along the slope. The interface is defined now to avoid a rewrite in Phase 2.

```typescript
interface HeightField {
  width: number         // grid columns
  height: number        // grid rows
  scaleM: number        // metres per cell
  data: Float32Array    // elevation in metres, row-major
}
```

---

## Out of Scope (Phase 1)

- User accounts / cloud save
- Multi-user collaboration
- Real GPS/map integration
- Automatic PDF layout (export button is a placeholder)
- Height map / terrain input (Phase 2)
