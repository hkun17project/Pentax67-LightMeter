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

const imageInput = document.getElementById('image-input');
const previewImage = document.getElementById('preview-image');
const uploadBtnContainer = document.getElementById('upload-btn-container');
const canvas = document.getElementById('analysis-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const isoSlider = document.getElementById('iso-slider');
const apertureSlider = document.getElementById('aperture-slider');
const isoDisplay = document.getElementById('iso-display');
const apertureDisplay = document.getElementById('aperture-display');
const shutterSpeedDisplay = document.getElementById('shutter-speed');

let currentLuminance = null; 
// Calibration constant needs tuning. Since we are analyzing a processed photo
// rather than raw sensor data, this number will differ from the previous script.
const CALIBRATION_CONSTANT = 4.5; 

// --- Handle Image Upload ---
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(event) {
        previewImage.src = event.target.result;
        previewImage.style.display = 'block';
        uploadBtnContainer.style.display = 'none'; // Hide the button after upload
        
        // Wait for image to load before analyzing
        previewImage.onload = function() {
            analyzeImage();
        }
    };
    
    reader.readAsDataURL(file);
});

// --- Analyze Image Pixels ---
function analyzeImage() {
    canvas.width = previewImage.naturalWidth;
    canvas.height = previewImage.naturalHeight;
    
    ctx.drawImage(previewImage, 0, 0, canvas.width, canvas.height);
    
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = frame.data;
    let totalBrightness = 0;
    
    // Sample every 4th pixel to save processing time on high-res S25 Ultra photos
    let sampleCount = 0;

    for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
        totalBrightness += brightness;
        sampleCount++;
    }

    currentLuminance = totalBrightness / sampleCount;
    calculateExposure();
}

// --- Update UI & Calculate ---
function updateUI() {
    const isoIndex = parseInt(isoSlider.value, 10);
    const apertureIndex = parseInt(apertureSlider.value, 10);
    
    isoDisplay.innerText = isoValues[isoIndex];
    apertureDisplay.innerText = `f/${apertureValues[apertureIndex]}`;
}

function calculateExposure() {
    updateUI();

    if (currentLuminance === null) {
        shutterSpeedDisplay.innerText = "--";
        return;
    }

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

isoSlider.addEventListener('input', calculateExposure);
apertureSlider.addEventListener('input', calculateExposure);

updateUI();
