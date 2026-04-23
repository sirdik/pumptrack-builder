import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../store/useProjectStore'
import { TRACK_WIDTHS } from '../types'
import type { Point } from '../types'

function TrackMesh({ path, trackWidthM }: { path: Point[]; trackWidthM: number }) {
  const geometry = useMemo(() => {
    if (path.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(
      path.map(p => new THREE.Vector3(p.x, 0, p.y)),
      true,
    )
    return new THREE.TubeGeometry(curve, path.length * 4, trackWidthM / 2, 6, true)
  }, [path, trackWidthM])

  const flatScale: [number, number, number] = [1, 0.12, 1]

  if (!geometry) return null
  return (
    <mesh geometry={geometry} scale={flatScale}>
      <meshStandardMaterial color="#c49a3c" />
    </mesh>
  )
}

function RollerMesh({
  position, height, trackWidthM, directionRad,
}: { position: Point; height: number; trackWidthM: number; directionRad: number }) {
  // Cylinder lies across the track (perpendicular to travel direction)
  // Euler XYZ [π/2, -directionRad, 0] makes the Y-axis of the cylinder
  // point in the (−sin d, 0, cos d) direction — perpendicular to track in XZ plane
  return (
    <mesh
      position={[position.x, height / 2, position.y]}
      rotation={[Math.PI / 2, -directionRad, 0]}
    >
      <cylinderGeometry args={[height / 2, height / 2, trackWidthM, 12]} />
      <meshStandardMaterial color="#7a5020" />
    </mesh>
  )
}

function BermMesh({ position, radius }: { position: Point; radius: number }) {
  return (
    <mesh position={[position.x, 0.08, position.y]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.15, 6, 32, Math.PI]} />
      <meshStandardMaterial color="#e07030" opacity={0.7} transparent />
    </mesh>
  )
}

export default function ThreeDView() {
  const track = useProjectStore(s => s.project.track)
  const bikeType = useProjectStore(s => s.project.settings.bikeType)
  const trackWidthM = TRACK_WIDTHS[bikeType]

  return (
    <Canvas
      style={{ flex: 1, display: 'block' }}
      camera={{ position: [20, 25, 20], fov: 50 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Grid args={[100, 100]} cellColor="#2a3a2a" sectionColor="#3a4a3a" />
      <OrbitControls />

      {track && (
        <>
          <TrackMesh path={track.centerlinePath} trackWidthM={trackWidthM} />
          {track.elements.map(el => {
            if (el.type === 'roller')
              return (
                <RollerMesh
                  key={el.id}
                  position={el.position}
                  height={el.heightM}
                  trackWidthM={trackWidthM}
                  directionRad={el.directionRad}
                />
              )
            if (el.type === 'berm')
              return <BermMesh key={el.id} position={el.position} radius={el.radiusM} />
            return null
          })}
        </>
      )}
    </Canvas>
  )
}
