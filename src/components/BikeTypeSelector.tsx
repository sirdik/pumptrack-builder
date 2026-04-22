import { useProjectStore } from '../store/useProjectStore'
import type { BikeType } from '../types'

const options: BikeType[] = ['mtb', 'bmx', 'mixed']

export default function BikeTypeSelector() {
  const { project, setSettings } = useProjectStore()
  return (
    <div className="control-group">
      <label className="control-label">Bike Type</label>
      <div className="toggle-row">
        {options.map(o => (
          <button
            key={o}
            className={project.settings.bikeType === o ? 'active' : ''}
            onClick={() => setSettings({ bikeType: o })}
          >
            {o.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
