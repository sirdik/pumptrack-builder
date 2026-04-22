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
