/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo } from 'react';
import AdjustmentSlider from './AdjustmentSlider';
import { SparklesIcon } from './icons';

export type AdjustmentKey = 'brightness' | 'contrast' | 'saturation' | 'temperature' | 'sharpness' | 'vignetteIntensity' | 'vignetteFeather' | 'colorBalance';

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  sharpness: number;
  vignetteIntensity: number;
  vignetteFeather: number;
  colorBalance: number;
}

export const initialAdjustments: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  sharpness: 0,
  vignetteIntensity: 0,
  vignetteFeather: 0,
  colorBalance: 0,
};

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  isLoading: boolean;
  adjustments: Adjustments;
  onAdjustmentChange: (adjustments: Adjustments) => void;
  onAutoAdjust: () => void;
}

// This function translates a numerical value into a descriptive string for the AI
const valueToText = (key: AdjustmentKey, value: number): string | null => {
    if (value === 0) return null;

    const intensityMap: { [key: number]: string } = {
        20: 'subtly',
        40: 'slightly',
        60: '', // Default, e.g., "increase brightness"
        80: 'significantly',
        100: 'dramatically',
    };
    
    const absoluteValue = Math.abs(value);
    const intensityKey = Object.keys(intensityMap).find(k => absoluteValue <= parseInt(k));
    const intensity = intensityMap[parseInt(intensityKey || '60')];
    
    const direction = value > 0 ? 'increase' : 'decrease';

    switch (key) {
        case 'brightness':
            return `${direction} the brightness ${intensity}`;
        case 'contrast':
            return `${direction} the contrast ${intensity}`;
        case 'saturation':
            return `${direction} the color saturation ${intensity}`;
        case 'sharpness':
            return `${direction} the sharpness ${intensity}`;
        case 'temperature':
            const tempDirection = value > 0 ? 'warmer' : 'cooler';
            return `make the image's color temperature ${intensity} ${tempDirection}`;
        case 'vignetteIntensity':
            const vignetteType = value > 0 ? 'dark' : 'light';
            return `add a ${intensity} ${vignetteType} vignette`;
        case 'colorBalance':
            const colorTarget = value > 0 ? 'green/cyan' : 'magenta/red';
            return `shift the color balance ${intensity} towards ${colorTarget}`;
        default:
            return null;
    }
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading, adjustments, onAdjustmentChange, onAutoAdjust }) => {

  const handleValueChange = (key: AdjustmentKey, value: number) => {
    onAdjustmentChange({ ...adjustments, [key]: value });
  };
  
  const handleResetAll = () => {
    onAdjustmentChange(initialAdjustments);
  };
  
  const generatedPrompt = useMemo(() => {
    const parts: string[] = [];
    
    // Handle all adjustments except vignette parts first
    (Object.keys(adjustments) as AdjustmentKey[]).forEach(key => {
        if (key.startsWith('vignette')) return;
        const part = valueToText(key, adjustments[key]);
        if (part) parts.push(part);
    });

    // Handle vignette specifically to combine intensity and feather
    if (adjustments.vignetteIntensity !== 0) {
        let vignettePrompt = valueToText('vignetteIntensity', adjustments.vignetteIntensity)!;
        
        const featherValue = adjustments.vignetteFeather; // 0-100 range
        let featherDesc = '';
        if (featherValue <= 25) {
            featherDesc = 'with a hard, distinct edge';
        } else if (featherValue <= 75) {
            featherDesc = 'with a medium, soft feather';
        } else {
            featherDesc = 'with a very soft, gradual feather';
        }
        vignettePrompt += ` ${featherDesc}`;
        parts.push(vignettePrompt);
    }
    
    if (parts.length === 0) return '';
    if (parts.length === 1) return `Apply the following adjustment: ${parts[0]}.`;
    
    const lastPart = parts.pop();
    return `Apply the following adjustments: ${parts.join(', ')}, and ${lastPart}.`;
  }, [adjustments]);
  
  const hasChanges = Object.values(adjustments).some(v => v !== 0);

  const handleApply = () => {
    if (generatedPrompt) {
      onApplyAdjustment(generatedPrompt);
    }
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-300">Professional Adjustments</h3>
        <button 
          onClick={handleResetAll}
          disabled={isLoading || !hasChanges}
          className="text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset All
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <h4 className="md:col-span-2 text-md font-semibold text-gray-400 border-b border-gray-700 pb-2">Light</h4>
        <AdjustmentSlider label="Brightness" value={adjustments.brightness} onChange={(v) => handleValueChange('brightness', v)} disabled={isLoading} />
        <AdjustmentSlider label="Contrast" value={adjustments.contrast} onChange={(v) => handleValueChange('contrast', v)} disabled={isLoading} />
        
        <h4 className="md:col-span-2 text-md font-semibold text-gray-400 border-b border-gray-700 pb-2 pt-4">Color</h4>
        <AdjustmentSlider label="Saturation" value={adjustments.saturation} onChange={(v) => handleValueChange('saturation', v)} disabled={isLoading} />
        <AdjustmentSlider label="Temperature" value={adjustments.temperature} onChange={(v) => handleValueChange('temperature', v)} disabled={isLoading} />
        <AdjustmentSlider label="Color Balance" value={adjustments.colorBalance} onChange={(v) => handleValueChange('colorBalance', v)} disabled={isLoading} />

        <h4 className="md:col-span-2 text-md font-semibold text-gray-400 border-b border-gray-700 pb-2 pt-4">Effects</h4>
        <AdjustmentSlider label="Sharpness" value={adjustments.sharpness} onChange={(v) => handleValueChange('sharpness', v)} disabled={isLoading} />
        <AdjustmentSlider label="Vignette Intensity" value={adjustments.vignetteIntensity} onChange={(v) => handleValueChange('vignetteIntensity', v)} disabled={isLoading} />
        <AdjustmentSlider label="Vignette Feather" value={adjustments.vignetteFeather} onChange={(v) => handleValueChange('vignetteFeather', v)} disabled={isLoading || adjustments.vignetteIntensity === 0} min={0} max={100} />
      </div>

      <p className="text-xs text-gray-500 text-center pt-2">
          Sharpness, Vignette, and Color Balance adjustments are not previewed in real-time.
      </p>
     
      <div className="mt-4 flex flex-col gap-3">
        <button
            onClick={onAutoAdjust}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-indigo-800 disabled:to-indigo-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading}
        >
            <SparklesIcon className="w-5 h-5" />
            Auto Enhance
        </button>
        <button
            onClick={handleApply}
            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !hasChanges}
        >
            Apply Adjustments
        </button>
      </div>
    </div>
  );
};

export default AdjustmentPanel;