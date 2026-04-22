import { useMemo } from 'react'
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
      <defs>
        <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse" x={offsetX % scale} y={offsetY % scale}>
          <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#2a3a2a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {landPts.length >= 3 && (
        <path d={landPath} fill="rgba(120,180,80,0.08)" stroke="#7ab450" strokeWidth="2" strokeDasharray="8,4" />
      )}

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

      {track?.elements.map(el => <ElementShape key={el.id} element={el} toSVG={toSVG} scale={scale} />)}

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
