import { act, renderHook } from '@testing-library/react'
import { useProjectStore } from '../../store/useProjectStore'
import type { LandBoundary } from '../../types'

const land: LandBoundary = {
  unit: 'meters',
  points: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }],
}

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('starts with null track', () => {
    const { result } = renderHook(() => useProjectStore())
    expect(result.current.project.track).toBeNull()
  })

  it('setLand updates the land boundary', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => result.current.setLand(land))
    expect(result.current.project.land.points).toHaveLength(4)
  })

  it('setTopology updates the topology', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => result.current.setTopology('snake'))
    expect(result.current.topology).toBe('snake')
  })

  it('generate populates project.track', () => {
    const { result } = renderHook(() => useProjectStore())
    act(() => {
      result.current.setLand(land)
      result.current.generate()
    })
    expect(result.current.project.track).not.toBeNull()
  })
})
