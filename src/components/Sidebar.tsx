import LandEditor from './LandEditor/LandEditor'
import BikeTypeSelector from './BikeTypeSelector'
import DifficultySelector from './DifficultySelector'
import TopologySelector from './TopologySelector'
import AdvancedParams from './AdvancedParams'
import GenerateButton from './GenerateButton'
import './Sidebar.css'

export default function Sidebar() {
  return (
    <div className="sidebar-inner">
      <LandEditor />
      <BikeTypeSelector />
      <DifficultySelector />
      <TopologySelector />
      <AdvancedParams />
      <div className="sidebar-spacer" />
      <GenerateButton />
    </div>
  )
}
