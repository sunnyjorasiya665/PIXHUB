/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

type Step = 'idle' | 'cropping' | 'background' | 'sheet';
type SheetSize = '4x6' | '5x7' | 'A4';
type Layout = 'portrait' | 'landscape';

interface PassportPanelProps {
  step: Step;
  onCropConfirm: () => void;
  onBackgroundChange: (color: string) => void;
  onSheetGenerate: (sheetSize: SheetSize, layout: Layout, photoCount: number) => void;
  onReset: () => void;
  isLoading: boolean;
  isCropping: boolean;
}

const PassportPanel: React.FC<PassportPanelProps> = ({ 
  step,
  onCropConfirm, 
  onBackgroundChange, 
  onSheetGenerate,
  onReset,
  isLoading,
  isCropping,
}) => {
  const [backgroundColor, setBackgroundColor] = useState<string>('White');
  const [sheetSize, setSheetSize] = useState<SheetSize>('4x6');
  const [layout, setLayout] = useState<Layout>('portrait');
  const [photoCount, setPhotoCount] = useState<string>('8');

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-xl font-semibold text-gray-200">Passport Photo Creator</h3>
      
      {/* Step 1: Crop */}
      <div className={`w-full text-center flex flex-col items-center gap-4 ${step !== 'cropping' ? 'hidden' : ''}`}>
        <p className="text-gray-400">
          <span className="font-bold text-gray-300">Step 1:</span> Drag a rectangle over the image to crop the head and shoulders. The aspect ratio is locked for passport photos.
        </p>
        <button
          onClick={onCropConfirm}
          disabled={isLoading || !isCropping}
          className="w-full max-w-xs bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Crop
        </button>
      </div>
      
      {/* Step 2: Background */}
      <div className={`w-full flex flex-col items-center gap-4 ${step !== 'background' ? 'hidden' : ''}`}>
         <p className="text-gray-400"><span className="font-bold text-gray-300">Step 2:</span> Select a background color.</p>
         <div className="flex gap-2">
           {['White', 'Light Blue', 'Gray'].map(color => (
              <button key={color} onClick={() => setBackgroundColor(color)} className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 ${backgroundColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-400 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{color}</button>
           ))}
         </div>
         <button
           onClick={() => onBackgroundChange(backgroundColor)}
           disabled={isLoading}
           className="w-full max-w-xs mt-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
         >
           Change Background
         </button>
      </div>
      
      {/* Step 3: Sheet */}
      <div className={`w-full flex flex-col items-center gap-4 ${step !== 'sheet' ? 'hidden' : ''}`}>
          <p className="text-gray-400"><span className="font-bold text-gray-300">Step 3:</span> Configure and generate a printable sheet.</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex gap-2">
              <span className="text-gray-400 my-auto">Size:</span>
                {(['4x6', '5x7', 'A4'] as SheetSize[]).map(size => (
                    <button key={size} onClick={() => setSheetSize(size)} className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 ${sheetSize === size ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-400 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{size}</button>
                ))}
            </div>
            <div className="h-6 w-px bg-gray-600 hidden sm:block"></div>
            <div className="flex gap-2">
              <span className="text-gray-400 my-auto">Layout:</span>
              {(['portrait', 'landscape'] as Layout[]).map(l => (
                  <button key={l} onClick={() => setLayout(l)} className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 capitalize ${layout === l ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-400 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="photo-count" className="text-sm font-medium text-gray-400">Number of Photos:</label>
            <input
              id="photo-count"
              type="number"
              min="1"
              value={photoCount}
              onChange={(e) => setPhotoCount(e.target.value)}
              className="w-24 bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              disabled={isLoading}
            />
          </div>
          <button
              onClick={() => {
                const count = parseInt(photoCount, 10);
                if (!isNaN(count) && count > 0) {
                  onSheetGenerate(sheetSize, layout, count);
                }
              }}
              disabled={isLoading || !photoCount || parseInt(photoCount, 10) <= 0}
              className="w-full max-w-xs mt-4 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 active:scale-95 disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          >
              Generate Printable Sheet
          </button>
      </div>
      
      {step !== 'cropping' && step !== 'idle' && (
          <button onClick={onReset} className="text-sm text-gray-400 hover:text-white mt-4 disabled:opacity-50" disabled={isLoading}>Start Over</button>
      )}
    </div>
  );
};

export default PassportPanel;
