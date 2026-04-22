import { useState, useCallback } from 'react'
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
            {closed && <text x={W / 2} y={H - 6} textAnchor="middle" fill="#7ab450" fontSize="10">Boundary set</text>}
          </svg>
          <button className="apply-btn" onClick={reset} style={{ marginTop: 6 }}>Reset trace</button>
        </>
      ) : (
        <p style={{ fontSize: 11, color: '#555' }}>Upload a site plan image to trace over.</p>
      )}
    </div>
  )
}
