import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Image as DreiImage } from '@react-three/drei'
import { Group } from 'three'

interface ImageData {
  src: string
  height: number
  aspectRatio?: number
}

interface ScrollingColumnProps {
  images: ImageData[]
  position: [number, number, number]
  width: number
  scrollSpeed?: number
  spacing?: number
  preserveAspectRatio?: boolean
  initialOffset?: number
}

export const ScrollingColumn = ({
  images,
  position,
  width,
  scrollSpeed = 0.3,
  spacing = 0.3,
  preserveAspectRatio = true,
  initialOffset = 0
}: ScrollingColumnProps) => {
  const columnRef = useRef<Group>(null)
  const [totalHeight, setTotalHeight] = useState(0)
  const [processedImages, setProcessedImages] = useState<ImageData[]>([])
  
  useEffect(() => {
    const processImages = async () => {
      const processed = await Promise.all(
        images.map(async (img) => {
          if (img.aspectRatio) {
            return { ...img }
          }
          
          return new Promise<ImageData>((resolve) => {
            const image = new window.Image()
            image.onload = () => {
              const aspectRatio = image.width / image.height
              resolve({
                ...img,
                aspectRatio
              })
            }
            image.onerror = () => {
              resolve({
                ...img,
                aspectRatio: 1
              })
            }
            image.src = img.src
          })
        })
      )
      setProcessedImages(processed)
    }
    
    processImages()
  }, [images])
  
  useEffect(() => {
    if (processedImages.length === 0) return
    
    let height = 0
    processedImages.forEach(img => {
      const imageHeight = preserveAspectRatio && img.aspectRatio 
        ? width / img.aspectRatio 
        : img.height
        
      height += imageHeight + spacing
    })
    
    setTotalHeight(height)
  }, [processedImages, spacing, width, preserveAspectRatio])

  // Set initial position based on initialOffset
  useEffect(() => {
    if (columnRef.current && totalHeight > 0) {
      // For negative offsets, we need to handle them differently
      // We use modulo to ensure the position wraps correctly
      const moduloOffset = ((initialOffset % totalHeight) + totalHeight) % totalHeight;
      columnRef.current.position.y = -moduloOffset;
    }
  }, [initialOffset, totalHeight]);

  // Create a triple set of images to ensure smooth looping with any offset
  const triplicatedImages = [...processedImages, ...processedImages, ...processedImages]
  
  useFrame((_, delta) => {
    if (columnRef.current && totalHeight > 0) {
      columnRef.current.position.y -= scrollSpeed * delta
      
      // Reset position when we've scrolled past the total height
      // This creates the infinite scrolling effect
      if (columnRef.current.position.y < -totalHeight) {
        columnRef.current.position.y += totalHeight
      }
    }
  })

  let currentY = 0
  const imageElements = triplicatedImages.map((img, index) => {
    const imageHeight = preserveAspectRatio && img.aspectRatio 
      ? width / img.aspectRatio 
      : img.height
      
    const yPos = currentY + imageHeight / 2
    const element = (
      <DreiImage
        key={`${index}-${img.src}`}
        url={img.src}
        position={[0, yPos, 0.01] as any}
        scale={[width, imageHeight] as any}
        transparent
      />
    )
    currentY += imageHeight + spacing
    return element
  })

  return (
    <group position={position}>
      <group ref={columnRef}>
        {imageElements}
      </group>
    </group>
  )
}
