import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let wallWidth, wallHeight, wallDistance, floorSize;

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
    const frontWallMaterial = new THREE.MeshStandardMaterial({ color: '#f0f0f0', side: THREE.DoubleSide }); // Simple front wall for now
    const sideWallMaterial = new THREE.MeshStandardMaterial({ color: '#e0e0e0', side: THREE.DoubleSide });
    const backWallMaterial = new THREE.MeshStandardMaterial({ color: '#d0d0d0', side: THREE.DoubleSide });
    const floorCeilingMaterial = new THREE.MeshStandardMaterial({ color: '#c0c0c0', side: THREE.DoubleSide });

    // Create Meshes (will be positioned/scaled in updateDimensionsAndOffsets)
    const frontWall = new THREE.Mesh(wallGeometry, frontWallMaterial);
    frontWall.name = "frontWall";
    roomGroup.add(frontWall);

    const rightWall = new THREE.Mesh(wallGeometry, sideWallMaterial);
    rightWall.name = "rightWall";
    roomGroup.add(rightWall);

    const leftWall = new THREE.Mesh(wallGeometry, sideWallMaterial);
    leftWall.name = "leftWall";
    roomGroup.add(leftWall);

    const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
    backWall.name = "backWall";
    roomGroup.add(backWall);

    const floor = new THREE.Mesh(floorCeilingGeometry, floorCeilingMaterial);
    floor.name = "floor";
    roomGroup.add(floor);

    const ceiling = new THREE.Mesh(floorCeilingGeometry, floorCeilingMaterial);
    ceiling.name = "ceiling";
    roomGroup.add(ceiling);
}

function updateDimensionsAndOffsets() {
    const aspect = window.innerWidth / window.innerHeight;
    const isMobile = aspect < 1;

    // Update Dimensions based on aspect ratio
    wallWidth = isMobile ? 4 : 6;
    wallHeight = isMobile ? 6 : 4;
    wallDistance = isMobile ? 2 : 3;
    floorSize = [wallWidth * 1.5, wallWidth * 1.5];

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

    // Update Geometry Positions and Scales
    const roomGroup = scene.children.find(child => child instanceof THREE.Group);
    if (!roomGroup) return;

    const frontWall = roomGroup.getObjectByName("frontWall");
    if (frontWall) {
        frontWall.scale.set(wallWidth, wallHeight, 1);
        frontWall.position.set(0, 0, -wallDistance);
        frontWall.rotation.set(0, 0, 0);
        // Apply wall offset if needed, e.g., to z-position
        // frontWall.position.z = -wallDistance + currentOffsets.wall;
    }

    const rightWall = roomGroup.getObjectByName("rightWall");
     if (rightWall) {
        rightWall.scale.set(wallWidth, wallHeight, 1);
        rightWall.position.set(wallDistance, 0, 0);
        rightWall.rotation.set(0, -Math.PI / 2, 0);
    }

    const leftWall = roomGroup.getObjectByName("leftWall");
     if (leftWall) {
        leftWall.scale.set(wallWidth, wallHeight, 1);
        leftWall.position.set(-wallDistance, 0, 0);
        leftWall.rotation.set(0, Math.PI / 2, 0);
    }

     const backWall = roomGroup.getObjectByName("backWall");
     if (backWall) {
        backWall.scale.set(wallWidth, wallHeight, 1);
        backWall.position.set(0, 0, wallDistance);
        backWall.rotation.set(0, Math.PI, 0);
    }

    const floor = roomGroup.getObjectByName("floor");
    if (floor) {
        floor.scale.set(floorSize[0], floorSize[1], 1);
        // Adjust position based on potentially modified floor offset
        floor.position.set(0, -wallHeight / 2 + currentOffsets.floor, 0);
        floor.rotation.set(-Math.PI / 2, 0, 0);
    }

    const ceiling = roomGroup.getObjectByName("ceiling");
     if (ceiling) {
        ceiling.scale.set(floorSize[0], floorSize[1], 1);
         // Adjust position based on potentially modified ceiling offset
        ceiling.position.set(0, wallHeight / 2 + currentOffsets.ceiling, 0); // Offset applied here
        ceiling.rotation.set(Math.PI / 2, 0, 0);
    }

     console.log("Geometry updated based on viewport and initial offsets");

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
function updateGeometryPositionsWithOffsets() {
     const roomGroup = scene.children.find(child => child instanceof THREE.Group);
     if (!roomGroup) return;

     const floor = roomGroup.getObjectByName("floor");
     if (floor) {
         floor.position.y = -wallHeight / 2 + currentOffsets.floor;
     }

     const ceiling = roomGroup.getObjectByName("ceiling");
      if (ceiling) {
         ceiling.position.y = wallHeight / 2 + currentOffsets.ceiling;
     }

     const frontWall = roomGroup.getObjectByName("frontWall");
     if (frontWall) {
         // Apply wall offset if needed, e.g., to z-position
         // frontWall.position.z = -wallDistance + currentOffsets.wall;
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
    controls.update(); // Only required if damping or auto-rotation is enabled
    renderer.render(scene, camera);
}

// --- Start ---
init();
animate();
