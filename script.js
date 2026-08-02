import React, { useState, useRef, useEffect } from 'react';

// --- Configuration Arrays ---
const ISO_VALUES = [50, 100, 200, 400, 800, 1600, 3200];
const APERTURE_VALUES = [2.4, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0];
const SHUTTER_SPEEDS = [
  { label: "30s", value: 30 }, { label: "15s", value: 15 },
  { label: "8s", value: 8 }, { label: "4s", value: 4 },
  { label: "2s", value: 2 }, { label: "1s", value: 1 },
  { label: "1/2", value: 0.5 }, { label: "1/4", value: 0.25 },
  { label: "1/8", value: 0.125 }, { label: "1/15", value: 1/15 },
  { label: "1/30", value: 1/30 }, { label: "1/60", value: 1/60 },
  { label: "1/125", value: 1/125 }, { label: "1/250", value: 1/250 },
  { label: "1/500", value: 1/500 }, { label: "1/1000", value: 1/1000 },
  { label: "1/2000", value: 1/2000 }
];

const CALIBRATION_CONSTANT = 4.5;

export default function PentaxLightMeter() {
  const [imageSrc, setImageSrc] = useState(null);
  const [isoIndex, setIsoIndex] = useState(3); // Default ISO 400
  const [apertureIndex, setApertureIndex] = useState(3); // Default f/5.6
  const [calculatedSpeed, setCalculatedSpeed] = useState("--");
  const [error, setError] = useState(null);
  const [luminance, setLuminance] = useState(null);
  
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // --- Handle File Upload ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      setImageSrc(event.target.result);
    };
    
    reader.onerror = () => {
      setError("Failed to read image file.");
    };

    reader.readAsDataURL(file);
  };

  // --- Image Analysis (Runs when imageSrc changes) ---
  useEffect(() => {
    if (!imageSrc || !imgRef.current || !canvasRef.current) return;

    const img = imgRef.current;
    
    img.onload = () => {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Scale down significantly to prevent mobile memory crash
        const MAX_DIMENSION = 400;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let totalBrightness = 0;
        
        // Check every 4th pixel for speed
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
        }

        const avgBrightness = totalBrightness / (data.length / 16);
        setLuminance(avgBrightness);
        
      } catch (err) {
        setError(`Processing Error: ${err.message}`);
        setLuminance(null);
      }
    };
  }, [imageSrc]);

  // --- Exposure Calculation (Runs when Luminance, ISO, or Aperture changes) ---
  useEffect(() => {
    if (luminance === null) {
      setCalculatedSpeed("--");
      return;
    }

    const iso = ISO_VALUES[isoIndex];
    const aperture = APERTURE_VALUES[apertureIndex];

    const sceneEV = Math.log2((luminance + 1) / CALIBRATION_CONSTANT);
    const adjustedEV = sceneEV + Math.log2(iso / 100);
    const requiredTime = Math.pow(aperture, 2) / Math.pow(2, adjustedEV);

    let closestSpeed = SHUTTER_SPEEDS[0];
    let smallestDiff = Infinity;

    for (const speed of SHUTTER_SPEEDS) {
      const diff = Math.abs(speed.value - requiredTime);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestSpeed = speed;
      }
    }

    setCalculatedSpeed(closestSpeed.label);
  }, [luminance, isoIndex, apertureIndex]);

  // --- UI Render ---
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden font-sans">
      
      {/* Viewfinder / Image Section */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-black border-b border-gray-700 overflow-hidden">
        
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-3 rounded text-sm font-bold z-20">
            {error}
          </div>
        )}

        {!imageSrc && (
          <label className="z-10 cursor-pointer bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg shadow-lg uppercase tracking-wide hover:bg-yellow-400 transition-colors">
            Take / Import Photo
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </label>
        )}

        {imageSrc && (
          <>
            <img 
              ref={imgRef}
              src={imageSrc} 
              alt="Scene preview" 
              className="w-full h-full object-contain"
            />
            <label className="absolute top-4 right-4 bg-gray-800 bg-opacity-75 p-2 rounded-full cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </label>
          </>
        )}
        
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls Section */}
      <div className="flex-1 max-h-96 bg-gray-800 p-6 flex flex-col justify-between">
        
        <div className="space-y-6">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-wider">Film ISO</span>
              <span className="text-yellow-500 text-xl font-bold">{ISO_VALUES[isoIndex]}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={ISO_VALUES.length - 1} 
              step="1" 
              value={isoIndex}
              onChange={(e) => setIsoIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-wider">Aperture</span>
              <span className="text-yellow-500 text-xl font-bold">f/{APERTURE_VALUES[apertureIndex]}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={APERTURE_VALUES.length - 1} 
              step="1" 
              value={apertureIndex}
              onChange={(e) => setApertureIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-700 text-center">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Shutter Speed</div>
          <div className="text-5xl font-extrabold text-white">
            {calculatedSpeed}
          </div>
        </div>

      </div>
    </div>
  );
}
