import { useProjectStore } from '../store/useProjectStore'
import type { Difficulty } from '../types'

const options: Difficulty[] = ['beginner', 'intermediate', 'expert']

export default function DifficultySelector() {
  const { project, setSettings } = useProjectStore()
  return (
    <div className="control-group">
      <label className="control-label">Difficulty</label>
      <div className="toggle-row">
        {options.map(o => (
          <button
            key={o}
            className={project.settings.difficulty === o ? 'active' : ''}
            onClick={() => setSettings({ difficulty: o })}
          >
            {o.charAt(0).toUpperCase() + o.slice(1, 5)}
          </button>
        ))}
      </div>
    </div>
  )
}
