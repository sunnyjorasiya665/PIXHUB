/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface EnhancePanelProps {
  onUpscale: () => void;
  isLoading: boolean;
}

const EnhancePanel: React.FC<EnhancePanelProps> = ({ onUpscale, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-xl font-semibold text-gray-200">Enhance Image Quality</h3>
      <p className="text-gray-400 text-center max-w-md">
        Use AI to increase the resolution and clarity of your image. This is great for improving old or low-quality photos.
      </p>
      <button
        onClick={onUpscale}
        disabled={isLoading}
        className="mt-2 w-full max-w-xs bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-indigo-800 disabled:to-indigo-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Upscale Image
      </button>
    </div>
  );
};

export default EnhancePanel;
