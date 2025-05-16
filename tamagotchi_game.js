// tamagotchi_game.js

// Game state variables
let selectedAnimal = null;
let selectedSize = null;
let animalName = null;

// DOM Elements for the Tamagotchi game
let tamagotchiContainer, tamagotchiContent, closeButtonTamagotchi;
let animalSelectionScreen, sizeSelectionScreen, nameInputScreen, tamagotchiMainScreen, bookingOptionsScreen;
let petArea, petImageElem;

// --- SCREEN NAVIGATION ---
function showScreen(screenId) {
    // Hide all screens first
    [animalSelectionScreen, sizeSelectionScreen, nameInputScreen, tamagotchiMainScreen, bookingOptionsScreen].forEach(screen => {
        if (screen) screen.style.display = 'none';
    });

    // Show the target screen
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.style.display = 'flex'; // Using flex as defined in CSS
    } else {
        console.error(`Screen with ID ${screenId} not found.`);
    }
}

// --- INITIALIZATION ---
export function initTamagotchiGame() {
    console.log("Initializing Tamagotchi Game...");

    tamagotchiContainer = document.getElementById('tamagotchi-container');
    tamagotchiContent = tamagotchiContainer.querySelector('.tamagotchi-content'); // Assuming this structure will be added
    closeButtonTamagotchi = tamagotchiContainer.querySelector('.popup-close-tamagotchi');

    animalSelectionScreen = document.getElementById('animal-selection-screen');
    sizeSelectionScreen = document.getElementById('size-selection-screen');
    nameInputScreen = document.getElementById('name-input-screen');
    tamagotchiMainScreen = document.getElementById('tamagotchi-main-screen');
    bookingOptionsScreen = document.getElementById('booking-options-screen');
    petArea = document.getElementById('pet-area');
    petImageElem = document.getElementById('pet-image');

    if (!tamagotchiContainer || !closeButtonTamagotchi || !tamagotchiContent) {
        console.error("Tamagotchi popup elements not found in the DOM. Check IDs and structure in index.html");
        return;
    }

    // Event listener for the new close button
    closeButtonTamagotchi.addEventListener('click', () => {
        tamagotchiContainer.style.display = 'none';
        resetTamagotchiGame(); // Reset game state when closed
    });

    setupEventListeners();
    showScreen('animal-selection-screen'); // Start with animal selection
}

function resetTamagotchiGame() {
    selectedAnimal = null;
    selectedSize = null;
    animalName = null;
    if (document.getElementById('animal-name-input')) {
      document.getElementById('animal-name-input').value = '';
    }
    // Potentially clear pet image, etc.
    if(petImageElem) petImageElem.src = '';
    console.log("Tamagotchi game reset.");
    showScreen('animal-selection-screen'); // Go back to the first screen
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // Animal Selection
    document.querySelectorAll('.animal-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            selectedAnimal = e.currentTarget.dataset.animal;
            console.log("Animal selected:", selectedAnimal);
            // Update pet image on main screen early if possible, or store path
            if (petImageElem) {
                 // User needs to provide these paths
                const animalImages = {
                    dog: 'assets/dog.png',
                    cat: 'assets/cat.png',
                    rabbit: 'assets/rabbit.png',
                    bird: 'assets/bird.png',
                    fish: 'assets/fish.png',
                    other: 'assets/other.png' 
                };
                petImageElem.src = animalImages[selectedAnimal] || 'assets/default.png'; 
            }
            showScreen('size-selection-screen');
        });
    });

    // Size Selection
    document.querySelectorAll('.size-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            selectedSize = e.currentTarget.dataset.size;
            console.log("Size selected:", selectedSize);
            showScreen('name-input-screen');
        });
    });

    // Name Input
    const submitNameButton = document.getElementById('submit-name-btn');
    const animalNameInput = document.getElementById('animal-name-input');
    if (submitNameButton && animalNameInput) {
        submitNameButton.addEventListener('click', () => {
            animalName = animalNameInput.value.trim();
            if (animalName) {
                console.log("Animal name:", animalName);
                document.getElementById('pet-name-display').textContent = animalName;
                showScreen('tamagotchi-main-screen');
            } else {
                alert("Please enter a name for your pet!");
            }
        });
    }

    // Tamagotchi Main Screen Actions
    const restartButton = document.getElementById('restart-tamagotchi-btn');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            resetTamagotchiGame();
            showScreen('animal-selection-screen');
        });
    }

    const bookSessionButton = document.getElementById('book-session-btn');
    if (bookSessionButton) {
        bookSessionButton.addEventListener('click', () => {
            showScreen('booking-options-screen');
        });
    }
    
    // Petting action
    if (petArea) {
        petArea.addEventListener('click', () => {
            console.log("Petting animal...");
            showHeartAnimation();
        });
    }

    // Booking Options
    document.querySelectorAll('.select-package-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const selectedPackage = e.currentTarget.dataset.package;
            console.log("Package selected:", selectedPackage);
            handleBooking(selectedPackage);
        });
    });

     // Back buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetScreen = e.currentTarget.dataset.targetScreen;
            if (targetScreen) {
                showScreen(targetScreen);
            }
        });
    });
}

function showHeartAnimation() {
    if (!tamagotchiContent) return;

    const heart = document.createElement('div');
    heart.classList.add('heart');
    heart.innerHTML = '&hearts;'; // or use an image
    
    // Position heart near the pet area or mouse click
    // This is a simple version, could be more sophisticated
    const petAreaRect = petArea.getBoundingClientRect();
    const containerRect = tamagotchiContainer.getBoundingClientRect(); // Game container rect

    heart.style.left = (petAreaRect.left - containerRect.left + petAreaRect.width / 2) + 'px';
    heart.style.top = (petAreaRect.top - containerRect.top + petAreaRect.height / 2 - 20) + 'px'; // Start slightly above center

tamagotchiContent.appendChild(heart); // Append to tamagotchiContent for correct positioning relative to it

    // Remove heart after animation
    heart.addEventListener('animationend', () => {
        heart.remove();
    });
}


// --- BOOKING LOGIC (Placeholder) ---
function handleBooking(packageName) {
    // Information to consolidate
    const bookingDetails = {
        animalType: selectedAnimal,
        animalSize: selectedSize,
        animalName: animalName,
        package: packageName,
        timestamp: new Date().toLocaleString()
    };

    console.log("Booking Details:", bookingDetails);
    alert(`Booking for ${animalName} (${packageName}) requested!\nCheck console for details.`);

    // 1. Generate JPG (Complex - will require a library like html2canvas or server-side generation)
    generateBookingImage(bookingDetails);

    // 2. Send to email/WhatsApp (Complex - requires backend/server-side logic and APIs)
    // sendBookingRequest(bookingDetails); // Placeholder for actual sending function
}

function generateBookingImage(details) {
    console.log("Generating JPG with details:", details);
    // This is where you'd use a library like html2canvas.
    // For now, we'll just log it.
    // Example with html2canvas (requires including the library):
    /*
    const elementToCapture = document.createElement('div');
    elementToCapture.style.width = '400px';
    elementToCapture.style.padding = '20px';
    elementToCapture.style.backgroundColor = 'white';
    elementToCapture.style.border = '1px solid black';
    elementToCapture.innerHTML = `
        <h2>Booking Confirmation</h2>
        <p><strong>Pet:</strong> ${details.animalName} (${details.animalType}, ${details.animalSize})</p>
        <p><strong>Package:</strong> ${details.package}</p>
        <p><strong>Date:</strong> ${details.timestamp}</p>
        <hr>
        <p>Thank you for booking with Pawfect!</p>
    `;
    document.body.appendChild(elementToCapture); // Temporarily append to capture

    html2canvas(elementToCapture).then(canvas => {
        const image = canvas.toDataURL('image/jpeg', 0.9);
        // Now you have the image as a base64 string
        // You can display it, or send it to a server
        console.log("Generated JPG (base64):", image.substring(0,100) + "...");
        
        // Example: trigger download
        const link = document.createElement('a');
        link.download = `${details.animalName}_booking.jpg`;
        link.href = image;
        link.click();

        document.body.removeChild(elementToCapture); // Clean up
    }).catch(err => {
        console.error("Error generating JPG:", err);
        document.body.removeChild(elementToCapture); // Clean up
    });
    */
    alert("JPG generation is a placeholder. See console for details.");
}

// Make initTamagotchiGame available globally if not using modules extensively elsewhere
// Or, ensure main.js calls it correctly if main.js is a module.
// window.initTamagotchiGame = initTamagotchiGame; // If not using ES6 modules for main.js interaction

// Note: For actual image paths (dog.png, cat.png etc.), ensure these files exist in an 'assets' folder (or similar) in your project root.
