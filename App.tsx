/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateUpscaledImage, generatePassportPhoto, generateAutoAdjustedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel, { initialAdjustments, type Adjustments } from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import EnhancePanel from './components/EnhancePanel';
import PassportPanel from './components/PassportPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, PaletteIcon, SunIcon, CropIcon, SparklesIcon, IdCardIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'adjust' | 'filters' | 'crop' | 'enhance' | 'passport';
type PassportStep = 'idle' | 'cropping' | 'background' | 'sheet';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // State for Adjustment real-time previews
  const [adjustments, setAdjustments] = useState<Adjustments>(initialAdjustments);

  // State for Passport Photo feature
  const [passportStep, setPassportStep] = useState<PassportStep>('idle');
  const [passportCroppedImage, setPassportCroppedImage] = useState<File | null>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const resetTransientState = useCallback(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setAdjustments(initialAdjustments);
  }, []);

  // Effect to manage aspect ratio based on active tab
  useEffect(() => {
    if (activeTab === 'passport') {
        setPassportStep('cropping');
        setAspect(7 / 9); // Standard passport photo aspect ratio
        resetTransientState();
    } else {
        setPassportStep('idle');
        setPassportCroppedImage(null);
        setAspect(undefined);
    }
  }, [activeTab, resetTransientState]);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File, resetAdjustmentsPreview = false) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    resetTransientState();
    if (resetAdjustmentsPreview) {
        setAdjustments(initialAdjustments);
    }
  }, [history, historyIndex, resetTransientState]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setActiveTab('retouch');
    resetTransientState();
    setPassportStep('idle');
    setPassportCroppedImage(null);
  }, [resetTransientState]);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setPrompt('');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        addImageToHistory(dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`));
    } catch (err) {
        setError(`Failed to apply the filter. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        addImageToHistory(dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`), true);
    } catch (err) {
        setError(`Failed to apply adjustment. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleAutoAdjust = useCallback(async () => {
    if (!currentImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const adjustedImageUrl = await generateAutoAdjustedImage(currentImage); 
        addImageToHistory(dataURLtoFile(adjustedImageUrl, `auto-adjusted-${Date.now()}.png`), true);
    } catch (err) {
        setError(`Failed to auto-adjust. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const cropImageToFile = useCallback((image: HTMLImageElement, crop: PixelCrop, fileName: string): File => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0, 0, crop.width, crop.height
    );
    
    const dataUrl = canvas.toDataURL('image/png');
    return dataURLtoFile(dataUrl, fileName);
  }, []);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    try {
      const newImageFile = cropImageToFile(imgRef.current, completedCrop, `cropped-${Date.now()}.png`);
      addImageToHistory(newImageFile);
    } catch (err) {
      setError(`Failed to apply crop. ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [completedCrop, addImageToHistory, cropImageToFile]);

  const handleUpscale = useCallback(async () => {
    if (!currentImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const upscaledImageUrl = await generateUpscaledImage(currentImage);
        addImageToHistory(dataURLtoFile(upscaledImageUrl, `upscaled-${Date.now()}.png`));
    } catch (err) {
        setError(`Failed to upscale image. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handlePassportCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    try {
      const croppedFile = cropImageToFile(imgRef.current, completedCrop, `passport-crop-${Date.now()}.png`);
      setPassportCroppedImage(croppedFile);
      setPassportStep('background');
      resetTransientState();
    } catch (err) {
      setError(`Failed to crop for passport. ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [completedCrop, resetTransientState, cropImageToFile]);

  const handlePassportBgChange = useCallback(async (color: string) => {
    if (!passportCroppedImage) return;
    setIsLoading(true);
    setError(null);
    try {
        const finalPhotoUrl = await generatePassportPhoto(passportCroppedImage, color);
        addImageToHistory(dataURLtoFile(finalPhotoUrl, `passport-${Date.now()}.png`));
        setPassportStep('sheet');
    } catch (err) {
        setError(`Failed to change passport background. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  }, [passportCroppedImage, addImageToHistory]);

  const handleSheetGenerate = useCallback(async (sheetSize: '4x6' | '5x7' | 'A4', layout: 'portrait' | 'landscape', photoCount: number) => {
    if (!currentImageUrl) return;
    setIsLoading(true);
    
    const DPI = 300;
    const SIZES = {
        '4x6': { w: 4, h: 6 },
        '5x7': { w: 5, h: 7 },
        'A4': { w: 8.27, h: 11.69 },
    };
    const PASSPORT_SIZE_MM = { w: 35, h: 45 };
    const MM_TO_IN = 0.0393701;

    let sheetW_in = SIZES[sheetSize].w;
    let sheetH_in = SIZES[sheetSize].h;

    if (layout === 'landscape') {
      [sheetW_in, sheetH_in] = [sheetH_in, sheetW_in];
    }

    const sheetW_px = sheetW_in * DPI;
    const sheetH_px = sheetH_in * DPI;
    const photoW_px = PASSPORT_SIZE_MM.w * MM_TO_IN * DPI;
    const photoH_px = PASSPORT_SIZE_MM.h * MM_TO_IN * DPI;
    const margin_px = 0.1 * DPI;

    const canvas = document.createElement('canvas');
    canvas.width = sheetW_px;
    canvas.height = sheetH_px;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        setError('Could not create canvas for sheet.');
        setIsLoading(false);
        return;
    }
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, sheetW_px, sheetH_px);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImageUrl;
    img.onload = () => {
        let x = margin_px;
        let y = margin_px;

        for (let i = 0; i < photoCount; i++) {
            // Check if the current photo would go off the right edge, if so, wrap to the next line
            if (x + photoW_px + margin_px > sheetW_px) {
                x = margin_px;
                y += photoH_px + margin_px;
            }

            // Check if the new line would go off the bottom edge
            if (y + photoH_px + margin_px > sheetH_px) {
                console.warn(`Could not fit all ${photoCount} photos. Stopped after drawing ${i}.`);
                break; // Stop drawing, no more space
            }

            ctx.strokeStyle = '#cccccc'; // Light gray for cutting lines
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, photoW_px, photoH_px);
            ctx.drawImage(img, x, y, photoW_px, photoH_px);

            // Move x for the next photo in the row
            x += photoW_px + margin_px;
        }
        
        const sheetDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const sheetFile = dataURLtoFile(sheetDataUrl, `passport-sheet-${sheetSize}-${layout}-${Date.now()}.jpg`);
        addImageToHistory(sheetFile);
        setIsLoading(false);
        setPassportStep('idle');
    };
    img.onerror = () => {
        setError('Could not load image to generate sheet.');
        setIsLoading(false);
    }
  }, [currentImageUrl, addImageToHistory]);
  
  const handlePassportReset = useCallback(() => {
    setPassportStep('cropping');
    setPassportCroppedImage(null);
    resetTransientState();
  }, [resetTransientState]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      resetTransientState();
    }
  }, [canUndo, historyIndex, resetTransientState]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      resetTransientState();
    }
  }, [canRedo, historyIndex, resetTransientState]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      resetTransientState();
    }
  }, [history, resetTransientState]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      resetTransientState();
      setPassportStep('idle');
      setPassportCroppedImage(null);
  }, [resetTransientState]);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `pixshop-edit-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };
  
  const createFilterString = (adj: Adjustments): string => {
    const parts: string[] = [];
    if (adj.brightness !== 0) parts.push(`brightness(${1 + adj.brightness / 100})`);
    if (adj.contrast !== 0) parts.push(`contrast(${1 + adj.contrast / 100})`);
    if (adj.saturation !== 0) parts.push(`saturate(${1 + adj.saturation / 100})`);
    if (adj.temperature > 0) {
        parts.push(`sepia(${adj.temperature / 150})`);
    } else if (adj.temperature < 0) {
        parts.push(`hue-rotate(${adj.temperature * 0.2}deg)`);
    }
    // Sharpness, Vignette, and Color Balance have no direct CSS equivalents, so we ignore them for the real-time preview.
    return parts.join(' ');
  };


  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }
    
    const showCropper = activeTab === 'crop' || (activeTab === 'passport' && passportStep === 'cropping');
    const imageStyle = activeTab === 'adjust' ? { filter: createFilterString(adjustments) } : {};

    const imageDisplay = (
      <div className="relative">
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
            />
        )}
        <img
            ref={imgRef}
            key={currentImageUrl}
            src={currentImageUrl}
            alt="Current"
            onClick={handleImageClick}
            style={imageStyle}
            className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
        />
      </div>
    );
    
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl} 
        alt="Crop this image"
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    const tabs: {id: Tab, name: string, icon: React.FC<{className?: string}>}[] = [
      { id: 'retouch', name: 'Retouch', icon: MagicWandIcon },
      { id: 'crop', name: 'Crop', icon: CropIcon },
      { id: 'adjust', name: 'Adjust', icon: SunIcon },
      { id: 'filters', name: 'Filters', icon: PaletteIcon },
      { id: 'enhance', name: 'Enhance', icon: SparklesIcon },
      { id: 'passport', name: 'Passport', icon: IdCardIcon },
    ];

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300">AI is working its magic...</p>
                </div>
            )}
            
            {showCropper ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : imageDisplay }

            {displayHotspot && !isLoading && activeTab === 'retouch' && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                </div>
            )}
        </div>
        
        <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 grid grid-cols-3 md:grid-cols-6 items-center justify-center gap-2 backdrop-blur-sm">
            {tabs.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex flex-col sm:flex-row items-center justify-center gap-2 capitalize font-semibold py-3 px-4 rounded-md transition-all duration-200 text-base ${
                        activeTab === tab.id 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <tab.icon className="w-5 h-5"/>
                    <span className="text-sm sm:text-base">{tab.name}</span>
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} adjustments={adjustments} onAdjustmentChange={setAdjustments} onAutoAdjust={handleAutoAdjust} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            {activeTab === 'enhance' && <EnhancePanel onUpscale={handleUpscale} isLoading={isLoading} />}
            {activeTab === 'passport' && <PassportPanel step={passportStep} onCropConfirm={handlePassportCrop} onBackgroundChange={handlePassportBgChange} onSheetGenerate={handleSheetGenerate} onReset={handlePassportReset} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-5 h-5 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-5 h-5 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>

            {canUndo && (
              <button 
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                  aria-label="Press and hold to see original image"
              >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  Compare
              </button>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
              >
                Reset
            </button>
            <button 
                onClick={handleUploadNew}
                className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download Image
            </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${currentImage ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;