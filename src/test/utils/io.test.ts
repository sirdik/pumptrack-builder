import { serialiseProject, deserialiseProject } from '../../utils/io'
import type { Project } from '../../types'
import { DEFAULT_SETTINGS } from '../../types'

const project: Project = {
  version: '1',
  name: 'Test',
  createdAt: '2026-04-22T00:00:00.000Z',
  settings: { ...DEFAULT_SETTINGS },
  land: { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], unit: 'meters' },
  track: null,
}

describe('io', () => {
  it('round-trips a project through serialise/deserialise', () => {
    const json = serialiseProject(project)
    const result = deserialiseProject(json)
    expect(result.name).toBe('Test')
    expect(result.land.points).toHaveLength(3)
    expect(result.version).toBe('1')
  })

  it('throws on invalid JSON', () => {
    expect(() => deserialiseProject('not json')).toThrow()
  })

  it('throws when version field is missing', () => {
    const bad = JSON.stringify({ name: 'no version' })
    expect(() => deserialiseProject(bad)).toThrow('Invalid .ptb file')
  })
})
