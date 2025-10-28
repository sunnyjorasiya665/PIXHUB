/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface AdjustmentSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    disabled: boolean;
    min?: number;
    max?: number;
    step?: number;
}

const AdjustmentSlider: React.FC<AdjustmentSliderProps> = ({
    label,
    value,
    onChange,
    disabled,
    min = -100,
    max = 100,
    step = 1
}) => {
    
    const handleReset = () => {
        onChange(0);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-gray-300">{label}</label>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-cyan-400 w-10 text-right">{value}</span>
                    <button 
                        onClick={handleReset} 
                        disabled={disabled || value === 0}
                        className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Reset
                    </button>
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
        </div>
    );
};

export default AdjustmentSlider;