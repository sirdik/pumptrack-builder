import { useState } from 'react'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import TrackEditor from './components/TrackEditor'
import ThreeDView from './components/ThreeDView'
import RidabilityPanel from './components/RidabilityPanel'
import ConstructionPanel from './components/ConstructionPanel'
import './App.css'

export default function App() {
  const [view, setView] = useState<'2d' | '3d'>('2d')

  return (
    <div className="app">
      <TopBar />
      <div className="app-body">
        <aside className="sidebar-col">
          <Sidebar />
        </aside>
        <main className="canvas-col">
          <div className="view-toggle">
            <button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>2D</button>
            <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>3D</button>
          </div>
          {view === '2d' ? <TrackEditor /> : <ThreeDView />}
        </main>
        <aside className="right-col">
          <RidabilityPanel />
          <ConstructionPanel />
        </aside>
      </div>
    </div>
  )
}
