const isoValues = [50, 100, 200, 400, 800, 1600, 3200];
const apertureValues = [2.4, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0];
const shutterSpeeds = [
    "30s", "15s", "8s", "4s", "2s", "1s", 
    "1/2", "1/4", "1/8", "1/15", "1/30", "1/60", 
    "1/125", "1/250", "1/500", "1/1000", "1/2000"
];
const shutterDecimals = [
    30, 15, 8, 4, 2, 1, 
    0.5, 0.25, 0.125, 1/15, 1/30, 1/60, 
    1/125, 1/250, 1/500, 1/1000, 1/2000
];

const video = document.getElementById('camera-feed');
const canvas = document.getElementById('analysis-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const isoSlider = document.getElementById('iso-slider');
const apertureSlider = document.getElementById('aperture-slider');
const isoDisplay = document.getElementById('iso-display');
const apertureDisplay = document.getElementById('aperture-display');
const shutterSpeedDisplay = document.getElementById('shutter-speed');

let currentLuminance = 100; 
const CALIBRATION_CONSTANT = 12.5; 
let isCameraReady = false; // Flag to prevent calculations before video loads

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            isCameraReady = true;
            // Force an initial UI update based on default slider positions
            updateUI(); 
            requestAnimationFrame(analyzeFrame);
        };
    } catch (err) {
        console.error("Camera access denied or error: ", err);
        shutterSpeedDisplay.innerText = "Error";
    }
}

function analyzeFrame() {
    if (isCameraReady && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const sizeX = canvas.width * 0.1;
        const sizeY = canvas.height * 0.1;
        const startX = (canvas.width / 2) - (sizeX / 2);
        const startY = (canvas.height / 2) - (sizeY / 2);

        const frame = ctx.getImageData(startX, startY, sizeX, sizeY);
        let totalBrightness = 0;
        const data = frame.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            totalBrightness += brightness;
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        currentLuminance = (currentLuminance * 0.9) + (avgBrightness * 0.1);
        
        calculateExposure();
    }
    requestAnimationFrame(analyzeFrame);
}

// Separated the UI update logic from the math for better performance
function updateUI() {
    // FIXED: Parse slider value as an integer before using as array index
    const isoIndex = parseInt(isoSlider.value, 10);
    const apertureIndex = parseInt(apertureSlider.value, 10);
    
    isoDisplay.innerText = isoValues[isoIndex];
    apertureDisplay.innerText = `f/${apertureValues[apertureIndex]}`;
}

function calculateExposure() {
    // Update the numbers on the screen first
    updateUI();

    const iso = isoValues[parseInt(isoSlider.value, 10)];
    const aperture = apertureValues[parseInt(apertureSlider.value, 10)];

    let sceneEV = Math.log2((currentLuminance + 1) / CALIBRATION_CONSTANT);
    let adjustedEV = sceneEV + Math.log2(iso / 100);
    let requiredTime = Math.pow(aperture, 2) / Math.pow(2, adjustedEV);

    let closestIndex = 0;
    let smallestDiff = Infinity;
    
    for (let i = 0; i < shutterDecimals.length; i++) {
        const diff = Math.abs(shutterDecimals[i] - requiredTime);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closestIndex = i;
        }
    }

    shutterSpeedDisplay.innerText = shutterSpeeds[closestIndex];
}

// Update the UI immediately when the slider moves, even if the camera is still analyzing
isoSlider.addEventListener('input', calculateExposure);
apertureSlider.addEventListener('input', calculateExposure);

// Ensure UI shows correct initial values even before camera permission is granted
updateUI(); 
startCamera();
