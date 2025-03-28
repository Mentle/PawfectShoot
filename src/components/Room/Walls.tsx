import { useRef, useState, useEffect } from 'react'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { GalleryWall } from '../Gallery'
import { Text } from '@react-three/drei'

interface WallsProps {
  viewport: {
    width: number
    height: number
    aspect: number
  }
}

export const Walls = ({ viewport }: WallsProps) => {
  const wallsRef = useRef<Mesh>(null)
  
  // Define offset values for mobile and desktop views
  const mobileOffsets = {
    wall: 3.4,
    floor: 0.5,
    ceiling: 6.355
  };
  
  const desktopOffsets = {
    wall: 2.8,    // Default desktop values - adjust as needed
    floor: 0.7,   // Default desktop values - adjust as needed
    ceiling: 5.2  // Default desktop values - adjust as needed
  };
  
  // Initialize with appropriate offsets based on viewport
  const initialOffsets = viewport.aspect < 1 ? mobileOffsets : desktopOffsets;
  
  // Add state for offset values that can be adjusted for the perfect effect
  const [galleryOffsets, setGalleryOffsets] = useState(initialOffsets);
  
  // Update offsets when viewport changes
  useEffect(() => {
    const newOffsets = viewport.aspect < 1 ? mobileOffsets : desktopOffsets;
    setGalleryOffsets(newOffsets);
  }, [viewport.aspect]);

  // Add keyboard controls to adjust offsets in real-time
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Adjust floor offset
      if (event.key === 'ArrowUp') {
        setGalleryOffsets(prev => ({
          ...prev,
          floor: +(prev.floor + 0.1).toFixed(2)
        }));
      } else if (event.key === 'ArrowDown') {
        setGalleryOffsets(prev => ({
          ...prev,
          floor: +(prev.floor - 0.1).toFixed(2)
        }));
      }
      
      // Adjust ceiling offset
      else if (event.key === 'ArrowRight') {
        setGalleryOffsets(prev => ({
          ...prev,
          ceiling: +(prev.ceiling + 0.1).toFixed(2)
        }));
      } else if (event.key === 'ArrowLeft') {
        setGalleryOffsets(prev => ({
          ...prev,
          ceiling: +(prev.ceiling - 0.1).toFixed(2)
        }));
      }
      
      // Adjust wall offset (rarely needed, but included for completeness)
      else if (event.key === 'w') {
        setGalleryOffsets(prev => ({
          ...prev,
          wall: +(prev.wall + 0.1).toFixed(2)
        }));
      } else if (event.key === 's') {
        setGalleryOffsets(prev => ({
          ...prev,
          wall: +(prev.wall - 0.1).toFixed(2)
        }));
      }
      
      // Save current offsets to the appropriate preset when 'S' is pressed
      else if (event.key === 'S' && event.shiftKey) {
        if (viewport.aspect < 1) {
          console.log('Saving current offsets as mobile preset:', galleryOffsets);
          // In a real app, you might want to persist these values
        } else {
          console.log('Saving current offsets as desktop preset:', galleryOffsets);
          // In a real app, you might want to persist these values
        }
      }
      
      // Log current offsets when 'L' is pressed
      else if (event.key.toLowerCase() === 'l') {
        console.log('Current Gallery Offsets:', galleryOffsets);
        console.log('Viewport aspect:', viewport.aspect, viewport.aspect < 1 ? '(mobile)' : '(desktop)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Show instructions in console
    console.log('Gallery Offset Controls:');
    console.log('- Up/Down Arrows: Adjust floor offset');
    console.log('- Left/Right Arrows: Adjust ceiling offset');
    console.log('- W/S Keys: Adjust wall offset (if needed)');
    console.log('- Press L to log current offset values');
    console.log('- Press Shift+S to save current values as preset for current view mode');
    console.log('- Negative values are allowed for all offsets');
    console.log('Current view mode:', viewport.aspect < 1 ? 'Mobile' : 'Desktop');
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [galleryOffsets, viewport.aspect]);

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
      <GalleryWall 
        position={[0, 0, -wallDistance]}
        size={wallSize}
        wallOffset={galleryOffsets.wall}
        floorOffset={galleryOffsets.floor}
        ceilingOffset={galleryOffsets.ceiling}
        scrollSpeed={0.2}
      />

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
      
      {/* Add an overlay with instructions and current values */}
      <group position={[0, -wallHeight/2 + 0.3, -wallDistance + 0.1]}>
        {/* Background panel */}
        <mesh>
          <planeGeometry args={[2.2, 0.6]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} />
        </mesh>
        
        {/* Text display for current offset values */}
        <Text
          position={[0, 0.1, 0.01]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {viewport.aspect < 1 ? 'Mobile View' : 'Desktop View'}
        </Text>
        
        <Text
          position={[0, -0.05, 0.01]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`Floor: ${galleryOffsets.floor} | Ceiling: ${galleryOffsets.ceiling} | Wall: ${galleryOffsets.wall}`}
        </Text>
        
        <Text
          position={[0, -0.2, 0.01]}
          fontSize={0.08}
          color="#aaaaaa"
          anchorX="center"
          anchorY="middle"
        >
          Press L to log values to console
        </Text>
      </group>
    </group>
  )
}
