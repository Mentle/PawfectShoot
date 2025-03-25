import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'
import { Walls } from '.'

export const Room = () => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    aspect: window.innerWidth / window.innerHeight
  })

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        aspect: window.innerWidth / window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Adjust camera FOV based on aspect ratio
  const fov = viewport.aspect < 1 ? 80 : 60

  return (
    <Canvas>
      <Suspense fallback={null}>
        <PerspectiveCamera
          makeDefault
          position={[0, 0, viewport.aspect < 1 ? 3.5 : 2.5]}
          fov={fov}
        />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Walls viewport={viewport} />
        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          minAzimuthAngle={-Math.PI / 2}
          maxAzimuthAngle={Math.PI / 2}
          rotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  )
}
