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
        {closed && <text x={W / 2} y={H - 6} textAnchor="middle" fill="#7ab450" fontSize="10">Boundary set</text>}
      </svg>
      <button className="apply-btn" onClick={reset} style={{ marginTop: 6 }}>Reset</button>
    </div>
  )
}
