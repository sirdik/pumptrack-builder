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
