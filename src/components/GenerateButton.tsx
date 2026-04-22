import { useProjectStore } from '../store/useProjectStore'

export default function GenerateButton() {
  const { project, generate } = useProjectStore()
  const disabled = project.land.points.length < 3

  return (
    <button
      className="generate-btn"
      disabled={disabled}
      onClick={generate}
      title={disabled ? 'Define a land boundary first' : 'Generate track layout'}
    >
      Generate Track
    </button>
  )
}
