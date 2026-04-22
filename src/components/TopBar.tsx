import { useProjectStore } from '../store/useProjectStore'
import { downloadProject, uploadProject } from '../utils/io'

export default function TopBar() {
  const { project, loadProject } = useProjectStore()

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ptb'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const loaded = await uploadProject(file)
        loadProject(loaded)
      } catch {
        alert('Could not load file. Make sure it is a valid .ptb file.')
      }
    }
    input.click()
  }

  return (
    <header className="topbar">
      <span className="topbar-title">Pumptrack Builder</span>
      <span className="topbar-name">{project.name}</span>
      <div className="topbar-actions">
        <button onClick={handleImport}>Import</button>
        <button className="primary" onClick={() => downloadProject(project)}>Export / Save</button>
      </div>
    </header>
  )
}
