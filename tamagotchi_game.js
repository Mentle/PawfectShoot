// tamagotchi_game.js

// Game state variables
let selectedAnimal = null;
let selectedSize = null;
let animalName = null; // This should store the pet's name after input
let selectedPackageInfo = null; // To store details of the chosen package

// Photographer Contact Information (Placeholders)
const PHOTOGRAPHER_EMAIL = 'handsjuan@gmail.com'; // Replace with actual email
const PHOTOGRAPHER_WHATSAPP_NUMBER = '34654919320'; // Replace with actual number (include country code, no '+', spaces, or dashes)

// DOM Elements for the Tamagotchi game
let tamagotchiContainer, tamagotchiContent, closeButtonTamagotchi;
let animalSelectionScreen, sizeSelectionScreen, nameInputScreen, tamagotchiMainScreen, bookingOptionsScreen, miniGameScreen, bookingSummaryScreen; // Added bookingSummaryScreen
let petArea, petImageElem;

// Elements for main Tamagotchi screen interactions
let petImage, petNameDisplay, petFeedbackIcon, feedPetBtn, playPetBtn, carePetBtn, restartTamagotchiBtn, bookSessionBtn;

// Mini-Game elements
let miniGameCanvas, miniGameCtx;
let player, gameConstants, animationFrameId;
let obstacles = [];
let obstacleSpawnTimer = 0;
let score = 0;
let isGameOver = false;

// Variables for dynamic difficulty
let currentObstacleSpeed;
let currentObstacleSpawnInterval;

// --- SCREEN NAVIGATION ---
function showScreen(screenId) {
    // Hide all screens first
    [animalSelectionScreen, sizeSelectionScreen, nameInputScreen, tamagotchiMainScreen, bookingOptionsScreen, miniGameScreen, bookingSummaryScreen].forEach(screen => {
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
    miniGameScreen = document.getElementById('mini-game-screen'); // New screen
    bookingSummaryScreen = document.getElementById('booking-summary-screen'); // New screen
    petArea = document.getElementById('pet-area');
    petImageElem = document.getElementById('pet-image');

    petImage = document.getElementById('pet-image');
    petNameDisplay = document.getElementById('pet-name-display');
    petFeedbackIcon = document.getElementById('pet-feedback-icon');
    feedPetBtn = document.getElementById('feed-pet-btn');
    playPetBtn = document.getElementById('play-pet-btn');
    carePetBtn = document.getElementById('care-pet-btn');
    restartTamagotchiBtn = document.getElementById('restart-tamagotchi-btn');
    bookSessionBtn = document.getElementById('book-session-btn');

    miniGameCanvas = document.getElementById('mini-game-canvas');

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
    selectedPackageInfo = null;
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

            // Define animalImages here so it's in scope for basePath
            const animalImages = {
                dog: 'tamagotchi/dog.png',
                cat: 'tamagotchi/cat.png',
                rabbit: 'tamagotchi/rabbit.png',
                bird: 'tamagotchi/bird.png'
            };

            // Update pet image on main screen early if possible, or store path
            if (petImageElem) {
                petImageElem.src = animalImages[selectedAnimal] || 'tamagotchi/default_pet.png';
            }

            // Update images and text on the size selection screen
            const basePath = animalImages[selectedAnimal] || 'tamagotchi/default_pet.png';
            document.getElementById('size-img-small').src = basePath;
            document.getElementById('size-img-medium').src = basePath;
            document.getElementById('size-img-large').src = basePath;

            const chosenAnimalNameSpan = document.getElementById('chosen-animal-name-size-screen');
            if (chosenAnimalNameSpan) {
                chosenAnimalNameSpan.textContent = selectedAnimal.charAt(0).toUpperCase() + selectedAnimal.slice(1);
            }

            // Reset previous size selection and disable Next button
            selectedSize = null; 
            document.querySelectorAll('.size-option.selected').forEach(sel => sel.classList.remove('selected'));
            const confirmSizeBtn = document.getElementById('confirm-size-btn');
            if(confirmSizeBtn) confirmSizeBtn.disabled = true;

            showScreen('size-selection-screen');
        });
    });

    // Size Selection
    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.size-option.selected').forEach(sel => sel.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            selectedSize = e.currentTarget.dataset.size;
            console.log("Size selected:", selectedSize);
            // Enable the Next button
            const confirmSizeBtn = document.getElementById('confirm-size-btn');
            if(confirmSizeBtn) confirmSizeBtn.disabled = false;
        });
    });

    const confirmSizeButton = document.getElementById('confirm-size-btn');
    if (confirmSizeButton) {
        confirmSizeButton.disabled = true; // Initially disabled
        confirmSizeButton.addEventListener('click', () => {
            if (selectedSize) {
                showScreen('name-input-screen');
            } else {
                // This case should ideally not be reached if button is properly managed
                alert("Please select a size for your pet!"); 
            }
        });
    }

    const backToAnimalSelectionButton = document.getElementById('back-to-animal-selection-btn');
    if (backToAnimalSelectionButton) {
        backToAnimalSelectionButton.addEventListener('click', () => {
            showScreen('animal-selection-screen');
        });
    }

    // Name Input
    const submitNameButton = document.getElementById('submit-name-btn');
    const animalNameInput = document.getElementById('animal-name-input');
    if (submitNameButton && animalNameInput) {
        submitNameButton.addEventListener('click', () => {
            animalName = animalNameInput.value.trim();
            if (animalName) {
                console.log("Animal name:", animalName);
                petNameDisplay.textContent = animalName;
                showScreen('tamagotchi-main-screen');
            } else {
                alert("Please enter a name for your pet!");
            }
        });
    }

    // --- New Tamagotchi Interactions ---
    function displayFeedback(iconEmoji, duration = 1000) {
        petFeedbackIcon.textContent = iconEmoji;
        petFeedbackIcon.style.opacity = '1';
        petFeedbackIcon.style.transform = 'translate(-50%, -50%) scale(1.2)'; // Slight zoom effect

        setTimeout(() => {
            petFeedbackIcon.style.opacity = '0';
            petFeedbackIcon.style.transform = 'translate(-50%, -50%) scale(1)';
        }, duration);
    }

    function animatePet(animationClass = 'pet-play-animation', duration = 500) {
        if (petImage) {
            petImage.classList.add(animationClass);
            setTimeout(() => {
                petImage.classList.remove(animationClass);
            }, duration);
        }
    }

    feedPetBtn.addEventListener('click', () => {
        displayFeedback('🥣'); // Food bowl emoji
        // Potentially add logic for hunger state later
    });

    playPetBtn.addEventListener('click', () => {
        // displayFeedback('🎉'); // Party popper for fun - REMOVED
        // animatePet(); // Uses default 'pet-play-animation' - REMOVED
        showScreen(miniGameScreen.id);
        initializeMiniGame(); 
        // Potentially add logic for happiness state later
    });

    carePetBtn.addEventListener('click', () => {
        displayFeedback('❤️'); // Heart emoji for care/petting
        animatePet('pet-care-animation', 300); // A different, quicker animation for petting
        // Potentially add logic for affection state later
    });

    // --- End New Tamagotchi Interactions ---

    // Tamagotchi Main Screen Actions
    restartTamagotchiBtn.addEventListener('click', () => {
        resetTamagotchiGame();
        showScreen('animal-selection-screen');
    });

    const bookSessionButton = document.getElementById('book-session-btn');
    if (bookSessionButton) {
        bookSessionButton.addEventListener('click', () => {
            showScreen('booking-options-screen');
        });
    }
    

    // Booking Options
    document.querySelectorAll('.select-package-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const packageElement = e.currentTarget.closest('.booking-package');
            selectedPackageInfo = {
                name: packageElement.querySelector('h3').textContent.trim(),
                detailsHTML: packageElement.querySelector('ul').innerHTML, // Get innerHTML to preserve list structure
                price: packageElement.querySelector('.price').textContent.trim(),
                dataPackage: e.currentTarget.dataset.package
            };
            populateBookingSummary();
            showScreen('booking-summary-screen');
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

    // Back button from Booking Options to Main Tamagotchi Screen
    const backToMainFromBooking = bookingOptionsScreen.querySelector('.back-btn[data-target-screen="tamagotchi-main-screen"]');
    if (backToMainFromBooking) {
        backToMainFromBooking.addEventListener('click', () => showScreen('tamagotchi-main-screen'));
    }

    // Booking Summary Screen: Event listeners for contact buttons
    if (bookingSummaryScreen) { // Check if the element exists before adding listeners
        const emailBtn = document.getElementById('contact-email-btn');
        const whatsappBtn = document.getElementById('contact-whatsapp-btn');
        if (emailBtn) emailBtn.addEventListener('click', handleContactViaEmail);
        if (whatsappBtn) whatsappBtn.addEventListener('click', handleContactViaWhatsApp);
    } else {
        // console.error("Booking summary screen element not found during event listener setup.");
    }

    // Initialize Tamagotchi game logic when the DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        initializeDOMElements();
        setupEventListeners(); // Centralized event listener setup
        showScreen('animal-selection-screen'); // Initial screen
    });
}

function populateBookingSummary() {
    if (!selectedPackageInfo || !bookingSummaryScreen) return;

    document.getElementById('summary-pet-name').textContent = animalName || 'Your Pet'; // Use stored animalName
    document.getElementById('summary-pet-type').textContent = selectedAnimal ? (selectedAnimal.charAt(0).toUpperCase() + selectedAnimal.slice(1)) : 'N/A';
    document.getElementById('summary-pet-size').textContent = selectedSize ? (selectedSize.charAt(0).toUpperCase() + selectedSize.slice(1)) : 'N/A';
    document.getElementById('summary-package-name').textContent = selectedPackageInfo.name;
    document.getElementById('summary-package-details').innerHTML = selectedPackageInfo.detailsHTML; // Directly use the stored HTML list
    document.getElementById('summary-package-price').textContent = selectedPackageInfo.price;
}

function handleContactViaEmail() {
    if (!selectedPackageInfo || !animalName || !selectedAnimal || !selectedSize) {
        alert("Please ensure all pet and package details are selected before contacting.");
        return;
    }

    const subject = `Pawfect Photoshoot Booking: ${animalName}`;
    // Create a temporary div to parse HTML and extract text content correctly for lists
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = selectedPackageInfo.detailsHTML;
    const packageDetailsText = Array.from(tempDiv.querySelectorAll('li')).map(li => `- ${li.textContent.trim()}`).join('\n');

    const body = `Hello! I'd like to book a photoshoot for my ${selectedSize} ${selectedAnimal}, ${animalName}.

I'm interested in the ${selectedPackageInfo.name} package (${selectedPackageInfo.price}).

Package Details:
${packageDetailsText}

Looking forward to hearing from you!

Best regards,
[Your Name Here]`; // User should replace this

    const mailtoLink = `mailto:${PHOTOGRAPHER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}

function handleContactViaWhatsApp() {
    if (!selectedPackageInfo || !animalName || !selectedAnimal || !selectedSize) {
        alert("Please ensure all pet and package details are selected before contacting.");
        return;
    }

    // Create a temporary div to parse HTML and extract text content correctly for lists
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = selectedPackageInfo.detailsHTML;
    const packageDetailsText = Array.from(tempDiv.querySelectorAll('li')).map(li => `- ${li.textContent.trim()}`).join('\n');

    const message = `Hello! I'd like to book a photoshoot for my ${selectedSize} ${selectedAnimal}, ${animalName}.
I'm interested in the ${selectedPackageInfo.name} package (${selectedPackageInfo.price}).
Package Details:
${packageDetailsText}`;

    const whatsappLink = `https://wa.me/${PHOTOGRAPHER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
}

// --- MINI-GAME SPECIFIC FUNCTIONS ---
function initializeMiniGame() {
    if (!miniGameCanvas) {
        console.error('Mini-game canvas not found!');
        return;
    }
    miniGameCtx = miniGameCanvas.getContext('2d');

    // Set actual canvas rendering dimensions
    const style = getComputedStyle(miniGameCanvas);
    const canvasWidth = parseInt(style.width);
    const canvasHeight = parseInt(style.height);
    miniGameCanvas.width = canvasWidth * window.devicePixelRatio;
    miniGameCanvas.height = canvasHeight * window.devicePixelRatio;
    miniGameCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Game constants and player setup
    gameConstants = {
        gravity: 0.5, // May need tweaking after size changes
        jumpStrength: -12, // Slightly increased to compensate for potentially larger player needing more oomph
        groundHeight: 60, // Increased ground height
        playerWidth: 50,  // Increased player width
        playerHeight: 50, // Increased player height
        playerColor: '#FF6347',
        groundColor: '#8B4513',
        obstacleWidth: 35, // Increased obstacle width
        obstacleHeight: 70,
        obstacleColor: '#A0522D',
        initialObstacleSpeed: 3, // Increased initial speed
        minObstacleSpeed: 3,     // Match initial speed
        maxObstacleSpeed: 6,     // Slightly increased max speed cap
        initialObstacleSpawnInterval: 110, // Slightly faster initial spawn
        minObstacleSpawnInterval: 50,  // Slightly faster minimum spawn interval
        scoreThresholdForSpeedIncrease: 150, // Speed up sooner
        scoreThresholdForSpawnRateIncrease: 250, // Increase spawn rate sooner
        gameOverButtonWidth: 120,
        gameOverButtonHeight: 40,
        gameOverButtonPadding: 20, // Space between buttons
        gameOverButtonColor: '#4CAF50', // Green for restart
        gameOverExitButtonColor: '#f44336' // Red for exit
    };

    player = {
        x: 50,
        y: canvasHeight - gameConstants.groundHeight - gameConstants.playerHeight, // Start on the ground
        width: gameConstants.playerWidth,
        height: gameConstants.playerHeight,
        velocityY: 0,
        isJumping: false
    };

    // Clear any previous game loop and listeners
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    document.removeEventListener('keydown', handleKeyDown);

    // Add event listener for jumps
    document.addEventListener('keydown', handleKeyDown);
    miniGameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    miniGameCanvas.addEventListener('click', handleCanvasClick); // Add click listener for mouse

    // Reset obstacles and spawn timer
    obstacles = [];
    obstacleSpawnTimer = 0;
    score = 0;
    isGameOver = false;

    // Initialize dynamic difficulty settings
    currentObstacleSpeed = gameConstants.initialObstacleSpeed;
    currentObstacleSpawnInterval = gameConstants.initialObstacleSpawnInterval;

    // Remove the 'Escape' key listener when game starts, if it was added previously
    document.removeEventListener('keydown', handleEscapeKeyForGame);

    console.log(`Mini-game initialized. Canvas display size: ${canvasWidth}x${canvasHeight}`);
    gameLoop(); // Start the game loop
}

function handleKeyDown(event) {
    if (event.code === 'Space' && player && !player.isJumping && !isGameOver) { // Added !isGameOver
        player.velocityY = gameConstants.jumpStrength;
        player.isJumping = true;
    } 
    // Removed: else if (event.code === 'Space' && isGameOver) { initializeMiniGame(); }
}

function handleTouchStart(event) {
    event.preventDefault();
    const rect = miniGameCanvas.getBoundingClientRect();
    // Adjust for canvas scaling if you're using CSS to scale it visually but not its internal resolution
    // For simplicity, assuming 1:1 or direct interaction with canvas element's own coordinates
    const touchX = event.touches[0].clientX - rect.left;
    const touchY = event.touches[0].clientY - rect.top;

    if (isGameOver) {
        handleGameOverInput(touchX, touchY);
    } else if (player && !player.isJumping) {
        player.velocityY = gameConstants.jumpStrength;
        player.isJumping = true;
    }
}

function handleCanvasClick(event) {
    const rect = miniGameCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    if (isGameOver) {
        handleGameOverInput(clickX, clickY);
    } 
    // Potentially add click-to-jump logic here if desired for desktop, 
    // but spacebar is common. For now, click only works on game over.
}

function handleGameOverInput(x, y) {
    const canvasDisplayWidth = miniGameCanvas.width / window.devicePixelRatio;
    const canvasDisplayHeight = miniGameCanvas.height / window.devicePixelRatio;

    const buttonWidth = gameConstants.gameOverButtonWidth;
    const buttonHeight = gameConstants.gameOverButtonHeight;
    const buttonPadding = gameConstants.gameOverButtonPadding;
    
    const totalButtonWidth = (buttonWidth * 2) + buttonPadding;
    const startX = (canvasDisplayWidth - totalButtonWidth) / 2;

    const restartButton = {
        x: startX,
        y: canvasDisplayHeight / 2 + 20, // Position below score
        width: buttonWidth,
        height: buttonHeight
    };

    const exitButton = {
        x: startX + buttonWidth + buttonPadding,
        y: canvasDisplayHeight / 2 + 20, // Same Y level
        width: buttonWidth,
        height: buttonHeight
    };

    // Check Restart Button
    if (x > restartButton.x && x < restartButton.x + restartButton.width &&
        y > restartButton.y && y < restartButton.y + restartButton.height) {
        initializeMiniGame();
    }

    // Check Exit Button
    if (x > exitButton.x && x < exitButton.x + exitButton.width &&
        y > exitButton.y && y < exitButton.y + exitButton.height) {
        isGameOver = false;
        stopMiniGame();
        showScreen(tamagotchiMainScreen.id);
    }
}

function stopMiniGame(calledFromGameOver = false) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (!calledFromGameOver) {
        document.removeEventListener('keydown', handleKeyDown);
        miniGameCanvas.removeEventListener('touchstart', handleTouchStart);
        miniGameCanvas.removeEventListener('click', handleCanvasClick); // Remove click listener
    }
    document.removeEventListener('keydown', handleEscapeKeyForGame);
    console.log("Mini-game stopped.");
}

// Listener for Escape key to exit the mini-game
// We'll add this listener when the mini-game screen is shown
// and remove it when another screen is shown or game stops.

const originalShowScreen = showScreen;
showScreen = (screenId) => {
    // If we are navigating away from the mini-game screen, stop the game
    if (document.getElementById('mini-game-screen').style.display === 'flex' && screenId !== 'mini-game-screen') {
        stopMiniGame();
    }
    
    originalShowScreen(screenId);

    // If we are navigating to the mini-game screen, add the escape key listener
    if (screenId === 'mini-game-screen') {
        document.addEventListener('keydown', handleEscapeKeyForGame);
    }
};

function handleEscapeKeyForGame(event) {
    if (event.key === 'Escape') {
        isGameOver = false;
        stopMiniGame();
        showScreen(tamagotchiMainScreen.id);
        miniGameCanvas.removeEventListener('touchstart', handleTouchStart);
        miniGameCanvas.removeEventListener('click', handleCanvasClick);
    }
}

function gameLoop() {
    if (!miniGameCtx || !gameConstants || !miniGameCanvas) { // Removed player check as it might be null before init on first load
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        return;
    }

    const canvasDisplayWidth = miniGameCanvas.width / window.devicePixelRatio;
    const canvasDisplayHeight = miniGameCanvas.height / window.devicePixelRatio;

    miniGameCtx.clearRect(0, 0, canvasDisplayWidth, canvasDisplayHeight);

    if (isGameOver) {
        miniGameCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        miniGameCtx.fillRect(0, 0, canvasDisplayWidth, canvasDisplayHeight);

        miniGameCtx.font = 'bold 30px Arial'; // Made Game Over text bigger
        miniGameCtx.fillStyle = 'white';
        miniGameCtx.textAlign = 'center';
        miniGameCtx.fillText('Game Over!', canvasDisplayWidth / 2, canvasDisplayHeight / 2 - 40); // Adjusted Y
        miniGameCtx.font = '20px Arial'; // Score text size
        miniGameCtx.fillText(`Score: ${score}`, canvasDisplayWidth / 2, canvasDisplayHeight / 2);
        // Removed: miniGameCtx.fillText('Press SPACE to Restart', canvasDisplayWidth / 2, canvasDisplayHeight / 2 + 30);

        // Draw Buttons
        const buttonWidth = gameConstants.gameOverButtonWidth;
        const buttonHeight = gameConstants.gameOverButtonHeight;
        const buttonPadding = gameConstants.gameOverButtonPadding;
        const totalButtonWidth = (buttonWidth * 2) + buttonPadding;
        const startX = (canvasDisplayWidth - totalButtonWidth) / 2;

        const restartButton = {
            x: startX,
            y: canvasDisplayHeight / 2 + 20, // Position below score
            width: buttonWidth,
            height: buttonHeight
        };

        const exitButton = {
            x: startX + buttonWidth + buttonPadding,
            y: canvasDisplayHeight / 2 + 20, // Same Y level
            width: buttonWidth,
            height: buttonHeight
        };

        // Restart Button
        miniGameCtx.fillStyle = gameConstants.gameOverButtonColor;
        miniGameCtx.fillRect(startX, restartButton.y, buttonWidth, buttonHeight);
        miniGameCtx.font = '16px Arial';
        miniGameCtx.fillStyle = 'white';
        miniGameCtx.textAlign = 'center'; // Ensure text is centered on button
        miniGameCtx.fillText('RESTART', startX + buttonWidth / 2, restartButton.y + buttonHeight / 2 + 6); // Adjust Y for text baseline

        // Exit Button
        miniGameCtx.fillStyle = gameConstants.gameOverExitButtonColor;
        miniGameCtx.fillRect(startX + buttonWidth + buttonPadding, exitButton.y, buttonWidth, buttonHeight);
        miniGameCtx.fillText('HOME', startX + buttonWidth + buttonPadding + buttonWidth / 2, exitButton.y + buttonHeight / 2 + 6);

        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    // --- Gameplay Logic --- 
    if (!player) return; // If player is not initialized (e.g. after exiting game over then trying to run again before full init)

    // Update difficulty based on score
    // Increase speed
    if (score > 0 && score % gameConstants.scoreThresholdForSpeedIncrease === 0) {
        if (currentObstacleSpeed < gameConstants.maxObstacleSpeed) {
            currentObstacleSpeed += 0.2; // Larger increment for faster speed increase
            currentObstacleSpeed = Math.min(currentObstacleSpeed, gameConstants.maxObstacleSpeed); // Cap at max speed
            // console.log(`Score: ${score}, New Speed: ${currentObstacleSpeed.toFixed(1)}`);
        }
    }
    // Decrease spawn interval (faster spawns)
    if (score > 0 && score % gameConstants.scoreThresholdForSpawnRateIncrease === 0) {
        if (currentObstacleSpawnInterval > gameConstants.minObstacleSpawnInterval) {
            currentObstacleSpawnInterval -= 10; // Larger decrement for faster spawn rate increase
            currentObstacleSpawnInterval = Math.max(currentObstacleSpawnInterval, gameConstants.minObstacleSpawnInterval); // Cap at min interval
            // console.log(`Score: ${score}, New Spawn Interval: ${currentObstacleSpawnInterval}`);
        }
    }

    // Apply gravity
    if (player.y + player.height < canvasDisplayHeight - gameConstants.groundHeight || player.velocityY < 0) {
        player.velocityY += gameConstants.gravity;
    }

    // Update player position
    player.y += player.velocityY;

    // Ground collision
    if (player.y + player.height > canvasDisplayHeight - gameConstants.groundHeight) {
        player.y = canvasDisplayHeight - gameConstants.groundHeight - player.height;
        player.velocityY = 0;
        player.isJumping = false;
    }

    // Draw ground
    miniGameCtx.fillStyle = gameConstants.groundColor;
    miniGameCtx.fillRect(0, canvasDisplayHeight - gameConstants.groundHeight, canvasDisplayWidth, gameConstants.groundHeight);

    // Draw player
    if (petImageElem && petImageElem.complete && petImageElem.naturalHeight !== 0) {
        // Use player.width and player.height for the display dimensions of the image
        miniGameCtx.drawImage(petImageElem, player.x, player.y, player.width, player.height);
    } else {
        // Fallback to drawing a rectangle if image not ready or not selected
        // This might happen if the game starts too quickly or petImageElem is not set
        miniGameCtx.fillStyle = gameConstants.playerColor;
        miniGameCtx.fillRect(player.x, player.y, player.width, player.height);
        // console.warn("Pet image not ready, drawing fallback rectangle.");
    }

    // Handle obstacles & Collision Detection
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer > currentObstacleSpawnInterval) { // Use dynamic interval
        spawnObstacle(canvasDisplayWidth, canvasDisplayHeight);
        obstacleSpawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= currentObstacleSpeed; // Use dynamic speed

        miniGameCtx.fillStyle = gameConstants.obstacleColor;
        miniGameCtx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision detection (AABB)
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            isGameOver = true;
            stopMiniGame(true); // Pass true to indicate it's a game over stop
            // The gameLoop will handle the Game Over screen on the next frame
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Update Score
    score++;
    miniGameCtx.font = '16px Arial';
    miniGameCtx.fillStyle = '#333';
    miniGameCtx.textAlign = 'left';
    miniGameCtx.fillText(`Score: ${score}`, 10, 20);

    animationFrameId = requestAnimationFrame(gameLoop);
}

function spawnObstacle(canvasWidth, canvasHeight) {
    // For now, all obstacles are the same height and spawn on the ground
    // We can vary this later (e.g., flying obstacles, different heights)
    const newObstacle = {
        x: canvasWidth, // Start off-screen to the right
        y: canvasHeight - gameConstants.groundHeight - gameConstants.obstacleHeight,
        width: gameConstants.obstacleWidth,
        height: gameConstants.obstacleHeight
    };
    obstacles.push(newObstacle);
    console.log("Spawned obstacle. Total obstacles: ", obstacles.length);
}

// Call initialization when the script loads or when the game is actually started
// For now, initializeTamagotchiGame() is called when the Tamagotchi popup is interacted with.

// Ensure Tamagotchi game specific JS is initialized when the popup is displayed
// This might need adjustment if the popup is always in the DOM vs dynamically added.
document.addEventListener('DOMContentLoaded', () => {
    // If the main script that shows the Tamagotchi popup is separate, 
    // this initialization might need to be called from there when the popup is made visible.
    // For now, assuming it can be initialized if the container exists.
    if (document.getElementById('tamagotchi-container')) {
        initTamagotchiGame(); 
    }
});

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
