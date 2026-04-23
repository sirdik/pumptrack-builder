import { useMemo } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { pointsToSVGPath, getBoundingBox } from '../engine/geometry'
import { convertPoints } from '../utils/units'
import { TRACK_WIDTHS } from '../types'
import type { TrackElement, Point } from '../types'

const CANVAS_PADDING = 40
const CANVAS_W = 800
const CANVAS_H = 600

export default function TrackEditor() {
  const { project } = useProjectStore()
  const { land, track, settings } = project
  const landPts = useMemo(
    () => convertPoints(land.points, land.unit, 'meters'),
    [land],
  )

  const { scale, offsetX, offsetY } = useMemo(() => {
    if (landPts.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 }
    const bb = getBoundingBox(landPts)
    const scaleX = (CANVAS_W - CANVAS_PADDING * 2) / (bb.width || 1)
    const scaleY = (CANVAS_H - CANVAS_PADDING * 2) / (bb.height || 1)
    const s = Math.min(scaleX, scaleY)
    const ox = CANVAS_PADDING - bb.minX * s + ((CANVAS_W - CANVAS_PADDING * 2) - bb.width * s) / 2
    const oy = CANVAS_PADDING - bb.minY * s + ((CANVAS_H - CANVAS_PADDING * 2) - bb.height * s) / 2
    return { scale: s, offsetX: ox, offsetY: oy }
  }, [landPts])

  const toSVG = (p: Point) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY })
  const trackWidthPx = TRACK_WIDTHS[settings.bikeType] * scale

  const landPath = pointsToSVGPath(landPts.map(toSVG), true)
  const centerPts = track
    ? track.centerlinePath.map(p => { const s = toSVG(p); return `${s.x},${s.y}` }).join(' ')
    : ''

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      width="100%"
      height="100%"
      style={{ display: 'block', flex: 1 }}
    >
      <defs>
        <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse"
          x={offsetX % scale} y={offsetY % scale}>
          <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#2a3a2a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {landPts.length >= 3 && (
        <path d={landPath} fill="rgba(120,180,80,0.06)" stroke="#5a8a40" strokeWidth="1.5" strokeDasharray="8,4" />
      )}

      {track && (
        <>
          {/* Track outer edge — dark border */}
          <polyline points={centerPts} fill="none"
            stroke="#7a5c28" strokeWidth={trackWidthPx + 4}
            strokeLinecap="round" strokeLinejoin="round" />
          {/* Track surface — dirt fill */}
          <polyline points={centerPts} fill="none"
            stroke="#c4943a" strokeWidth={trackWidthPx}
            strokeLinecap="round" strokeLinejoin="round" />
          {/* Track riding line — lighter center stripe */}
          <polyline points={centerPts} fill="none"
            stroke="#ddb060" strokeWidth={trackWidthPx * 0.45}
            strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />

          {/* Elements on top */}
          {track.elements.map(el => (
            <ElementShape key={el.id} element={el} toSVG={toSVG} scale={scale} trackWidthPx={trackWidthPx} />
          ))}
        </>
      )}

      {landPts.length === 0 && (
        <text x={CANVAS_W / 2} y={CANVAS_H / 2} textAnchor="middle" fill="#555" fontSize="14">
          Define land boundary in the sidebar to get started
        </text>
      )}
    </svg>
  )
}

function ElementShape({
  element, toSVG, scale, trackWidthPx,
}: { element: TrackElement; toSVG: (p: Point) => Point; scale: number; trackWidthPx: number }) {
  if (element.type === 'roller') {
    const s = toSVG(element.position)
    const hw = trackWidthPx / 2              // half track width — tip of bowtie
    const hd = Math.max(4, 0.35 * scale)    // half roller depth along track
    const angle = element.directionRad
    const perp = angle + Math.PI / 2
    const tx = Math.cos(angle), ty = Math.sin(angle)
    const px = Math.cos(perp), py = Math.sin(perp)
    // Bowtie: two triangles meeting at center, tips at track edges
    const pts = [
      `${s.x + px * hw},${s.y + py * hw}`,   // left tip
      `${s.x + tx * hd},${s.y + ty * hd}`,   // fwd notch
      `${s.x - px * hw},${s.y - py * hw}`,   // right tip
      `${s.x - tx * hd},${s.y - ty * hd}`,   // back notch
    ].join(' ')
    return <polygon points={pts} fill="#2d1a06" opacity="0.85" />
  }

  // Berms are shown naturally by the curved wide track band — no extra overlay needed
  return null
}
