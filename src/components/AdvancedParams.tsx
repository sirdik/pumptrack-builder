import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { PRESETS } from '../types'

export default function AdvancedParams() {
  const [open, setOpen] = useState(false)
  const { project, setSettings } = useProjectStore()
  const s = project.settings
  const preset = PRESETS[s.difficulty]

  const numInput = (
    label: string,
    value: number | null,
    defaultVal: number,
    onChange: (v: number | null) => void,
  ) => (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <input
        type="number"
        step="0.01"
        className="param-input"
        value={value ?? ''}
        placeholder={String(defaultVal)}
        onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
      />
    </div>
  )

  return (
    <div className="control-group">
      <button className="advanced-toggle" onClick={() => setOpen(o => !o)}>
        Advanced {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="advanced-body">
          {numInput('Roller height (m)', s.rollerHeightM, preset.rollerHeightM, v => setSettings({ rollerHeightM: v }))}
          {numInput('Roller spacing (m)', s.rollerSpacingM, preset.rollerSpacingM, v => setSettings({ rollerSpacingM: v }))}
          {numInput('Berm radius (m)', s.bermRadiusM, preset.bermRadiusM, v => setSettings({ bermRadiusM: v }))}
          {numInput('Entry speed (m/s)', s.entrySpeedMs, preset.defaultEntrySpeedMs, v => setSettings({ entrySpeedMs: v ?? preset.defaultEntrySpeedMs }))}
        </div>
      )}
    </div>
  )
}
