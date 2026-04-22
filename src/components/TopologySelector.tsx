import { useProjectStore } from '../store/useProjectStore'
import type { Topology } from '../types'

const options: { value: Topology; label: string }[] = [
  { value: 'loop', label: 'Loop' },
  { value: 'figure8', label: 'Fig-8' },
  { value: 'snake', label: 'Snake' },
  { value: 'hybrid', label: 'Hybrid' },
]

export default function TopologySelector() {
  const { topology, setTopology } = useProjectStore()
  return (
    <div className="control-group">
      <label className="control-label">Track Topology</label>
      <div className="toggle-row">
        {options.map(o => (
          <button
            key={o.value}
            className={topology === o.value ? 'active' : ''}
            onClick={() => setTopology(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
