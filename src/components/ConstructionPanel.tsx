import { useProjectStore } from '../store/useProjectStore'
import { polygonPerimeter } from '../engine/geometry'
import './Panel.css'

export default function ConstructionPanel() {
  const { project } = useProjectStore()
  const { track } = project

  if (!track) {
    return (
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-label">Construction Data</div>
        <p className="panel-empty">No track generated yet.</p>
      </div>
    )
  }

  const rollers = track.elements.filter(e => e.type === 'roller')
  const berms   = track.elements.filter(e => e.type === 'berm')
  const trackLength = polygonPerimeter(track.centerlinePath)
  const rollerVol = rollers.length * 0.30 * 1.2 * 2.5

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
