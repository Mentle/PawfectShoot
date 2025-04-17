import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let wallWidth, wallHeight, wallDistance, floorSize;
let galleryTexture; // Texture variable
const clock = new THREE.Clock(); // Clock for deltaTime
const scrollSpeed = 0.05; // Adjust scroll speed as needed

// --- Offset Logic ---
const mobileOffsets = { wall: 3.4, floor: 0.5, ceiling: 0 }; // Reset ceiling offset
const desktopOffsets = { wall: 2.8, floor: 0.855, ceiling: 0 }; // Reset ceiling offset
let currentOffsets = {};

// --- DOM Elements ---
const container = document.getElementById('container');

// --- Core Functions ---
function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    const fov = aspect < 1 ? 80 : 60;
    const cameraZ = aspect < 1 ? 1.8 : 2.5;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.position.set(0, 0, cameraZ);
    scene.add(camera); // Add camera to scene so controls can target it

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minAzimuthAngle = -Math.PI / 2;
    controls.maxAzimuthAngle = Math.PI / 2;
    controls.rotateSpeed = 0.5;
    controls.enablePan = false; // Usually good for fixed scenes

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();
    galleryTexture = textureLoader.load('public/images/gallery_strip_vertical.png', 
        (texture) => { // onLoad callback
            // Configure texture once loaded
            texture.wrapS = THREE.ClampToEdgeWrapping; // Clamp horizontally (no repeat)
            texture.wrapT = THREE.RepeatWrapping; // Repeat vertically (for wall scroll)
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            console.log('Gallery texture loaded and configured.');
            // Initial update for texture repeat values
            updateDimensionsAndOffsets(); 
        },
        undefined, // onProgress callback (optional)
        (error) => { // onError callback
            console.error('Error loading gallery texture:', error);
        }
    );

    // Geometry (Walls, Floor, Ceiling)
    createRoomGeometry();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', handleKeyDown);

    // Initial calculation
    updateDimensionsAndOffsets();
    logInstructions();
}

function createRoomGeometry() {
    // Placeholder - will be filled by combining meshes
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // Geometry instances (reuse where possible)
    const wallGeometry = new THREE.PlaneGeometry(1, 1); // Base size, will be scaled
    const floorCeilingGeometry = new THREE.PlaneGeometry(1, 1); // Base size, will be scaled

    // Material instances
    const galleryWallMaterial = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', // White base color to show texture purely
        side: THREE.DoubleSide,
        map: galleryTexture, // Assign texture later if needed, or rely on load callback
        transparent: true // Restore transparency for PNG gaps
    }); 
    galleryWallMaterial.name = "galleryWallMaterial"; // Renamed

    const sideWallMaterial = new THREE.MeshStandardMaterial({ color: '#e0e0e0', side: THREE.DoubleSide });
    sideWallMaterial.name = "sideWallMaterial";

    const backWallMaterial = new THREE.MeshStandardMaterial({ color: '#d0d0d0', side: THREE.DoubleSide });
    backWallMaterial.name = "backWallMaterial";

    const actualFrontWallMaterial = new THREE.MeshStandardMaterial({ color: '#e8e8e8', side: THREE.DoubleSide });
    actualFrontWallMaterial.name = "actualFrontWallMaterial";

    const actualFloorMaterial = new THREE.MeshStandardMaterial({ color: '#c8c8c8', side: THREE.DoubleSide });
    actualFloorMaterial.name = "actualFloorMaterial";

    const actualCeilingMaterial = new THREE.MeshStandardMaterial({ color: '#f0f0f0', side: THREE.DoubleSide });
    actualCeilingMaterial.name = "actualCeilingMaterial";

    const galleryFloorCeilingMaterial = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', // White base color
        side: THREE.DoubleSide, 
        map: galleryTexture, // Use the same texture 
        transparent: true // Restore transparency
    });
    galleryFloorCeilingMaterial.name = "galleryFloorCeilingMaterial"; // Renamed

    // Create Meshes (will be positioned/scaled in updateDimensionsAndOffsets)
    
    // --- Gallery Surfaces ---
    const gallery_wall = new THREE.Mesh(wallGeometry, galleryWallMaterial); // Renamed
    gallery_wall.name = "gallery_wall";
    roomGroup.add(gallery_wall);

    const gallery_floor = new THREE.Mesh(floorCeilingGeometry, galleryFloorCeilingMaterial); // Renamed
    gallery_floor.name = "gallery_floor";
    roomGroup.add(gallery_floor);

    const gallery_ceiling = new THREE.Mesh(floorCeilingGeometry, galleryFloorCeilingMaterial); // Renamed
    gallery_ceiling.name = "gallery_ceiling";
    roomGroup.add(gallery_ceiling);

    // --- Actual Room Surfaces ---
    const actual_frontWall = new THREE.Mesh(wallGeometry, actualFrontWallMaterial); // Use distinct material
    actual_frontWall.name = "actual_frontWall";
    roomGroup.add(actual_frontWall);

    const rightWall = new THREE.Mesh(wallGeometry, sideWallMaterial);
    rightWall.name = "rightWall";
    roomGroup.add(rightWall);

    const leftWall = new THREE.Mesh(wallGeometry, sideWallMaterial);
    leftWall.name = "leftWall";
    roomGroup.add(leftWall);

    const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
    backWall.name = "backWall";
    roomGroup.add(backWall);

    const actual_floor = new THREE.Mesh(floorCeilingGeometry, actualFloorMaterial); // Use distinct material
    actual_floor.name = "actual_floor";
    roomGroup.add(actual_floor);

    const actual_ceiling = new THREE.Mesh(floorCeilingGeometry, actualCeilingMaterial); // Use distinct material
    actual_ceiling.name = "actual_ceiling";
    roomGroup.add(actual_ceiling);
}

function updateDimensionsAndOffsets() {
    const aspect = window.innerWidth / window.innerHeight;
    const isMobile = aspect < 1;

    // Update Dimensions based on aspect ratio
    wallWidth = isMobile ? 4 : 6;
    wallHeight = isMobile ? 6 : 4;
    wallDistance = isMobile ? 2 : 3;
    floorSize = [wallWidth, wallWidth]; // Set floor/ceiling width to match wall width

    // Update Offsets
    currentOffsets = isMobile ? { ...mobileOffsets } : { ...desktopOffsets };
    console.log(`View mode: ${isMobile ? 'Mobile' : 'Desktop'}, Initial Offsets:`, currentOffsets);

    // Update Camera (aspect is already calculated)
    camera.fov = isMobile ? 80 : 60;
    const cameraZ = isMobile ? 1.8 : 2.5; // Bring camera closer in mobile
    const cameraY = isMobile ? 0.3 : 0; // Raise camera slightly in mobile view
    camera.position.set(0, cameraY, cameraZ);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    // Update Renderer
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Ensure controls target the origin
    controls.target.set(0, 0, 0);

    // --- Texture Aspect Ratio Handling and Material Reset ---
    if (galleryTexture && galleryTexture.image) {
        const textureWidth = galleryTexture.image.width;
        const textureHeight = galleryTexture.image.height;
        const textureAspect = textureWidth / textureHeight; // Keep aspect calculation

        // --- REMOVED UV Calculation Block ---
        // (Removed calculations for targetTextureVisualWidth, targetTextureVisualHeight, repeatX_wall, repeatY_wall, offsetX_wall)
        // --- Keep target width calc for geometry scaling below --- 
        let targetTextureVisualWidth;
        if (window.innerWidth / window.innerHeight < 1) { // isMobile
            targetTextureVisualWidth = wallWidth * 0.8;
        } else {
            targetTextureVisualWidth = wallWidth / 3;
        }
        
        // 3. Apply basic texture settings (repeat=1, offset=0 - y offset handled by animation)
        const roomGroup = scene.children.find(child => child instanceof THREE.Group);
        if (roomGroup) {
            const galleryWall = roomGroup.getObjectByName("gallery_wall");
            if (galleryWall && galleryWall.material.map === galleryTexture) {
                galleryWall.material.map.repeat.set(1, 1); // Use 1:1 repeat
                galleryWall.material.map.offset.x = 0;     // Reset x offset
                // galleryWall.material.map.offset.y will be controlled by animate()
                galleryWall.material.needsUpdate = true;
            }
            // Apply same settings to floor and ceiling materials
            const galleryFloor = roomGroup.getObjectByName("gallery_floor");
            if (galleryFloor && galleryFloor.material.map === galleryTexture) {
                 galleryFloor.material.map.repeat.set(1, 1);
                 galleryFloor.material.map.offset.x = 0;
                 galleryFloor.material.needsUpdate = true;
            }
            const galleryCeiling = roomGroup.getObjectByName("gallery_ceiling");
            if (galleryCeiling && galleryCeiling.material.map === galleryTexture) {
                 galleryCeiling.material.map.repeat.set(1, 1);
                 galleryCeiling.material.map.offset.x = 0;
                 galleryCeiling.material.needsUpdate = true;
            }
        }
    }
    // ----------------------------------

    // Update Geometry Positions and Scales
    const roomGroup = scene.children.find(child => child instanceof THREE.Group);
    if (!roomGroup) return;

    const insetAmount = 0.01;

    // Find all meshes by name
    const galleryWallMesh = roomGroup.getObjectByName("gallery_wall");
    const galleryFloorMesh = roomGroup.getObjectByName("gallery_floor");
    const galleryCeilingMesh = roomGroup.getObjectByName("gallery_ceiling");
    const actualFrontWallMesh = roomGroup.getObjectByName("actual_frontWall");
    const actualFloorMesh = roomGroup.getObjectByName("actual_floor");
    const actualCeilingMesh = roomGroup.getObjectByName("actual_ceiling");
    const rightWallMesh = roomGroup.getObjectByName("rightWall");
    const leftWallMesh = roomGroup.getObjectByName("leftWall");
    const backWallMesh = roomGroup.getObjectByName("backWall");

    // Calculate target dimensions for gallery geometry scaling
    let targetWidth;
    if (isMobile) { 
        targetWidth = wallWidth * 0.8;
    } else {
        targetWidth = wallWidth / 3;
    }
    // Ensure textureAspect is available here, recalculate or get from texture
    const textureAspect = (galleryTexture && galleryTexture.image) ? (galleryTexture.image.width / galleryTexture.image.height) : (600/7000); // Fallback aspect
    const targetHeight = targetWidth / textureAspect;


    // Apply scales and positions
    if (galleryWallMesh) {
        // Scale the gallery plane itself to the target visual size
        galleryWallMesh.scale.set(targetWidth, targetHeight, 1);
        galleryWallMesh.position.set(0, 0, -wallDistance + insetAmount); // Center H/V, move slightly forward
    }
    if (galleryFloorMesh) {
        // Scale floor geometry like the wall: X = targetWidth, Y = targetHeight (depth after rotation)
        galleryFloorMesh.scale.set(targetWidth, targetHeight, 1); 
        galleryFloorMesh.position.set(0, -wallHeight / 2 + insetAmount, 0); 
        galleryFloorMesh.rotation.x = -Math.PI / 2;
    }
    if (galleryCeilingMesh) {
        // Scale ceiling geometry like the wall: X = targetWidth, Y = targetHeight (depth after rotation)
        galleryCeilingMesh.scale.set(targetWidth, targetHeight, 1);
        galleryCeilingMesh.position.set(0, wallHeight / 2 - insetAmount, 0); 
        galleryCeilingMesh.rotation.x = Math.PI / 2;
    }
    if (actualFrontWallMesh) {
        actualFrontWallMesh.scale.set(wallWidth, wallHeight, 1);
        actualFrontWallMesh.position.set(0, 0, -wallDistance);
    }
    if (actualFloorMesh) {
        actualFloorMesh.scale.set(floorSize[0], floorSize[1], 1);
        actualFloorMesh.position.set(0, -wallHeight / 2, 0);
        actualFloorMesh.rotation.x = -Math.PI / 2;
    }
    if (actualCeilingMesh) {
        actualCeilingMesh.scale.set(floorSize[0], floorSize[1], 1);
        actualCeilingMesh.position.set(0, wallHeight / 2, 0);
        actualCeilingMesh.rotation.x = Math.PI / 2;
    }
    if (rightWallMesh) {
        rightWallMesh.scale.set(wallDistance * 2, wallHeight, 1);
        rightWallMesh.position.set(wallWidth / 2, 0, 0);
        rightWallMesh.rotation.y = -Math.PI / 2;
    }
    if (leftWallMesh) {
        leftWallMesh.scale.set(wallDistance * 2, wallHeight, 1);
        leftWallMesh.position.set(-wallWidth / 2, 0, 0);
        leftWallMesh.rotation.y = Math.PI / 2;
    }
    if (backWallMesh) {
        backWallMesh.scale.set(wallWidth, wallHeight, 1);
        backWallMesh.position.set(0, 0, wallDistance);
        backWallMesh.rotation.y = Math.PI;
    }

    // Update geometry positions based on offsets if needed (this moves the whole group)
    updateGeometryPositionsWithOffsets(roomGroup, currentOffsets);
}

function handleKeyDown(event) {
    let needsUpdate = false;
    const step = 0.1;

    // Adjust floor offset
    if (event.key === 'ArrowUp') {
        currentOffsets.floor = +(currentOffsets.floor + step).toFixed(3);
        needsUpdate = true;
    } else if (event.key === 'ArrowDown') {
        currentOffsets.floor = +(currentOffsets.floor - step).toFixed(3);
        needsUpdate = true;
    }
    // Adjust ceiling offset
    else if (event.key === 'ArrowRight') {
        currentOffsets.ceiling = +(currentOffsets.ceiling + step).toFixed(3);
        needsUpdate = true;
    } else if (event.key === 'ArrowLeft') {
        currentOffsets.ceiling = +(currentOffsets.ceiling - step).toFixed(3);
        needsUpdate = true;
    }
    // Adjust wall offset
    else if (event.key.toLowerCase() === 'w') {
        currentOffsets.wall = +(currentOffsets.wall + step).toFixed(3);
        needsUpdate = true;
    } else if (event.key.toLowerCase() === 's' && !event.shiftKey) { // Avoid conflict with Shift+S
        currentOffsets.wall = +(currentOffsets.wall - step).toFixed(3);
        needsUpdate = true;
    }
    // Log current offsets
    else if (event.key.toLowerCase() === 'l') {
        console.log('Current Offsets:', currentOffsets);
        const aspect = window.innerWidth / window.innerHeight;
        console.log('Viewport aspect:', aspect, aspect < 1 ? '(mobile)' : '(desktop)');
    }
     // Save current offsets to console (mimicking saving preset)
     else if (event.key === 'S' && event.shiftKey) {
        const aspect = window.innerWidth / window.innerHeight;
        if (aspect < 1) {
            console.log('Saving current offsets as mobile preset:', currentOffsets);
        } else {
            console.log('Saving current offsets as desktop preset:', currentOffsets);
        }
     }

    if (needsUpdate) {
        console.log("Offsets adjusted:", currentOffsets);
        // Re-apply positions/scales that depend on offsets
        updateGeometryPositionsWithOffsets();
    }
}

// Separate function to apply only offset-dependent geometry updates
function updateGeometryPositionsWithOffsets(roomGroup, currentOffsets) {
     if (!roomGroup) return;

     const wallHeight = roomGroup.getObjectByName("actual_frontWall")?.scale.y || 6; // Get current wall height or default
     const insetAmount = 0.01; // Consistent inset

     const actualFloorMesh = roomGroup.getObjectByName("actual_floor");
     if (actualFloorMesh) {
         actualFloorMesh.position.y = -wallHeight / 2 + currentOffsets.floor;
     }

     // Also move the gallery floor to maintain the inset relative to the actual floor
     const galleryFloorMesh = roomGroup.getObjectByName("gallery_floor");
     if (galleryFloorMesh) {
        galleryFloorMesh.position.y = -wallHeight / 2 + currentOffsets.floor + insetAmount; // Apply offset + inset
     }

     const actualCeilingMesh = roomGroup.getObjectByName("actual_ceiling");
      if (actualCeilingMesh) {
         actualCeilingMesh.position.y = wallHeight / 2 + currentOffsets.ceiling;
      }

     // Also move the gallery ceiling 
     const galleryCeilingMesh = roomGroup.getObjectByName("gallery_ceiling");
     if (galleryCeilingMesh) {
        galleryCeilingMesh.position.y = wallHeight / 2 + currentOffsets.ceiling - insetAmount; // Apply offset - inset
     }

     const actualFrontWallMesh = roomGroup.getObjectByName("actual_frontWall");
      if (actualFrontWallMesh) {
          // Apply wall offset if needed, e.g., to z-position
          // actualFrontWallMesh.position.z = -wallDistance + currentOffsets.wall;
      }

     // Also move the gallery wall
     const galleryWallMesh = roomGroup.getObjectByName("gallery_wall");
     if (galleryWallMesh) {
         // Apply wall offset if needed, e.g., to z-position
         // galleryWallMesh.position.z = -wallDistance + currentOffsets.wall + insetAmount; // Apply offset + inset
     }

      console.log("Geometry positions updated for new offsets.");
 }

function logInstructions() {
    console.log('Offset Controls:');
    console.log('- Up/Down Arrows: Adjust floor offset');
    console.log('- Left/Right Arrows: Adjust ceiling offset');
    console.log('- W/S Keys: Adjust wall offset');
    console.log('- Press L to log current offset values');
    console.log('- Press Shift+S to log values for current view mode preset');
}

function onWindowResize() {
    updateDimensionsAndOffsets(); // Recalculate everything on resize
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta(); // Get time since last frame

    // Animate texture scroll
    if (galleryTexture) {
        galleryTexture.offset.y -= scrollSpeed * deltaTime; // Scroll vertically
        // galleryTexture.offset.x += scrollSpeed * deltaTime; // Uncomment for horizontal scroll
        // Ensure offset stays within 0-1 range if needed, though RepeatWrapping handles it
        // galleryTexture.offset.y %= 1;
    }

    controls.update(); // Only required if damping or auto-rotation is enabled
    renderer.render(scene, camera);
}

// --- Start ---
init();
animate();
