import type { Project } from '../types'

export function serialiseProject(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function deserialiseProject(json: string): Project {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) {
    throw new Error('Invalid .ptb file: missing version field')
  }
  return parsed as Project
}

export function downloadProject(project: Project): void {
  const blob = new Blob([serialiseProject(project)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/\s+/g, '-')}.ptb`
  a.click()
  URL.revokeObjectURL(url)
}

export function uploadProject(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(deserialiseProject(e.target?.result as string))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
