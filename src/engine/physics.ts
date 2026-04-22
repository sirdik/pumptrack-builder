import type { TrackLayout, TrackSettings, RidabilityReport, SegmentReport } from '../types'
import { PRESETS } from '../types'
import { distance } from './geometry'

const G = 9.81
const MU = 0.012
const MIN_SPEED = 1.5
const WARN_SPEED = 2.5

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
