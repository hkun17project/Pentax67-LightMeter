// --- Configuration Arrays ---
const isoValues = [50, 100, 200, 400, 800, 1600, 3200];
const apertureValues = [2.4, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0];
const shutterSpeeds = [
"30s", "15s", "8s", "4s", "2s", "1s",
"1/2", "1/4", "1/8", "1/15", "1/30", "1/60",
"1/125", "1/250", "1/500", "1/1000", "1/2000"
];
// Shutter speeds represented as decimals for math
const shutterDecimals = [
30, 15, 8, 4, 2, 1,
0.5, 0.25, 0.125, 1/15, 1/30, 1/60,
1/125, 1/250, 1/500, 1/1000, 1/2000
];

// --- DOM Elements ---
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('analysis-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const isoSlider = document.getElementById('iso-slider');
const apertureSlider = document.getElementById('aperture-slider');
const isoDisplay = document.getElementById('iso-display');
const apertureDisplay = document.getElementById('aperture-display');
const shutterSpeedDisplay = document.getElementById('shutter-speed');

// --- State Variables ---
let currentLuminance = 100; // Base arbitrary starting point
// A calibration constant to translate pixel brightness (0-255) to a usable EV scale.
// You MUST adjust this value to match a known good light meter.
const CALIBRATION_CONSTANT = 12.5;

// --- Initialize Camera ---
async function startCamera() {
try {
const stream = await navigator.mediaDevices.getUserMedia({
video: { facingMode: "environment" }
});
video.srcObject = stream;

// Wait for video metadata to set canvas size
video.onloadedmetadata = () => {
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
requestAnimationFrame(analyzeFrame);
};
} catch (err) {
console.error("Camera access denied or error: ", err);
shutterSpeedDisplay.innerText = "Error";
}
}

// --- Analyze Pixel Brightness ---
function analyzeFrame() {
if (video.readyState === video.HAVE_ENOUGH_DATA) {
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

// Define the spot metering area (center 10% of the frame)
const sizeX = canvas.width * 0.1;
const sizeY = canvas.height * 0.1;
const startX = (canvas.width / 2) - (sizeX / 2);
const startY = (canvas.height / 2) - (sizeY / 2);

const frame = ctx.getImageData(startX, startY, sizeX, sizeY);
let totalBrightness = 0;
const data = frame.data;

// Calculate average brightness using perceived luminance formula
for (let i = 0; i < data.length; i += 4) {
const r = data[i];
const g = data[i+1];
const b = data[i+2];
// Standard luminance formula
const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
totalBrightness += brightness;
}

const avgBrightness = totalBrightness / (data.length / 4);

// Very basic smoothing to stop jitter
currentLuminance = (currentLuminance * 0.9) + (avgBrightness * 0.1);

calculateExposure();
}
// Loop the analysis
requestAnimationFrame(analyzeFrame);
}

// --- Calculate Exposure ---
function calculateExposure() {
const iso = isoValues[isoSlider.value];
const aperture = apertureValues[apertureSlider.value];

// Update UI displays
isoDisplay.innerText = iso;
apertureDisplay.innerText = f/${aperture};

// Note: This is an estimation. True lux calculation from a webcam is complex.
// EV100 = log2(N^2 / t)
// We map our currentLuminance (0-255) to a theoretical EV value.
// A completely black frame will cause log(0), so we bound it.
let sceneEV = Math.log2((currentLuminance + 1) / CALIBRATION_CONSTANT);

// Adjust EV based on selected ISO (Base is 100)
let adjustedEV = sceneEV + Math.log2(iso / 100);

// Calculate required shutter time: t = N^2 / 2^(EV)
let requiredTime = Math.pow(aperture, 2) / Math.pow(2, adjustedEV);

// Find the closest shutter speed from our standard list
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

// --- Event Listeners ---
isoSlider.addEventListener('input', calculateExposure);
apertureSlider.addEventListener('input', calculateExposure);

// Start the app
startCamera();