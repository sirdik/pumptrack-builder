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
