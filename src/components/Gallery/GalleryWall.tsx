import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ScrollingColumn } from './ScrollingColumn'
import { Group } from 'three'

interface GalleryWallProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  size: [number, number]
  // Add customizable offset props with defaults
  wallOffset?: number
  floorOffset?: number
  ceilingOffset?: number
  scrollSpeed?: number
}

// Sample pet photography images (replace with your actual images)
const sampleImages = [
  {
    src: '/images/pet1.jpg',
    height: 1.2
  },
  {
    src: '/images/pet2.jpg',
    height: 1.5
  },
  {
    src: '/images/pet3.jpg',
    height: 1.0
  },
  {
    src: '/images/pet4.jpg',
    height: 1.8
  },
  {
    src: '/images/pet5.jpg',
    height: 1.3
  },
  {
    src: '/images/pet6.jpg',
    height: 1.2
  },
  {
    src: '/images/pet7.jpg',
    height: 1.4
  },
  {
    src: '/images/pet8.jpg',
    height: 1.6
  },
  {
    src: '/images/pet9.jpg',
    height: 1.3
  },
  {
    src: '/images/pet10.jpg',
    height: 1.5
  }
]

export const GalleryWall = ({ 
  position, 
  rotation = [0, 0, 0], 
  size,
  wallOffset = 0,
  floorOffset = 0,
  ceilingOffset = 0,
  scrollSpeed = 0.2
}: GalleryWallProps) => {
  const wallRef = useRef<Group>(null)
  const [width, height] = size
  
  // Column width is 80% of wall width to create the central column effect
  const columnWidth = width * 0.8
  
  // Set consistent spacing for all columns
  const imageSpacing = 0.4
  
  // Calculate total height of all images (for reference only)
  const calculateTotalHeight = () => {
    let totalHeight = 0
    sampleImages.forEach(img => {
      totalHeight += img.height + imageSpacing
    })
    return totalHeight
  }
  
  // This is just for debugging/reference
  const totalColumnHeight = calculateTotalHeight()
  console.log('Total column height:', totalColumnHeight);

  useFrame(() => {
    if (wallRef.current) {
      // Add any wall-specific animations here
    }
  })

  return (
    <group ref={wallRef} position={position} rotation={rotation as any}>
      {/* Base wall */}
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Wall title */}
      <group position={[0, height/2 - 0.5, 0.01]}>
        <mesh>
          <planeGeometry args={[width * 0.6, 0.4]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
      
      {/* Scrolling image column - Wall (center) */}
      <ScrollingColumn 
        images={sampleImages} 
        position={[0, 0, 0.02]} 
        width={columnWidth}
        scrollSpeed={scrollSpeed}
        spacing={imageSpacing}
        initialOffset={wallOffset} // Customizable wall offset
      />
      
      {/* Floor section of the column */}
      <group position={[0, -height/2, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ScrollingColumn 
          images={sampleImages} 
          position={[0, 0, 0.02]} 
          width={columnWidth}
          scrollSpeed={scrollSpeed}
          spacing={imageSpacing}
          initialOffset={floorOffset} // Customizable floor offset
        />
      </group>
      
      {/* Ceiling section of the column */}
      <group position={[0, height/2, 0]} rotation={[Math.PI/2, 0, 0]}>
        <ScrollingColumn 
          images={sampleImages} 
          position={[0, 0, 0.02]} 
          width={columnWidth}
          scrollSpeed={scrollSpeed}
          spacing={imageSpacing}
          initialOffset={ceilingOffset} // Customizable ceiling offset
        />
      </group>
    </group>
  )
}
