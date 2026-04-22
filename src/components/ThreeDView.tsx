import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../store/useProjectStore'
import type { Point } from '../types'

function TrackMesh({ path }: { path: Point[] }) {
  const geometry = useMemo(() => {
    if (path.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(
      path.map(p => new THREE.Vector3(p.x, 0, p.y)),
      true,
    )
    return new THREE.TubeGeometry(curve, path.length * 4, 0.05, 8, true)
  }, [path])

  if (!geometry) return null
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#f5a623" />
    </mesh>
  )
}

function RollerMesh({ position, height, width }: { position: Point; height: number; width: number }) {
  return (
    <mesh position={[position.x, height / 2, position.y]}>
      <cylinderGeometry args={[width / 2, width / 2, height, 12]} />
      <meshStandardMaterial color="#f5a623" />
    </mesh>
  )
}

function BermMesh({ position, radius }: { position: Point; radius: number }) {
  return (
    <mesh position={[position.x, 0.15, position.y]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.2, 8, 32, Math.PI]} />
      <meshStandardMaterial color="#e74c3c" opacity={0.8} transparent />
    </mesh>
  )
}

export default function ThreeDView() {
  const track = useProjectStore(s => s.project.track)

  return (
    <Canvas
      style={{ flex: 1, display: 'block' }}
      camera={{ position: [20, 20, 20], fov: 50 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Grid args={[100, 100]} cellColor="#2a3a2a" sectionColor="#3a4a3a" />
      <OrbitControls />

      {track && (
        <>
          <TrackMesh path={track.centerlinePath} />
          {track.elements.map(el => {
            if (el.type === 'roller')
              return <RollerMesh key={el.id} position={el.position} height={el.heightM} width={el.widthM} />
            if (el.type === 'berm')
              return <BermMesh key={el.id} position={el.position} radius={el.radiusM} />
            return null
          })}
        </>
      )}
    </Canvas>
  )
}
