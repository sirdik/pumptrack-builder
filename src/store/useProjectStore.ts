import { create } from 'zustand'
import type { Project, TrackSettings, LandBoundary, Topology } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { generateTrack } from '../engine/generator'

interface ProjectStore {
  project: Project
  topology: Topology
  setLand: (land: LandBoundary) => void
  setSettings: (settings: Partial<TrackSettings>) => void
  setTopology: (topology: Topology) => void
  generate: () => void
  reset: () => void
  loadProject: (project: Project) => void
}

const initialProject = (): Project => ({
  version: '1',
  name: 'Untitled Project',
  createdAt: new Date().toISOString(),
  settings: { ...DEFAULT_SETTINGS },
  land: { points: [], unit: 'meters' },
  track: null,
})

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: initialProject(),
  topology: 'loop',

  setLand: (land) =>
    set(s => ({ project: { ...s.project, land, track: null } })),

  setSettings: (patch) =>
    set(s => ({
      project: { ...s.project, settings: { ...s.project.settings, ...patch }, track: null },
    })),

  setTopology: (topology) => set({ topology }),

  generate: () => {
    const { project, topology } = get()
    if (project.land.points.length < 3) return
    const track = generateTrack(project.land, project.settings, topology)
    set(s => ({ project: { ...s.project, track } }))
  },

  reset: () => set({ project: initialProject(), topology: 'loop' }),

  loadProject: (project) => set({ project }),
}))
