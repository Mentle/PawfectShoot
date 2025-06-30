import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'; // Import DRACOLoader
import { initTamagotchiGame } from './tamagotchi_game.js'; // Import the init function

// --- Global Variables ---
let scene, camera, renderer, controls, roomGroup;
let ceilingLight, spotLight; 
let gallery_wall, gallery_floor, gallery_ceiling, gallery_top_back_wall, gallery_bottom_back_wall; // RENAMED gallery_back_wall, ADDED gallery_bottom_back_wall
let wallWidth, wallHeight, wallDistance, floorSize;
let galleryTexture; // Original loaded texture
let floorTexture, wallTexture, ceilingTexture, topBackWallTexture, bottomBackWallTexture; // RENAMED backWallTexture, ADDED bottomBackWallTexture
const clock = new THREE.Clock(); // Clock for deltaTime
const scrollSpeed = 0.03; // Adjust scroll speed as needed
let isGalleryInteractionPaused = false; // To pause gallery scrolling
let lastTouchY = 0; // For touch drag scrolling
const wheelScrollSensitivity = 0.0005; // Sensitivity for mouse wheel scrolling
const touchScrollSensitivity = 0.001; // Sensitivity for touch drag scrolling

// Raycasting and Popup
let raycaster, mouse;
let deskModel; // To store the loaded desk model
let backwallPropsModel; // To store the loaded backwall props model
let leftWallPropsModel; // To store the loaded left wall props model
let whiteboardModel; // To store the loaded whiteboard model
let tamagotchiPopup; // Renamed from modelPopup
// let popupCloseButton; // This will now be handled by tamagotchi_game.js

// Whiteboard Popup Elements
let whiteboardPopup, whiteboardCanvas, whiteboardCtx, whiteboardSaveCloseBtn, whiteboardClearBtn, whiteboardColorBtns;
let isDrawingOnWhiteboard = false;
let whiteboardCurrentColor = 'black'; // Default drawing color
let whiteboardLastX, whiteboardLastY; // To store the last mouse position for drawing

// --- Inspect Mode Variables ---
let isInspecting = false;
let inspectedObjectGroup = null;
const inspectableMeshPairs = {
    'Mesh148_1': 'Mesh148',
    'Mesh537_1': 'Mesh537',
    'Mesh303': 'Mesh303_1',
    'Mesh302': 'Mesh302_1'
    // Note: Mesh269_1 is not included as it wasn't specified as part of a pair.
};
// The keys of inspectableMeshPairs are the 'trigger' meshes
const inspectableMeshNames = Object.keys(inspectableMeshPairs);
let originalCameraPosition = new THREE.Vector3(); // To store camera state before inspection
let originalControlsTarget = new THREE.Vector3(); // To store controls target before inspection
let hiddenOriginalClickedMesh = null; // To store the original clicked mesh that we hide
let hiddenOriginalPartnerMesh = null; // To store the original partner mesh that we hide
let isInspectingModelDrag = false;
let previousInspectMousePosition = { x: 0, y: 0 };
// ---

// --- Geometry Offset Logic (Kept for potential future use or other adjustments) ---
const mobileOffsets = { wall: 0, floor: 0, ceiling: 0 };
const desktopOffsets = { wall: 2.8, floor: 0.855, ceiling: 0 };
let currentOffsets = {}; // For geometry position adjustments

// --- Texture Scroll Offset Logic ---
// These will now represent the FIXED starting V-coordinate offset for each section
const desktopTextureOffsets = { wall: 0, floor: -0.178, ceiling: 0.213, topBackWall: 0, bottomBackWall: 0 }; // RENAMED backWall, ADDED bottomBackWall
const mobileTextureOffsets = { wall: 0, floor: -0.133, ceiling: 0.133, topBackWall: -0.23, bottomBackWall: -0.265 };    // RENAMED backWall, ADDED bottomBackWall
let currentTextureOffsets = {}; // Holds the active set (desktop or mobile)
let baseScrollOffset = 0; // Unified scroll position tracker

// --- DOM Elements ---
const container = document.getElementById('container');

// --- Room Rotation Variables ---
// Angles for roomGroup rotation to bring a wall to the front
const targetAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // Front, Right(Rotate Room Left), Back, Left(Rotate Room Right)
let currentViewIndex = 0; // Start facing front (room rotation 0)
let currentRotationY = 0; // Variable to track the final rotation angle
const rotationDuration = 500; // ms for rotation animation
const lightFadeDuration = 500; // ms for light fade animation

// --- Core Functions ---
function init() {
    // Scene
    scene = new THREE.Scene();

    // Get the Tamagotchi popup container
    tamagotchiPopup = document.getElementById('tamagotchi-container');
    // The close button inside the tamagotchi popup is handled by tamagotchi_game.js

    // Raycaster and mouse for picking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

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
    // Ambient Light (for overall scene illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // White light, 0. intensity
    scene.add(ambientLight);

    // Ceiling Light (replaces point light)
    ceilingLight = new THREE.SpotLight(0xffffff, 30, 10, Math.PI / 2, 0.5, 2); // Intensity 30, Distance 10, Angle PI/2, Penumbra 0.5, Decay 2 (default)
    ceilingLight.position.set(0, 3, 0); // Position LOWERED to be below ceiling (y=2 or y=3)
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
    controls.enabled = false; // Always disable controls when exiting inspect mode
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
            topBackWallTexture = galleryTexture.clone(); // RENAMED from backWallTexture
            topBackWallTexture.needsUpdate = true; // RENAMED from backWallTexture
            bottomBackWallTexture = galleryTexture.clone(); // ADDED
            bottomBackWallTexture.needsUpdate = true; // ADDED

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

            const galleryTopBackWallMesh = scene.getObjectByName("gallery_top_back_wall"); // RENAMED from galleryBackWallMesh
            if (galleryTopBackWallMesh) { 
                galleryTopBackWallMesh.material.map = topBackWallTexture; // RENAMED from backWallTexture
                topBackWallTexture.wrapT = THREE.RepeatWrapping; 
                topBackWallTexture.repeat.y = -0.5; // CORRECTED: Adjust for halved geometry and flip
                
                // Apply trapezoidal alpha map for the top back wall
                const topTrapezoidAlpha = createTrapezoidAlphaMap(true, 512, 0.0, 0.81); // Inverted, pointy, base offset by 10%
                topTrapezoidAlpha.repeat.set(1, 1);
                topTrapezoidAlpha.offset.set(0, 0);
                galleryTopBackWallMesh.material.alphaMap = topTrapezoidAlpha;
                galleryTopBackWallMesh.material.transparent = true;
                galleryTopBackWallMesh.material.needsUpdate = true; 
            }

            const galleryBottomBackWallMesh = scene.getObjectByName("gallery_bottom_back_wall"); // ADDED
            if (galleryBottomBackWallMesh) { // ADDED
                galleryBottomBackWallMesh.material.map = bottomBackWallTexture; // ADDED
                bottomBackWallTexture.wrapT = THREE.RepeatWrapping; // ADDED
                bottomBackWallTexture.repeat.y = -0.5; // CORRECTED: Adjust for halved geometry and flip

                // Apply trapezoidal alpha map for the bottom back wall
                const bottomTrapezoidAlpha = createTrapezoidAlphaMap(false, 512, 0.0, 0.81); // Upright, pointy, base offset by 10%
                bottomTrapezoidAlpha.repeat.set(1, 1);
                bottomTrapezoidAlpha.offset.set(0, 0);
                galleryBottomBackWallMesh.material.alphaMap = bottomTrapezoidAlpha;
                galleryBottomBackWallMesh.material.transparent = true;
                galleryBottomBackWallMesh.material.needsUpdate = true; // ADDED
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

    // Load the PC desk model
    loadDeskModel();
    loadBackwallPropsModel(); // Load the backwall props model
    loadLeftWallPropsModel(); // Load the new left wall props
    loadWhiteboardModel();    // Load the new whiteboard

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', handleKeyDown);

    // Add event listener for mouse click
    renderer.domElement.addEventListener('click', onDocumentMouseClick);

    // Add event listeners for gallery interaction (pause scrolling)
    renderer.domElement.addEventListener('mousedown', onGalleryInteractionStart);
    renderer.domElement.addEventListener('mouseup', onGalleryInteractionEnd);
    renderer.domElement.addEventListener('touchstart', onGalleryInteractionStart, { passive: false }); // passive: false for preventDefault if needed
    renderer.domElement.addEventListener('touchend', onGalleryInteractionEnd);
    renderer.domElement.addEventListener('touchmove', onGalleryInteractionMove, { passive: false }); // For touch drag
    renderer.domElement.addEventListener('wheel', onDocumentWheel, { passive: false }); // For mouse wheel scroll

    // Initial call to set everything up based on the starting view
    transitionLights(); // Set initial lighting based on starting angle (0)
    updateControlsForView(currentRotationY); // Set initial control state
    ceilingLight.intensity = 30; // Always on at intensity 30
    spotLight.intensity = 0;    // Always off

    // Set initial material opacities directly without fade
    const initialGalleryOpacity = 1; // Always 100% overall opacity
    if (gallery_wall && gallery_wall.material) {
        gallery_wall.material.opacity = initialGalleryOpacity;
        gallery_wall.material.transparent = true; // Respect texture's alpha channel
    }
    if (gallery_floor && gallery_floor.material) {
        gallery_floor.material.opacity = initialGalleryOpacity;
        gallery_floor.material.transparent = true; // Respect texture's alpha channel
    }
    if (gallery_ceiling && gallery_ceiling.material) {
        gallery_ceiling.material.opacity = initialGalleryOpacity;
        gallery_ceiling.material.transparent = true; // Respect texture's alpha channel
    }
    if (gallery_top_back_wall && gallery_top_back_wall.material) { // RENAMED gallery_back_wall
        gallery_top_back_wall.material.opacity = initialGalleryOpacity;
        gallery_top_back_wall.material.transparent = true; // Respect texture's alpha channel
    }
    if (gallery_bottom_back_wall && gallery_bottom_back_wall.material) { // ADDED
        gallery_bottom_back_wall.material.opacity = initialGalleryOpacity;
        gallery_bottom_back_wall.material.transparent = true; // Respect texture's alpha channel
    }

    // Position and rotate elements based on currentViewIndex

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

    // Whiteboard popup setup
    whiteboardPopup = document.getElementById('whiteboard-popup');
    whiteboardCanvas = document.getElementById('whiteboard-canvas');
    whiteboardCtx = whiteboardCanvas.getContext('2d');
    whiteboardSaveCloseBtn = document.getElementById('whiteboard-save-close');
    whiteboardClearBtn = document.getElementById('whiteboard-clear');
    whiteboardColorBtns = document.querySelectorAll('.wb-color-btn');

    // Whiteboard event listeners
    whiteboardSaveCloseBtn.addEventListener('click', () => {
        if (whiteboardModel && whiteboardCanvas && whiteboardCtx) {
            console.log('[DEBUG] Attempting to apply drawing to whiteboard model.');
            
            // 1. Log canvas content as Data URL (original canvas content)
            const canvasDataURL = whiteboardCanvas.toDataURL();
            console.log('[DEBUG] Whiteboard Canvas Data URL (original):', canvasDataURL);
            // CRITICAL: Please verify this Data URL in your browser. Does it show your drawing correctly?

            try {
                if (whiteboardCanvas.width === 0 || whiteboardCanvas.height === 0) {
                    console.error('[ERROR] Whiteboard canvas has zero dimensions before texture creation.');
                    hideWhiteboardPopup();
                    return;
                }

                // Create a temporary canvas to pre-process for opaque background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = whiteboardCanvas.width;
                tempCanvas.height = whiteboardCanvas.height;
                const tempCtx = tempCanvas.getContext('2d');

                // Fill with an opaque light grey background
                tempCtx.fillStyle = '#f0f0f0'; // Light grey, good for testing
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Draw the existing drawing (with its transparency) on top of the opaque background
                tempCtx.drawImage(whiteboardCanvas, 0, 0);

                console.log('[DEBUG] Pre-processed Whiteboard Canvas Data URL (for texture):', tempCanvas.toDataURL());

                // Use this pre-processed canvas for the texture
                const newTexture = new THREE.CanvasTexture(tempCanvas);
                newTexture.flipY = false;
                newTexture.needsUpdate = true;

                let foundMesh = false;
                whiteboardModel.traverse((child) => {
                    if (child.isMesh && child.name === 'toy_024001') {
                        console.log('[DEBUG] Found toy_024001 mesh for texture update.');
                        if (child.material) {
                            const oldMaterialState = {
                                name: child.material.name,
                                color: child.material.color.getHexString(),
                                opacity: child.material.opacity,
                                transparent: child.material.transparent,
                                map_uuid: child.material.map ? child.material.map.uuid : null
                            };
                            console.log('[DEBUG] Material BEFORE update (toy_024001):', oldMaterialState);

                            // Dispose old texture if it exists
                            if (child.material.map && child.material.map.isTexture) {
                                console.log('[DEBUG] Disposing old texture (toy_024001 UUID):', child.material.map.uuid);
                                child.material.map.dispose();
                            }
                            
                            // Apply new texture and set material properties
                            child.material.map = newTexture;
                            child.material.color.set(0xffffff); // KEY CHANGE: Set material base color to white
                            child.material.transparent = false; // FORCE OPAQUE RENDERING
                            child.material.opacity = 1.0;       // Ensure full opacity
                            
                            // Ensure updates are flagged
                            if (child.material.map) child.material.map.needsUpdate = true; // Texture content changed
                            child.material.needsUpdate = true;     // Material properties (map, color, transparent, opacity) changed
                            
                            // Log material state AFTER update
                            const newMaterialState = {
                                name: child.material.name,
                                color: child.material.color.getHexString(), // Should now be 'ffffff'
                                opacity: child.material.opacity,
                                transparent: child.material.transparent,
                                map_uuid: child.material.map ? child.material.map.uuid : null // Should be newTexture.uuid
                            };
                            console.log('[DEBUG] New texture (UUID:', newTexture.uuid, ') applied to toy_024001.');
                            console.log('[DEBUG] Material AFTER update (toy_024001):', newMaterialState);
                            foundMesh = true;
                        } else {
                            console.warn('[DEBUG] toy_024001 mesh has no material.');
                        }
                    }
                });

                if (!foundMesh) {
                    console.warn('[DEBUG] toy_024001 mesh not found in whiteboardModel during texture application.');
                }
            } catch (error) {
                console.error('[ERROR] Failed to apply texture to whiteboard:', error);
            }
        } else {
            console.warn('[DEBUG] Whiteboard model, canvas, or context not available for saving texture.');
        }
        hideWhiteboardPopup();
    });

    whiteboardClearBtn.addEventListener('click', () => {
        if(whiteboardCtx) {
            // Clear by filling with an opaque white background
            whiteboardCtx.fillStyle = '#FFFFFF'; // Opaque White
            whiteboardCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
            console.log('[DEBUG] Whiteboard canvas cleared and filled with opaque white background.');
        }
    });

    whiteboardColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            whiteboardCurrentColor = btn.dataset.color;
            if(whiteboardCtx) whiteboardCtx.strokeStyle = whiteboardCurrentColor;
            
            // Update active class for visual feedback
            whiteboardColorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            console.log('[DEBUG] Whiteboard color changed to:', whiteboardCurrentColor);
        });
    });

    // Set black as active initially
    const blackButton = document.querySelector('.wb-color-btn[data-color="black"]');
    if (blackButton) blackButton.classList.add('active');

    // Basic drawing listeners for the canvas (mouse and touch)
    if (whiteboardCanvas) {
        // Mouse events
        whiteboardCanvas.addEventListener('mousedown', handleDrawStart);
        whiteboardCanvas.addEventListener('mousemove', handleDrawMove);
        whiteboardCanvas.addEventListener('mouseup', handleDrawEnd);
        whiteboardCanvas.addEventListener('mouseout', handleDrawEnd);

        // Touch events
        whiteboardCanvas.addEventListener('touchstart', handleDrawStart, { passive: false });
        whiteboardCanvas.addEventListener('touchmove', handleDrawMove, { passive: false });
        whiteboardCanvas.addEventListener('touchend', handleDrawEnd);
        whiteboardCanvas.addEventListener('touchcancel', handleDrawEnd);
    }
}

// --- Whiteboard Drawing Handlers (Mouse & Touch) ---
function getCanvasCoordinates(event) {
    const rect = whiteboardCanvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
}

function handleDrawStart(event) {
    if (event.touches) event.preventDefault();
    isDrawingOnWhiteboard = true;
    const { x, y } = getCanvasCoordinates(event);
    [whiteboardLastX, whiteboardLastY] = [x, y];
}

function handleDrawMove(event) {
    if (!isDrawingOnWhiteboard) return;
    if (event.touches) event.preventDefault();

    const { x, y } = getCanvasCoordinates(event);
    if (whiteboardCtx) {
        whiteboardCtx.beginPath();
        whiteboardCtx.moveTo(whiteboardLastX, whiteboardLastY);
        whiteboardCtx.lineTo(x, y);
        whiteboardCtx.stroke();
    }
    [whiteboardLastX, whiteboardLastY] = [x, y];
}

function handleDrawEnd(event) {
    isDrawingOnWhiteboard = false;
}

function updateControlsForView(angle) {
    const galleryViewAngle = 0;
    const tolerance = 0.001;

    // Normalize the angle to be within -PI to PI for consistent checks
    const normalizedAngle = (angle + Math.PI) % (2 * Math.PI) - Math.PI;

    // Enable controls only when in the main gallery view
    if (Math.abs(normalizedAngle - galleryViewAngle) < tolerance) {
        controls.enabled = true;
    } else {
        controls.enabled = false;
    }
    // console.log(`[CONTROLS] View angle: ${normalizedAngle.toFixed(2)}, Controls enabled: ${controls.enabled}`);
}

// Function to create a trapezoidal alpha map
function createTrapezoidAlphaMap(inverted = false, size = 256, tipWidthFraction = 0.0, baseOffsetYFraction = 0.0) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    context.fillStyle = 'black'; // Transparent areas
    context.fillRect(0, 0, size, size);

    context.fillStyle = 'white'; // Opaque areas
    context.beginPath();

    const baseTopY = size * baseOffsetYFraction;
    const baseBottomY = size * (1.0 - baseOffsetYFraction);

    if (tipWidthFraction === 0.0) { // Optimized path for true triangles
        if (inverted) {
            // Upside-down triangle (points down)
            context.moveTo(0, baseTopY); // Top-left of base
            context.lineTo(size, baseTopY); // Top-right of base
            context.lineTo(size / 2, size); // Bottom-center tip (at very bottom of canvas)
        } else {
            // Right-side-up triangle (points up)
            context.moveTo(0, baseBottomY); // Bottom-left of base
            context.lineTo(size, baseBottomY); // Bottom-right of base
            context.lineTo(size / 2, 0); // Top-center tip (at very top of canvas)
        }
    } else { // Original trapezoid logic for other tipWidthFractions
        const tipHalfWidth = (size * tipWidthFraction) / 2;
        if (inverted) {
            context.moveTo(0, baseTopY); // Top-left of base
            context.lineTo(size, baseTopY); // Top-right of base
            context.lineTo(size / 2 + tipHalfWidth, size); // Bottom-right of tip
            context.lineTo(size / 2 - tipHalfWidth, size); // Bottom-left of tip
        } else {
            context.moveTo(0, baseBottomY); // Bottom-left of base
            context.lineTo(size, baseBottomY); // Bottom-right of base
            context.lineTo(size / 2 + tipHalfWidth, 0); // Top-right of tip
            context.lineTo(size / 2 - tipHalfWidth, 0); // Top-left of tip
        }
    }
    context.closePath();
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true; // Ensure the texture is updated
    return texture;
}

// Function to create a procedural wood plank texture
function createWoodPlankTexture(baseColorHex, plankLineColorHex, textureWidth = 256, textureHeight = 256, plankThickness = 32, lineThickness = 2) {
    const canvas = document.createElement('canvas');
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const context = canvas.getContext('2d');

    // Base color for planks
    context.fillStyle = baseColorHex;
    context.fillRect(0, 0, textureWidth, textureHeight);

    // Draw plank lines (assuming planks run vertically in the texture, adjust if horizontal preferred)
    context.strokeStyle = plankLineColorHex;
    context.lineWidth = lineThickness;

    for (let x = 0; x < textureWidth; x += plankThickness) {
        context.beginPath();
        // Offset by half line thickness for better centering if line is on the boundary
        context.moveTo(x + lineThickness / 2, 0); 
        context.lineTo(x + lineThickness / 2, textureHeight);
        context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; // Repeat horizontally
    texture.wrapT = THREE.RepeatWrapping; // Repeat vertically
    // Example: texture.repeat.set(numHorizontalRepeats, numVerticalRepeats);
    // Adjust these values based on your floor size and desired plank scale.
    // For a start, let's assume the floor UVs are set up for a single texture pass.
    // If planks look too big or small, texture.repeat is the place to adjust.
    return texture;
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
        map: null, // Initialize with null, texture assigned later
        transparent: true // Restore transparency for PNG gaps
    }); 
    galleryWallMaterial.name = "galleryWallMaterial"; // Renamed

    const galleryTopBackWallMaterial = new THREE.MeshStandardMaterial({ // RENAMED from galleryBackWallMaterial
        color: '#ffffff',
        side: THREE.DoubleSide,
        map: null, // Texture assigned later in init
        transparent: true
    });
    galleryTopBackWallMaterial.name = "galleryTopBackWallMaterial"; // RENAMED

    const galleryBottomBackWallMaterial = new THREE.MeshStandardMaterial({ // ADDED
        color: '#ffffff',
        side: THREE.DoubleSide,
        map: null, // Texture assigned later in init
        transparent: true
    });
    galleryBottomBackWallMaterial.name = "galleryBottomBackWallMaterial"; // ADDED

    const sideWallMaterial = new THREE.MeshStandardMaterial({ color: '#3d405b', side: THREE.DoubleSide });
    sideWallMaterial.name = "sideWallMaterial";

    const backWallMaterial = new THREE.MeshStandardMaterial({ color: '#f4f1de', side: THREE.DoubleSide });
    backWallMaterial.name = "backWallMaterial";

    const actualFrontWallMaterial = new THREE.MeshStandardMaterial({ color: '#f4f1de', side: THREE.DoubleSide });
    actualFrontWallMaterial.name = "actualFrontWallMaterial";

    const woodPlankFloorTexture = createWoodPlankTexture('#e07a5f', '#BF654C', 256, 256, 32, 2);
    const actualFloorMaterial = new THREE.MeshStandardMaterial({ 
        map: woodPlankFloorTexture, 
        side: THREE.DoubleSide,
        // color: 0xffffff, // Set to white if texture contains all color info, to avoid tinting
    });
    actualFloorMaterial.name = "actualFloorMaterial";

    const actualCeilingMaterial = new THREE.MeshStandardMaterial({ color: '#f4f1de', side: THREE.DoubleSide });
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

    gallery_top_back_wall = new THREE.Mesh(wallGeometry, galleryTopBackWallMaterial); // RENAMED from galleryBackWallMesh
    gallery_top_back_wall.name = "gallery_top_back_wall"; // RENAMED from galleryBackWallMesh
    roomGroup.add(gallery_top_back_wall); // RENAMED from galleryBackWallMesh

    gallery_bottom_back_wall = new THREE.Mesh(wallGeometry, galleryBottomBackWallMaterial); // ADDED
    gallery_bottom_back_wall.name = "gallery_bottom_back_wall"; // ADDED
    roomGroup.add(gallery_bottom_back_wall); // ADDED

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

    // Update Active Texture Offsets
    currentTextureOffsets = isMobile ? { ...mobileTextureOffsets } : { ...desktopTextureOffsets };
    console.log(`Active Texture Offsets:`, currentTextureOffsets);

    // Update Camera (aspect is already calculated)
    camera.fov = isMobile ? 90 : 60; // Changed from 90 : 75 (originally 80:60)
    camera.updateProjectionMatrix();

    const cameraZ = isMobile ? 1.8 : 2.5; // Bring camera closer in mobile
    const cameraY = isMobile ? 0 : 0; // Raise camera slightly in mobile view
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
            const galleryTopBackWall = roomGroup.getObjectByName("gallery_top_back_wall"); // RENAMED from galleryBackWall
            if (galleryTopBackWall && galleryTopBackWall.material.map === galleryTexture) { // RENAMED from galleryBackWall
                 galleryTopBackWall.material.map.repeat.set(1, 1); // RENAMED from galleryBackWall
                 galleryTopBackWall.material.map.offset.x = 0; // RENAMED from galleryBackWall
                 galleryTopBackWall.material.needsUpdate = true; // RENAMED from galleryBackWall
            }
            const galleryBottomBackWall = roomGroup.getObjectByName("gallery_bottom_back_wall"); // ADDED
            if (galleryBottomBackWall && galleryBottomBackWall.material.map === galleryTexture) { // ADDED
                 galleryBottomBackWall.material.map.repeat.set(1, 1); // ADDED
                 galleryBottomBackWall.material.map.offset.x = 0; // ADDED
                 galleryBottomBackWall.material.needsUpdate = true; // ADDED
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
    const galleryTopBackWallMesh = roomGroup.getObjectByName("gallery_top_back_wall"); // RENAMED from galleryBackWallMesh
    const galleryBottomBackWallMesh = roomGroup.getObjectByName("gallery_bottom_back_wall"); // ADDED
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
        galleryWallMesh.position.set(0, currentOffsets.wall, -wallDistance + insetAmount); // Center H/V, move slightly forward
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
    if (galleryTopBackWallMesh) { // RENAMED from galleryBackWallMesh
        galleryTopBackWallMesh.scale.set(targetWidth, targetHeight / 2, 1); // Scale to half height
        galleryTopBackWallMesh.position.set(0, currentOffsets.wall + targetHeight / 4, wallDistance - insetAmount); // Position in top half
        // Rotation for upside down texture is handled by texture.repeat.y = -1
    }
    if (galleryBottomBackWallMesh) { // ADDED
        galleryBottomBackWallMesh.scale.set(targetWidth, targetHeight / 2, 1); // Scale to half height
        galleryBottomBackWallMesh.position.set(0, currentOffsets.wall - targetHeight / 4, wallDistance - insetAmount); // Position in bottom half
        // Rotation for upside down texture is handled by texture.repeat.y = -1
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
    let targetAngle = roomGroup.rotation.y; // Default to current angle
    let newViewIndex = currentViewIndex;    // Initialize with current view index
    let performRotation = false;

    switch (event.key) {
        case 'ArrowLeft': // View wall to the left (room rotates right)
            newViewIndex = (currentViewIndex + 1) % targetAngles.length;
            targetAngle = targetAngles[newViewIndex];
            performRotation = true;
            break;
        case 'ArrowRight': // View wall to the right (room rotates left)
            newViewIndex = (currentViewIndex - 1 + targetAngles.length) % targetAngles.length;
            targetAngle = targetAngles[newViewIndex];
            performRotation = true;
            break;
        case 'p': // Export scene
        case 'P': // Export scene (case insensitive)
            exportRoomToGLTF();
            return; // Exit early, no rotation intended
        default:
            return; // Ignore other keys
    }

    // Proceed with rotation only if a valid key was pressed and view index changes
    if (performRotation && newViewIndex !== currentViewIndex) {
        console.log(`Keyboard navigation. Current: ${currentViewIndex}, New: ${newViewIndex}, Target Angle: ${targetAngle}`);
        rotateRoom(targetAngle);      // Rotate room immediately
        transitionLights(newViewIndex); // Transition lights without special delay pathway

        currentViewIndex = newViewIndex; // Update the current view index
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
    if (!isGalleryInteractionPaused) {
        baseScrollOffset = (baseScrollOffset - scrollAmount + 1) % 1; 
    }

    // Apply base scroll + fixed positional offset (from current active set) to each texture
    if (wallTexture) {
        wallTexture.offset.y = (baseScrollOffset + currentTextureOffsets.wall + 1) % 1;
    }
    if (floorTexture) {
        floorTexture.offset.y = (baseScrollOffset + currentTextureOffsets.floor + 1) % 1;
    }
    if (ceilingTexture) {
        ceilingTexture.offset.y = (baseScrollOffset + currentTextureOffsets.ceiling + 1) % 1;
    }
    if (topBackWallTexture) { // RENAMED from backWallTexture
        // The offset logic should be the same. The repeat.y = -1 handles the visual inversion.
        topBackWallTexture.offset.y = (baseScrollOffset + currentTextureOffsets.topBackWall + 1) % 1; // Use specific topBackWall offset
    }
    if (bottomBackWallTexture) { // ADDED
        // The offset logic should be the same. The repeat.y = -1 handles the visual inversion.
        bottomBackWallTexture.offset.y = (baseScrollOffset + currentTextureOffsets.bottomBackWall + 1) % 1; // Use specific bottomBackWall offset
    }

    TWEEN.update(); // IMPORTANT: Update TWEEN animations

    renderer.render(scene, camera);
}

// --- Whiteboard Popup Functions ---
function showWhiteboardPopup() {
    if (whiteboardPopup) {
        whiteboardPopup.style.display = 'flex';
        // Optionally, disable OrbitControls when popup is open
        // controls.enabled = false;
        console.log('[DEBUG] Whiteboard popup shown.');
    }
}

function hideWhiteboardPopup() {
    if (whiteboardPopup) {
        whiteboardPopup.style.display = 'none';
        // Optionally, re-enable OrbitControls when popup is closed
        // controls.enabled = true;
        console.log('[DEBUG] Whiteboard popup hidden.');
        // TODO: Add logic to apply canvas drawing to 3D model texture here
    }
}

// --- Mouse Wheel Handler for Gallery Scroll ---
function onDocumentWheel(event) {
    if (currentViewIndex === 0) { // Only scroll gallery if it's the active view
        event.preventDefault(); // Prevent default page scroll

        const scrollAmount = event.deltaY * wheelScrollSensitivity;
        baseScrollOffset = (baseScrollOffset + scrollAmount + 1) % 1; // Add scroll and ensure positive modulo

        // No need to set isGalleryInteractionPaused for discrete wheel events,
        // as animate() will pick up the new baseScrollOffset.
        // console.log(`Wheel scroll: ${scrollAmount}, new baseScrollOffset: ${baseScrollOffset}`);
    }
}

// --- Gallery Interaction Handlers ---
function onGalleryInteractionStart(event) {
    // Only interact if viewing the gallery (front view)
    if (currentViewIndex !== 0) return;

    // Determine clientX and clientY based on event type (mouse or touch)
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Define the objects to check for intersection (gallery elements)
    const galleryElements = [];
    if (gallery_wall) galleryElements.push(gallery_wall);
    if (gallery_floor) galleryElements.push(gallery_floor);
    if (gallery_ceiling) galleryElements.push(gallery_ceiling);
    // Note: gallery_top_back_wall and gallery_bottom_back_wall are part of the gallery view
    // but typically interaction for scrolling is on the main wall, floor, ceiling.
    // If they should also pause/initiate scroll, add them here.
    // Based on MEMORY[546df686-4220-4781-abb1-0ddd9af8de13], it's wall, floor, ceiling.

    if (galleryElements.length === 0) {
        // console.warn("Gallery elements for interaction not found or not yet initialized.");
        return;
    }

    const intersects = raycaster.intersectObjects(galleryElements, false); // false for non-recursive

    if (intersects.length > 0) {
        // An interactable gallery element was clicked/touched
        isGalleryInteractionPaused = true;
        // console.log("Gallery interaction START - scrolling PAUSED");

        if (event.touches) { // If it's a touch event
            lastTouchY = event.touches[0].clientY; // Store initial Y for drag calculation
            // console.log(`Touch start, lastTouchY: ${lastTouchY}`);
        }
        // For mousedown, isGalleryInteractionPaused is set, which stops auto-scroll.
        // Mouse wheel scrolling is handled by onDocumentWheel and doesn't rely on lastTouchY.
    }
    // The deskModel interaction logic has been removed from here and is correctly
    // handled in onDocumentMouseClick.
}

function onGalleryInteractionMove(event) {
    if (currentViewIndex !== 0 || !isGalleryInteractionPaused || !event.touches) return; // Only on gallery, if paused, and is a touch event

    event.preventDefault(); // Prevent page scrolling during drag

    const currentTouchY = event.touches[0].clientY;
    const deltaY = currentTouchY - lastTouchY;
    lastTouchY = currentTouchY; // Update last Y for next move

    const scrollAmount = deltaY * touchScrollSensitivity;
    baseScrollOffset = (baseScrollOffset - scrollAmount + 1) % 1; // Subtract because positive deltaY (downward drag) should scroll content up
    // console.log(`Touch drag: ${deltaY}, new baseScrollOffset: ${baseScrollOffset}`);
}

function onGalleryInteractionEnd(event) {
    if (isGalleryInteractionPaused) {
        isGalleryInteractionPaused = false;
        lastTouchY = 0; // Reset last touch Y
        // console.log("Gallery interaction END - scrolling resumed");
    }
}

// --- Light Transition Function ---
function transitionLights(viewIndex, targetAngle = null) { // targetAngle param is part of an older, currently inactive, delayed rotation logic
    // Lights are now static (set in init()) and do not transition their intensity.
    // This function is kept as it's part of the navigation flow (called by arrows/keys),
    // but its role in changing light intensities has been removed.

    // console.log(`transitionLights called for view ${viewIndex}. Lighting is static.`);
    // console.log(`Current static lighting: CeilingLight intensity: ${ceilingLight ? ceilingLight.intensity : 'N/A'}, SpotLight intensity: ${spotLight ? spotLight.intensity : 'N/A'}`);

    // Original checks for lights and gallery elements can be kept minimal or for future use,
    // but are not critical for the (now removed) light intensity transitions.
    if (!ceilingLight || !spotLight) {
        // console.error("Lights not initialized! This shouldn't happen if init() completed.");
        return;
    }
    if (!gallery_wall || !gallery_floor || !gallery_ceiling || 
        !gallery_top_back_wall || !gallery_bottom_back_wall) {
        // console.warn("Gallery elements might not be fully initialized if transitionLights is called very early.");
        // No critical operations depend on them here anymore regarding light transitions.
    }

    // All TWEEN animations for spotLight and ceilingLight intensity, 
    // and related logic like 'movingAwayFromGallery', have been removed.
}

// --- Room Rotation Function ---
function rotateRoom(targetAngle) { 
    if (!roomGroup) return; // Ensure roomGroup exists

    // Initialize userData if it doesn't exist
    if (!roomGroup.userData) {
        roomGroup.userData = {};
    }

    // Stop any ongoing rotation tweens for the roomGroup to prevent conflicts
    if (roomGroup.userData.activeTween) {
        roomGroup.userData.activeTween.stop();
        // TWEEN.remove(roomGroup.userData.activeTween); // Alternative to stop, depends on TWEEN version/preference
        delete roomGroup.userData.activeTween;
    }

    const currentRotation = { y: roomGroup.rotation.y };
    const targetRotation = { y: targetAngle };

    // Adjust target angle to be the shortest path
    const twoPi = Math.PI * 2;
    while (targetRotation.y - currentRotation.y > Math.PI) targetRotation.y -= twoPi;
    while (targetRotation.y - currentRotation.y < -Math.PI) targetRotation.y += twoPi;

    const tween = new TWEEN.Tween(currentRotation)
        .to(targetRotation, rotationDuration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
            roomGroup.rotation.y = currentRotation.y;
        })
        .onComplete(() => {
            // Clear the active tween reference upon completion
            if (roomGroup.userData && roomGroup.userData.activeTween === tween) {
                delete roomGroup.userData.activeTween;
            }
        })
        .onStop(() => {
            // Also clear if stopped (e.g., by starting a new one before completion)
            if (roomGroup.userData && roomGroup.userData.activeTween === tween) {
                delete roomGroup.userData.activeTween;
            }
        })
        .start();
    
    roomGroup.userData.activeTween = tween; // Store the reference to the new active tween

    tween.onComplete(() => {
        currentRotationY = targetAngle;
        updateControlsForView(currentRotationY);
        if (roomGroup.userData && roomGroup.userData.activeTween === tween) {
            delete roomGroup.userData.activeTween;
        }
    });
}

// --- GLTF Export Function ---
function exportRoomToGLTF() {
    if (!roomGroup) {
        console.error("Room group not found for export.");
        return;
    }

    const exporter = new GLTFExporter();
    const options = {
        binary: true, // Export as .glb
        trs: true, // Include translation, rotation, scale
        onlyVisible: true, // Export only visible objects
        embedImages: true // Embed textures if possible
    };

    exporter.parse(
        roomGroup, // The object to export
        function (gltf) {
            // gltf is ArrayBuffer if binary is true
            const blob = new Blob([gltf], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'room.glb';
            link.click();
            URL.revokeObjectURL(link.href); // Clean up
            console.log("Room exported as room.glb");
        },
        function (error) {
            console.error('An error happened during GLTF export:', error);
        },
        options
    );
}

// --- GLTF Import Function for Backwall Props ---
function loadBackwallPropsModel() {
    const loader = new GLTFLoader();

    // --- Setup DRACOLoader ---
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
    // ---

    const modelPath = '3d Models/backwall_props.glb'; // Path to the backwall props model

    loader.load(
        modelPath,
        function (gltf) {
            const loadedModel = gltf.scene;
            loadedModel.name = "backwall_props";
            
            backwallPropsModel = loadedModel;

            roomGroup.add(backwallPropsModel);
            console.log("Backwall Props model loaded and added to roomGroup from:", modelPath);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded of Backwall Props');
        },
        function (error) {
            console.error('An error happened during Backwall Props GLTF load:', error);
        }
    );
}

// --- GLTF Import Function for Left Wall Props ---
function loadLeftWallPropsModel() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    const modelPath = '3d Models/leftwall_props.glb';

    loader.load(
        modelPath,
        function (gltf) {
            leftWallPropsModel = gltf.scene;
            leftWallPropsModel.name = "leftwall_props";
            roomGroup.add(leftWallPropsModel);
            console.log("Left Wall Props model loaded and added to roomGroup from:", modelPath);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded of Left Wall Props');
        },
        function (error) {
            console.error('An error happened during Left Wall Props GLTF load:', error);
        }
    );
}

// --- GLTF Import Function for Whiteboard ---
function loadWhiteboardModel() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    const modelPath = '3d Models/whiteboard.glb';

    loader.load(
        modelPath,
        function (gltf) {
            whiteboardModel = gltf.scene;
            whiteboardModel.name = "whiteboard";
            roomGroup.add(whiteboardModel);
            console.log("Whiteboard model loaded and added to roomGroup from:", modelPath);

            // Traverse and log child names to identify the drawing surface
            console.log("Traversing whiteboardModel children:");
            whiteboardModel.traverse(function (child) {
                console.log(`- Child name: ${child.name}, type: ${child.type}`);
                if (child.isMesh) {
                    console.log(`  - Mesh material:`, child.material);
                }
            });
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded of Whiteboard');
        },
        function (error) {
            console.error('An error happened during Whiteboard GLTF load:', error);
        }
    );
}

// --- GLTF Import Function for Desk ---
function loadDeskModel() {
    const loader = new GLTFLoader();

    // --- Setup DRACOLoader ---
    const dracoLoader = new DRACOLoader();
    // Specify path to a folder containing WASM/JS decoding libraries for Draco.
    // You might need to adjust this path depending on where you host these files.
    // Using a common CDN path for Three.js examples:
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
    // ---

    const modelPath = '3d Models/pc.glb'; // Path to the PC desk model

    loader.load(
        modelPath,
        function (gltf) {
            // Called when the resource is loaded
            const loadedModel = gltf.scene; // gltf.scene is the THREE.Group
            loadedModel.name = "pc_desk"; // Important for identification
            
            deskModel = loadedModel; // Store globally for raycasting

            roomGroup.add(deskModel); // Changed from scene.add(deskModel)            
            console.log("PC Desk model loaded and added to roomGroup from:", modelPath);
        },
        function (xhr) {
            // Called while loading is progressing
            console.log((xhr.loaded / xhr.total * 100) + '% loaded of PC Desk');
        },
        function (error) {
            // Called when loading has errors
            console.error('An error happened while loading the PC Desk model:', error);
            console.error('Attempted to load from path:', modelPath);
        }
    );
}


function isDescendant(parent, child) {
    if (!parent || !child) return false;
    let node = child.parent;
    while (node !== null) {
        if (node === parent) {
            return true;
        }
        node = node.parent;
    }
    return false;
}
function onDocumentMouseClick(event) {
    event.preventDefault();
    console.log('[DEBUG] onDocumentMouseClick triggered.');

    if (isInspecting) {
        console.log('[DEBUG] Currently inspecting, click ignored.');
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // --- TEMPORARY: Check whiteboard interaction first for testing ---
    const allIntersects = raycaster.intersectObjects(scene.children, true); // Intersect all scene children
    console.log('[DEBUG] Raycaster (pre-view check) intersected objects:', allIntersects.length);

    let designatedSurfaceClickedAndPopupShown = false;
    console.log('[DEBUG] Checking intersected objects for whiteboard surface (toy_024001):');
    for (let i = 0; i < allIntersects.length; i++) {
        const intersect = allIntersects[i]; // Contains .object and .distance
        const clickedObject = intersect.object;
        
        console.log(`  - Intersected: ${clickedObject.name} (UUID: ${clickedObject.uuid}, distance: ${intersect.distance.toFixed(3)})`);

        if (isDescendant(whiteboardModel, clickedObject)) {
            console.log(`    ↳ Is descendant of whiteboardModel.`);
            if (clickedObject.name === 'toy_024001') {
                console.log('[DEBUG] SUCCESS: Clicked on designated whiteboard drawing surface (toy_024001). Opening popup.');
                showWhiteboardPopup();
                designatedSurfaceClickedAndPopupShown = true;
                return; // Interaction handled
            } else {
                console.log(`    ↳ Is part of whiteboardModel, but not 'toy_024001'.`);
            }
        } else {
            // console.log(`    ↳ Not a descendant of whiteboardModel.`); // Optional: uncomment for more verbosity
        }
    }

    if (!designatedSurfaceClickedAndPopupShown) {
        let anyWhiteboardPartHit = false;
        for (const intersect of allIntersects) {
            if (isDescendant(whiteboardModel, intersect.object)) {
                anyWhiteboardPartHit = true;
                break;
            }
        }

        if (anyWhiteboardPartHit) {
             console.log('[DEBUG] Click intersected with whiteboardModel, but not the specific "toy_024001" surface, or "toy_024001" was occluded by another part of whiteboardModel that was closer to the camera.');
        } else if (allIntersects.length > 0) {
            console.log('[DEBUG] Click intersected with scene objects, but not any part of whiteboardModel.');
        } else {
             console.log('[DEBUG] No intersection with any scene objects (pre-view check was misleading, or scene.children was empty for raycast).');
        }
    }
    // --- END TEMPORARY ---

    if (currentViewIndex !== 2) {
        console.log('[DEBUG] Interaction attempt outside back wall view. currentViewIndex:', currentViewIndex);
        return;
    }
    console.log('[DEBUG] Back wall view active (currentViewIndex === 2).');

    const intersects = raycaster.intersectObjects(scene.children, true);
    console.log('[DEBUG] Raycaster intersected objects:', intersects.length);

    if (intersects.length > 0) {
        console.log('[DEBUG] --- Iterating intersects for inspection ---');
        for (let i = 0; i < intersects.length; i++) {
            const clickedObject = intersects[i].object;
            console.log(`[DEBUG] Intersected [${i}]: ${clickedObject.name}`, clickedObject);

            const isInspectableName = inspectableMeshNames.includes(clickedObject.name);
            const isChildOfBackwallProps = backwallPropsModel ? isDescendant(backwallPropsModel, clickedObject) : false;
            
            console.log(`[DEBUG]   - backwallPropsModel exists: ${!!backwallPropsModel}`);
            console.log(`[DEBUG]   - Is inspectable name ('${clickedObject.name}' in [${inspectableMeshNames.join(', ')}]): ${isInspectableName}`);
            console.log(`[DEBUG]   - Is descendant of backwallPropsModel: ${isChildOfBackwallProps}`);

            if (backwallPropsModel && isInspectableName && isChildOfBackwallProps) {
                console.log('[DEBUG] SUCCESS: Inspectable trigger mesh clicked:', clickedObject.name);
                const partnerMeshName = inspectableMeshPairs[clickedObject.name];
                if (!partnerMeshName) {
                    console.error('[DEBUG] Partner mesh name not found for trigger:', clickedObject.name);
                    return;
                }
                console.log('[DEBUG] Partner mesh to find:', partnerMeshName);
                enterInspectMode(clickedObject, partnerMeshName);
                return; 
            }
        }
        console.log('[DEBUG] --- Finished iterating intersects for inspection ---');

        console.log('[DEBUG] No inspectable photo clicked, checking for desk model interaction.');
        if (deskModel) {
            console.log('[DEBUG] deskModel exists. Checking intersection with deskModel.');
            const deskIntersects = raycaster.intersectObject(deskModel, true);
            if (deskIntersects.length > 0) {
                const clickedDeskObject = deskIntersects[0].object;
                console.log('[DEBUG] Intersected with deskModel child:', clickedDeskObject.name);
                if (isDescendant(deskModel, clickedDeskObject)) {
                    console.log('[DEBUG] SUCCESS: PC Desk (or part of it) clicked! Name:', clickedDeskObject.name);
                    if (tamagotchiPopup.style.display === 'none' || tamagotchiPopup.style.display === '') {
                        tamagotchiPopup.style.display = 'flex';
                        initTamagotchiGame();
                        console.log('[DEBUG] Tamagotchi popup shown.');
                    } else {
                        console.log('[DEBUG] Tamagotchi popup already visible (closing handled by game).');
                    }
                    return; 
                } else {
                    console.log('[DEBUG] Intersected object is not a descendant of deskModel (should not happen with intersectObject).');
                }
            } else {
                console.log('[DEBUG] No intersection with deskModel.');
            }
        } else {
            console.log('[DEBUG] deskModel does not exist.');
        }

        // Note: Whiteboard interaction is now checked BEFORE the view index check for testing.
        // If it needs to be view-specific, this older block can be reinstated or modified.

    } else {
        console.log('[DEBUG] No intersections with any scene objects.');
    }
    console.log('[DEBUG] onDocumentMouseClick finished without triggering inspection or Tamagotchi.');
}


// --- Inspect Mode Functions ---
function enterInspectMode(clickedMesh, partnerMeshName) {
    if (!clickedMesh || !partnerMeshName) {
        console.error('[DEBUG] enterInspectMode called with missing clickedMesh or partnerMeshName.');
        return;
    }
    isInspecting = true;

    // Save current camera and controls state
    originalCameraPosition.copy(camera.position);
    originalControlsTarget.copy(controls.target);

    // Reset hidden mesh trackers
    hiddenOriginalClickedMesh = null;
    hiddenOriginalPartnerMesh = null;

    // Clone the clicked mesh FIRST (while it's still visible)
    const clonedClickedMesh = clickedMesh.clone();
    clonedClickedMesh.traverse(child => {
        if (child.isMesh) child.material = child.material.clone();
    });

    // THEN Hide the original clicked mesh from the scene
    if (clickedMesh) {
        clickedMesh.visible = false;
        hiddenOriginalClickedMesh = clickedMesh;
        console.log('[DEBUG] Hid original clicked mesh:', clickedMesh.name);
    }
    // if (tamagotchiPopup) tamagotchiPopup.style.display = 'none'; // Optionally hide popup if it obstructs view, user can decide later.

    inspectedObjectGroup = new THREE.Group();
    inspectedObjectGroup.add(clonedClickedMesh); // Add cloned clicked mesh first

    // Find and clone the partner mesh
    let clonedPartnerMesh = null;
    if (backwallPropsModel) {
        const partnerMeshObject = backwallPropsModel.getObjectByName(partnerMeshName);
        if (partnerMeshObject) {
            console.log('[DEBUG] Found partner mesh object:', partnerMeshObject.name);
            clonedPartnerMesh = partnerMeshObject.clone();
            clonedPartnerMesh.traverse(child => {
                if (child.isMesh) child.material = child.material.clone();
            });
            inspectedObjectGroup.add(clonedPartnerMesh);
            console.log('[DEBUG] Cloned and added partner mesh to group:', clonedPartnerMesh.name);

            // Hide the original partner mesh from the scene
            partnerMeshObject.visible = false;
            hiddenOriginalPartnerMesh = partnerMeshObject;
            console.log('[DEBUG] Hid original partner mesh:', partnerMeshObject.name);
        } else {
            console.error('[DEBUG] Partner mesh object not found in backwallPropsModel:', partnerMeshName);
            // Decide if you want to proceed with only the clicked mesh or exit
            // For now, we'll proceed with just the clicked one if partner is missing
        }
    } else {
        console.error('[DEBUG] backwallPropsModel not found, cannot search for partner mesh.');
    }

    // Center the entire group (containing one or two meshes)
    // The group's origin will be the center of the bounding box of all its children
    const groupBox = new THREE.Box3().setFromObject(inspectedObjectGroup);
    const groupCenter = groupBox.getCenter(new THREE.Vector3());
    
    // Offset each child so the group's collective center is at the world origin
    // This is slightly different from before; we want the group itself to be centered.
    // An alternative is to move the group itself: inspectedObjectGroup.position.sub(groupCenter);
    // For now, let's adjust children relative to the group's new desired center (0,0,0)
    // by effectively moving the group's contents so their collective center aligns with the group's origin.
    inspectedObjectGroup.children.forEach(child => {
        child.position.sub(groupCenter);
    });
    // NOTE: Diagnostic code for offsetting and material changes has been removed.

    // If we decide to move the group instead: inspectedObjectGroup.position.set(0,0,0).sub(groupCenter) - but then camera needs to target group's new position.
    // For simplicity with OrbitControls targeting (0,0,0), let's ensure the group's content is centered around its origin.
    // The above loop does this. The group itself remains at (0,0,0).

    // Add dedicated lighting to the inspected group
    const inspectAmbientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft white light
    inspectedObjectGroup.add(inspectAmbientLight);

    const inspectDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Brighter directional light
    inspectDirectionalLight.position.set(1, 1.5, 1).normalize(); // Shining from a top-front-right-ish angle
    inspectedObjectGroup.add(inspectDirectionalLight);
    // DirectionalLight targets (0,0,0) by default in its own coordinate system.
    // Since it's a child of inspectedObjectGroup, and group is at origin, this works well.

    scene.add(inspectedObjectGroup);

    // Configure OrbitControls for inspection
    controls.enabled = true;
    controls.target.set(0, 0, 0); // Target the center of the inspectedObjectGroup
    controls.enablePan = false;
    controls.enableZoom = false; // Disable OrbitControls zoom
    controls.enableRotate = false; // Disable OrbitControls rotation
    controls.autoRotate = false; // Turn off auto-rotate if it was on

    // Add event listeners for manual model rotation (mouse and touch)
    renderer.domElement.addEventListener('mousedown', onInspectModelDragStart, false);
    renderer.domElement.addEventListener('mousemove', onInspectModelDragMove, false);
    renderer.domElement.addEventListener('mouseup', onInspectModelDragEnd, false);
    renderer.domElement.addEventListener('mouseleave', onInspectModelDragEnd, false); // Also stop drag if mouse leaves canvas
    renderer.domElement.addEventListener('touchstart', onInspectModelDragStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', onInspectModelDragMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onInspectModelDragEnd, false);

    // Adjust camera for optimal view
    const size = groupBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.tan(fov / 2)); // Calculate distance for full view
    cameraZ *= 1.5; // Add some padding, adjust as needed

    camera.position.set(0, 0, Math.max(cameraZ, 0.5)); // Ensure cameraZ is not too small
    controls.minDistance = maxDim * 0.5; // Allow zooming in close
    controls.maxDistance = cameraZ * 3;   // Allow zooming out
    
    controls.update();
    camera.lookAt(0,0,0);

    createInspectModeExitButton();
    window.addEventListener('keydown', handleInspectEscapeKey);

    // Hide navigation arrows
    const arrowLeft = document.getElementById('arrow-left');
    const arrowRight = document.getElementById('arrow-right');
    if (arrowLeft) arrowLeft.style.display = 'none';
    if (arrowRight) arrowRight.style.display = 'none';
}

function exitInspectMode() {
    isInspecting = false;

    removeInspectModeExitButton();
    window.removeEventListener('keydown', handleInspectEscapeKey);

    if (inspectedObjectGroup) {
        inspectedObjectGroup.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        scene.remove(inspectedObjectGroup);
        inspectedObjectGroup = null;
    }

    // Restore visibility of the original meshes that were hidden
    if (hiddenOriginalClickedMesh) {
        hiddenOriginalClickedMesh.visible = true;
        console.log('[DEBUG] Restored visibility of original clicked mesh:', hiddenOriginalClickedMesh.name);
        hiddenOriginalClickedMesh = null;
    }
    if (hiddenOriginalPartnerMesh) {
        hiddenOriginalPartnerMesh.visible = true;
        console.log('[DEBUG] Restored visibility of original partner mesh:', hiddenOriginalPartnerMesh.name);
        hiddenOriginalPartnerMesh = null;
    } // <-- ADDED MISSING BRACE HERE

    // Restore camera and controls
    camera.position.copy(originalCameraPosition);
    controls.target.copy(originalControlsTarget);
    controls.enabled = false; // Keep controls disabled after exiting inspect mode
    updateControlsForView(currentRotationY); // Update controls based on the current view angle
    controls.enableZoom = true; // Re-enable OrbitControls zoom
    controls.enableRotate = true; // Re-enable OrbitControls rotation
    controls.update();

    // Remove event listeners for model rotation
    renderer.domElement.removeEventListener('mousedown', onInspectModelDragStart, false);
    renderer.domElement.removeEventListener('mousemove', onInspectModelDragMove, false);
    renderer.domElement.removeEventListener('mouseup', onInspectModelDragEnd, false);
    renderer.domElement.removeEventListener('mouseleave', onInspectModelDragEnd, false);
    renderer.domElement.removeEventListener('touchstart', onInspectModelDragStart, { passive: false });
    renderer.domElement.removeEventListener('touchmove', onInspectModelDragMove, { passive: false });
    renderer.domElement.removeEventListener('touchend', onInspectModelDragEnd, false);

    isInspectingModelDrag = false;

    // Show navigation arrows
    const arrowLeft = document.getElementById('arrow-left');
    const arrowRight = document.getElementById('arrow-right');
    if (arrowLeft) arrowLeft.style.display = 'block'; // Or 'flex', or original display type
    if (arrowRight) arrowRight.style.display = 'block'; // Or 'flex', or original display type
}

function createInspectModeExitButton() {
    removeInspectModeExitButton(); // Remove if one already exists
    const button = document.createElement('button');
    button.id = 'inspect-exit-button';
    button.textContent = 'Exit Inspect (Esc)';
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.right = '20px';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#333';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '10000'; // Ensure it's on top
    button.onclick = exitInspectMode;
    document.body.appendChild(button);
}

function removeInspectModeExitButton() {
    const button = document.getElementById('inspect-exit-button');
    if (button) {
        button.remove();
    }
}

function handleInspectEscapeKey(event) {
    if (event.key === 'Escape') {
        exitInspectMode();
    }
}

function onInspectModelDragStart(event) {
    if (!isInspecting) return;
    // Prevent default browser actions, like scrolling, on touch devices
    if (event.touches) {
        event.preventDefault();
    }
    isInspectingModelDrag = true;

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    previousInspectMousePosition = {
        x: clientX,
        y: clientY
    };
}

function onInspectModelDragMove(event) {
    if (!isInspecting || !isInspectingModelDrag || !inspectedObjectGroup) return;
    
    // Prevent default browser actions
    if (event.touches) {
        event.preventDefault();
    }

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const deltaMove = {
        x: clientX - previousInspectMousePosition.x,
        y: clientY - previousInspectMousePosition.y
    };

    const rotationSpeed = 0.005;

    const deltaRotationQuaternion = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(
            deltaMove.y * rotationSpeed,
            deltaMove.x * rotationSpeed,
            0,
            'XYZ'
        ));

    inspectedObjectGroup.quaternion.multiplyQuaternions(deltaRotationQuaternion, inspectedObjectGroup.quaternion);

    previousInspectMousePosition = {
        x: clientX,
        y: clientY
    };
}

function onInspectModelDragEnd(event) {
    isInspectingModelDrag = false;
}

// --- End Inspect Mode Functions ---

// --- Start ---
init();
animate();
