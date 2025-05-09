import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

// --- Global Variables ---
let scene, camera, renderer, controls, roomGroup;
let ceilingLight, spotLight; 
let gallery_wall, gallery_floor, gallery_ceiling; // Restore gallery globals
let wallWidth, wallHeight, wallDistance, floorSize;
let galleryTexture; // Original loaded texture
let floorTexture, wallTexture, ceilingTexture; // Cloned textures for each section
const clock = new THREE.Clock(); // Clock for deltaTime
const scrollSpeed = 0.05; // Adjust scroll speed as needed

// --- Geometry Offset Logic (Kept for potential future use or other adjustments) ---
const mobileOffsets = { wall: 0, floor: 0, ceiling: 0 };
const desktopOffsets = { wall: 2.8, floor: 0.855, ceiling: 0 };
let currentOffsets = {}; // For geometry position adjustments

// --- Texture Scroll Offset Logic ---
// These will now represent the FIXED starting V-coordinate offset for each section
const desktopTextureOffsets = { wall: 0, floor: -0.178, ceiling: 0.213}; // Hardcoded from user feedback
const mobileTextureOffsets = { wall: 0, floor: -0.133, ceiling: 0.133};    // Default mobile offsets (adjust if needed)
let currentTextureOffsets = {}; // Holds the active set (desktop or mobile)
let baseScrollOffset = 0; // Unified scroll position tracker

// --- DOM Elements ---
const container = document.getElementById('container');

// --- Room Rotation Variables ---
// Angles for roomGroup rotation to bring a wall to the front
const targetAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // Front, Right(Rotate Room Left), Back, Left(Rotate Room Right)
let currentViewIndex = 0; // Start facing front (room rotation 0)
const rotationDuration = 500; // ms for rotation animation
const lightFadeDuration = 500; // ms for light fade animation

// --- Core Functions ---
function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    // Increase FOV for a wider view only on mobile/portrait
    const fov = aspect < 1 ? 90 : 60; // Changed from 90 : 75 (originally 80:60)
    const near = 0.1;
    const cameraZ = aspect < 1 ? 1.8 : 2.5;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, 1000);
    camera.position.set(0, 0, cameraZ);
    scene.add(camera); // Add camera to scene so controls can target it
    camera.lookAt(0, 0, 0); // Ensure camera looks at the origin initially

    // Lights
    // Ceiling Light (replaces point light)
    ceilingLight = new THREE.SpotLight(0xffffff, 30, 10, Math.PI / 3, 0.5, 2); // Intensity 30, Distance 10, Angle PI/3, Penumbra 0.5, Decay 2 (default)
    ceilingLight.position.set(0, 4.1, 0); // Position LOWERED to be below ceiling (y=2 or y=3)
    ceilingLight.target.position.set(0, 0, 0); // Point towards floor center
    scene.add(ceilingLight);
    scene.add(ceilingLight.target);

    // Gallery Spotlight (existing)
    spotLight = new THREE.SpotLight(0xffffff,15, 10); // Adjusted distance back to 10
    spotLight.position.set(0, 0, 0.6); // Move slightly away from origin
    scene.add(spotLight);
    spotLight.penumbra = 0.3; // Add softness to the spotlight edge
    // Point the spotlight towards the negative Z direction (where the gallery wall likely is)
    spotLight.target.position.set(0, 0, -0.1); 
    scene.add(spotLight.target); // Important: Add the target to the scene

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false; // Disable OrbitControls interaction
    // controls.target.set(0, 0, 0); // No longer strictly necessary if camera doesn't rotate, but doesn't hurt

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('public/images/gallery_strip_vertical.png', 
        (texture) => { // onLoad callback
            // Configure texture once loaded
            galleryTexture = texture;
            galleryTexture.wrapS = THREE.RepeatWrapping;
            galleryTexture.wrapT = THREE.RepeatWrapping;
            galleryTexture.colorSpace = THREE.SRGBColorSpace;

            // --- Clone Texture for each section ---
            floorTexture = galleryTexture.clone();
            floorTexture.needsUpdate = true;
            wallTexture = galleryTexture.clone();
            wallTexture.needsUpdate = true;
            ceilingTexture = galleryTexture.clone();
            ceilingTexture.needsUpdate = true;

            // --- Assign CLONED textures to materials ---
            const galleryWallMesh = scene.getObjectByName("gallery_wall"); // Assuming this is the 'wall' part
            if (galleryWallMesh) {
                galleryWallMesh.material.map = wallTexture;
                galleryWallMesh.material.needsUpdate = true;
            }

            const floorMesh = scene.getObjectByName("gallery_floor"); // CORRECTED: Target gallery floor
            if (floorMesh) {
                floorMesh.material.map = floorTexture;
                floorMesh.material.needsUpdate = true;
            }

            const ceilingMesh = scene.getObjectByName("gallery_ceiling"); // CORRECTED: Target gallery ceiling
            if (ceilingMesh) {
                ceilingMesh.material.map = ceilingTexture;
                ceilingMesh.material.needsUpdate = true;
            }
            // -----------------------------------------

            console.log('Gallery texture loaded and assigned to sections.');
            // updateDimensionsAndOffsets might still be needed for scaling etc., ensure it doesn't overwrite maps
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
    // Set initial intensities directly without fade for the first load
    if (currentViewIndex === 0) {
        ceilingLight.intensity = 0; // Use ceilingLight
        spotLight.intensity = 15;
    } else {
        ceilingLight.intensity = 30; // Use ceilingLight and intensity 30
        spotLight.intensity = 0;
    }

    // Set initial material opacities directly without fade
    const initialOpacity = (currentViewIndex === 0) ? 1 : 0;
    // Need to wait for geometry creation, so do this check later or ensure creation order
    // We'll rely on the fact that materials are created before this point in init
    // A safer approach might involve setting flags or promises, but this should work
    // Find the materials by name or reference if meshes aren't global yet
    // Assuming createRoomGeometry() has run and assigned globals by this point
    if (gallery_wall && gallery_wall.material) gallery_wall.material.opacity = initialOpacity;
    if (gallery_floor && gallery_floor.material) gallery_floor.material.opacity = initialOpacity;
    if (gallery_ceiling && gallery_ceiling.material) gallery_ceiling.material.opacity = initialOpacity;

    // --- Add Arrow Button Listeners ---
    const arrowLeft = document.getElementById('arrow-left');
    const arrowRight = document.getElementById('arrow-right');

    arrowLeft.addEventListener('click', () => {
        currentViewIndex = (currentViewIndex - 1 + targetAngles.length) % targetAngles.length;
        transitionLights(currentViewIndex); // Use new fade function
        rotateRoom(targetAngles[currentViewIndex]); 
    });

    arrowRight.addEventListener('click', () => {
        currentViewIndex = (currentViewIndex + 1) % targetAngles.length;
        transitionLights(currentViewIndex); // Use new fade function
        rotateRoom(targetAngles[currentViewIndex]); 
    });
}

function createRoomGeometry() {
    roomGroup = new THREE.Group(); // Initialize global roomGroup
    roomGroup.name = "roomGroup";
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

    const galleryFloorMaterial = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', // White base color
        side: THREE.DoubleSide, 
        map: null, // Texture assigned later in init
        transparent: true 
    });
    galleryFloorMaterial.name = "galleryFloorMaterial"; 

    const galleryCeilingMaterial = new THREE.MeshStandardMaterial({ 
        color: '#ffffff', // White base color
        side: THREE.DoubleSide, 
        map: null, // Texture assigned later in init
        transparent: true
    });
    galleryCeilingMaterial.name = "galleryCeilingMaterial";

    // Create Meshes (will be positioned/scaled in updateDimensionsAndOffsets)
    
    // --- Gallery Surfaces ---
    gallery_wall = new THREE.Mesh(wallGeometry, galleryWallMaterial); // Assign to global var 
    gallery_wall.name = "gallery_wall";
    roomGroup.add(gallery_wall);

    gallery_floor = new THREE.Mesh(floorCeilingGeometry, galleryFloorMaterial); // Assign to global var
    gallery_floor.name = "gallery_floor";
    roomGroup.add(gallery_floor);

    gallery_ceiling = new THREE.Mesh(floorCeilingGeometry, galleryCeilingMaterial); // Assign to global var
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
    console.log(`View mode: ${isMobile ? 'Mobile' : 'Desktop'}, Initial Geometry Offsets:`, currentOffsets);

    // ---> Update Active Texture Offsets <--- 
    currentTextureOffsets = isMobile ? { ...mobileTextureOffsets } : { ...desktopTextureOffsets };
    console.log(`Active Texture Offsets:`, currentTextureOffsets);

    // Update Camera (aspect is already calculated)
    camera.fov = isMobile ? 90 : 60; // Changed from 90 : 75 (originally 80:60)
    camera.updateProjectionMatrix();

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
    let targetAngle;
    let nextViewIndex;
    const previousViewIndex = currentViewIndex; // Store previous index

    switch (event.key) {
        case 'ArrowLeft':
            targetAngle = roomGroup.rotation.y + Math.PI / 2;
            nextViewIndex = (currentViewIndex + 1) % 4;
            break;
        case 'ArrowRight':
            targetAngle = roomGroup.rotation.y - Math.PI / 2;
            nextViewIndex = (currentViewIndex - 1 + 4) % 4;
            break;
        default:
            return; // Ignore other keys
    }

    if (nextViewIndex !== currentViewIndex) { // Only if index changes
        console.log(`Transitioning from view ${previousViewIndex} to ${nextViewIndex}`);
        const movingAwayFromGallery = (previousViewIndex === 0 && nextViewIndex !== 0);

        if (movingAwayFromGallery) {
            console.log("Moving away from gallery: Delayed transition sequence initiated.");
            transitionLights(nextViewIndex, targetAngle); // Pass targetAngle for delayed rotation
            // Rotation is handled *inside* transitionLights via callback
        } else {
            console.log("Moving towards gallery or between walls: Immediate transition.");
            transitionLights(nextViewIndex); // Standard transition
            rotateRoom(targetAngle);         // Start rotation immediately
        }
        currentViewIndex = nextViewIndex; // Update view index AFTER initiating transitions
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
    console.log('Controls:');
    // Add any remaining geometry controls here if applicable
    console.log('--- Texture offsets are now hardcoded per display mode (desktop/mobile) ---');
    console.log('- Press Shift+S to log current geometry offsets preset AND current fixed texture offsets');
    // console.log('--- Fixed Texture Offset Controls (for Ribbon Effect) ---');
    // console.log('- Up/Down Arrows: Adjust floor texture STARTING offset (usually 0)');
    // console.log('- Left/Right Arrows: Adjust ceiling texture STARTING offset (floor_height + wall_height)');
    // console.log('- W/S Keys: Adjust wall texture STARTING offset (floor_height)');
    // console.log('- Press L to log current fixed texture offset values');
    // console.log('----------------------------------------------------------');
}

function onWindowResize() {
    updateDimensionsAndOffsets(); // Recalculate everything on resize
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta(); // Get time since last frame
    const scrollAmount = scrollSpeed * deltaTime;

    // Update the base scroll offset (consistent for all)
    // Add 1 before modulo to handle potential negative results correctly
    baseScrollOffset = (baseScrollOffset - scrollAmount + 1) % 1; 

    // Apply base scroll + fixed positional offset (from current active set) to each texture
    if (floorTexture) {
        floorTexture.offset.y = (baseScrollOffset + currentTextureOffsets.floor + 1) % 1;
    }
    if (wallTexture) {
        wallTexture.offset.y = (baseScrollOffset + currentTextureOffsets.wall + 1) % 1;
    }
    if (ceilingTexture) {
        ceilingTexture.offset.y = (baseScrollOffset + currentTextureOffsets.ceiling + 1) % 1;
    }

    TWEEN.update(); // IMPORTANT: Update TWEEN animations

    renderer.render(scene, camera);
}

// --- Light Transition Function ---
function transitionLights(viewIndex, targetAngle = null) { // Added optional targetAngle
    // Check lights
    if (!ceilingLight || !spotLight) {
        console.error("Lights not initialized for transition!");
        return;
    }
    // Check gallery objects and their materials
    if (!gallery_wall || !gallery_wall.material ||
        !gallery_floor || !gallery_floor.material ||
        !gallery_ceiling || !gallery_ceiling.material) {
        console.error("Gallery elements not initialized for transition!");
        return;
    }

    const targetCeilingIntensity = (viewIndex === 0) ? 0 : 30; // Use ceilingLight and intensity 30
    const targetSpotIntensity = (viewIndex === 0) ? 15 : 0;
    const targetOpacity = (viewIndex === 0) ? 1 : 0; // Target opacity for gallery
    const movingAwayFromGallery = (targetSpotIntensity === 0 && targetAngle !== null); // Check if we're moving away AND received an angle

    console.log(`Transitioning lights to view ${viewIndex}. Moving away: ${movingAwayFromGallery}`);
    console.log(`Targets: Ceiling=${targetCeilingIntensity}, Spot=${targetSpotIntensity}, Opacity=${targetOpacity}`);

    // --- Gallery Spot Light Tween --- (Always starts immediately)
    new TWEEN.Tween(spotLight)
        .to({ intensity: targetSpotIntensity }, lightFadeDuration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    // --- Gallery Material Opacity Tweens --- (Always start immediately)
    new TWEEN.Tween(gallery_wall.material)
        .to({ opacity: targetOpacity }, lightFadeDuration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
    new TWEEN.Tween(gallery_floor.material)
        .to({ opacity: targetOpacity }, lightFadeDuration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
    new TWEEN.Tween(gallery_ceiling.material)
        .to({ opacity: targetOpacity }, lightFadeDuration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

    // --- Ceiling Light Tween --- (Conditional delay and callback)
    const ceilingTween = new TWEEN.Tween(ceilingLight)
        .to({ intensity: targetCeilingIntensity }, lightFadeDuration)
        .easing(TWEEN.Easing.Quadratic.InOut);

    if (movingAwayFromGallery) {
        ceilingTween.delay(500); // 500ms delay before ceiling light starts fading IN
        ceilingTween.onStart(() => {
            console.log(`Ceiling light fade IN started (after 500ms delay). Queueing rotation to ${targetAngle} in 100ms.`);
            setTimeout(() => {
                 console.log(`Executing delayed rotation to angle: ${targetAngle}`);
                 rotateRoom(targetAngle);
            }, 100); // 100ms delay *after* light starts fading in
        });
    } else {
       // No delay if moving towards gallery or between other walls
       ceilingTween.delay(0);
    }

    ceilingTween.start();
}


// --- Room Rotation Function ---
function rotateRoom(targetAngle) { 
    if (!roomGroup) return; // Ensure roomGroup exists

    const currentRotation = { y: roomGroup.rotation.y }; // Target roomGroup rotation
    const targetRotation = { y: targetAngle };

    // Adjust target angle to be the shortest path
    // Handle wrap-around from PI to -PI etc.
    const twoPi = Math.PI * 2;
    while (targetRotation.y - currentRotation.y > Math.PI) targetRotation.y -= twoPi;
    while (targetRotation.y - currentRotation.y < -Math.PI) targetRotation.y += twoPi;

    new TWEEN.Tween(currentRotation)
        .to(targetRotation, rotationDuration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            // camera.rotation.y = currentRotation.y; // Don't rotate camera
            roomGroup.rotation.y = currentRotation.y; // Rotate roomGroup instead
        })
        .start();
}

// --- Start ---
init();
animate();
