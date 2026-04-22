import { useState } from 'react'
import DimensionsInput from './DimensionsInput'
import DrawInput from './DrawInput'
import UploadInput from './UploadInput'

type Tab = 'draw' | 'dimensions' | 'upload'

export default function LandEditor() {
  const [tab, setTab] = useState<Tab>('dimensions')
  return (
    <div className="control-group">
      <label className="control-label">Land Boundary</label>
      <div className="toggle-row">
        {(['draw', 'dimensions', 'upload'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="land-tab-body">
        {tab === 'dimensions' && <DimensionsInput />}
        {tab === 'draw' && <DrawInput />}
        {tab === 'upload' && <UploadInput />}
      </div>
    </div>
  )
}
