import { useRef } from 'react'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'

interface WallsProps {
  viewport: {
    width: number
    height: number
    aspect: number
  }
}

export const Walls = ({ viewport }: WallsProps) => {
  const wallsRef = useRef<Mesh>(null)

  useFrame(() => {
    if (wallsRef.current) {
      // Add any animations here
    }
  })

  // Adjust wall dimensions based on viewport
  const wallWidth = viewport.aspect < 1 ? 4 : 6
  const wallHeight = viewport.aspect < 1 ? 6 : 4
  const wallSize = [wallWidth, wallHeight] as [number, number]
  const floorSize = [wallWidth * 1.5, wallWidth * 1.5] as [number, number]

  // Adjust wall positions based on size
  const wallDistance = viewport.aspect < 1 ? 2 : 3

  return (
    <group ref={wallsRef}>
      {/* Front Wall (Gallery) */}
      <mesh position={[0, 0, -wallDistance]}>
        <planeGeometry args={wallSize} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Right Wall (Booking) */}
      <mesh position={[wallDistance, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={wallSize} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Left Wall (Contact) */}
      <mesh position={[-wallDistance, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={wallSize} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Back Wall (About) */}
      <mesh position={[0, 0, wallDistance]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={wallSize} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -wallHeight/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={floorSize} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, wallHeight/2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={floorSize} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>
    </group>
  )
}
