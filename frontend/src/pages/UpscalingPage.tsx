import React, { useState, useRef } from 'react';
import {
  Maximize2, UploadCloud, Download, RefreshCw, ArrowRight, Zap
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const UpscalingPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upscale configuration
  const [scaleFactor, setScaleFactor] = useState<'2x' | '4x' | '8x'>('4x');
  const [model, setModel] = useState('RealESRGAN_x4plus');
  const [denoiseLevel, setDenoiseLevel] = useState(0.2);
  const [faceEnhance, setFaceEnhance] = useState(true);

  // Images state
  const [originalImageUrl, setOriginalImageUrl] = useState(
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1024&q=80'
  );
  const [originalDimensions, setOriginalDimensions] = useState('1024 × 1024');
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=4096&q=95'
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);

  const targetDimensions =
    scaleFactor === '2x'
      ? '2048 × 2048'
      : scaleFactor === '4x'
      ? '4096 × 4096'
      : '8192 × 8192';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImageUrl(url);
      setOriginalDimensions('1024 × 1024');
      setUpscaledImageUrl(null);
    }
  };

  const handleRunUpscale = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setUpscaledImageUrl(originalImageUrl);
      setIsProcessing(false);
    }, 1500);
  };

  const handleDownload = () => {
    if (!upscaledImageUrl) return;
    const link = document.createElement('a');
    link.href = upscaledImageUrl;
    link.download = `upscaled-${scaleFactor}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Image Upscaling
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Super-resolution deep learning pipeline for high-dpi commercial stock prints
          </p>
        </div>

        {/* Discrete GPU indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          <Zap className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>CUDA Acceleration • TensorRT Ready</span>
        </div>
      </div>

      {/* Main Studio View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Before/After Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
            {/* Resolution Transformation Header */}
            <div className="flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--color-text)]">Original</span>
                <span className="font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                  {originalDimensions}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-[var(--color-primary)]">
                <span>{scaleFactor}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--color-primary)]">Upscaled</span>
                <span className="font-mono text-[var(--color-primary)] bg-[var(--color-primary-container)] px-2 py-0.5 rounded border border-[var(--color-primary)]/20 font-bold">
                  {targetDimensions}
                </span>
              </div>
            </div>

            {/* Interactive Split View Canvas */}
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-black flex items-center justify-center select-none">
              {upscaledImageUrl ? (
                <>
                  {/* Upscaled Background */}
                  <img
                    src={upscaledImageUrl}
                    alt="Upscaled"
                    className="absolute inset-0 w-full h-full object-contain"
                  />

                  {/* Split Clip Overlay */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  >
                    <img
                      src={originalImageUrl}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-contain filter blur-[1px]"
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-mono">
                      Original ({originalDimensions})
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[var(--color-primary)] text-white text-[10px] font-mono">
                    Upscaled ({targetDimensions})
                  </div>

                  {/* Slider bar line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-10"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[10px] font-bold text-slate-800">
                      ↔
                    </div>
                  </div>

                  {/* Range input to slide */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
                  />
                </>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={originalImageUrl}
                    alt="Original"
                    className="max-h-full max-w-full object-contain"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
                      <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                      <span className="text-sm font-semibold">Running CUDA Super-Resolution...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Comparison Helper */}
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1">
              <span>Drag slider left and right to inspect fine texture resolution</span>
              {upscaledImageUrl && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownload}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Ultra-HD
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Parameters & Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
              Upscaling Parameters
            </h3>

            {/* Input Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Input Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface-secondary)]/50 hover:bg-[var(--color-surface-secondary)] text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <UploadCloud className="w-5 h-5 mx-auto text-[var(--color-primary)] mb-1" />
                <span className="text-xs font-medium text-[var(--color-text)] block">
                  Upload single or batch images
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  PNG, JPG, WEBP up to 50MB
                </span>
              </div>
            </div>

            {/* Scale Factor Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Scale Factor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['2x', '4x', '8x'] as const).map((factor) => (
                  <button
                    key={factor}
                    type="button"
                    onClick={() => setScaleFactor(factor)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      scaleFactor === factor
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                    }`}
                  >
                    {factor}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Enhancement Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="RealESRGAN_x4plus">Real-ESRGAN+ (Stock & Photo)</option>
                <option value="UltraSharp">UltraSharp Commercial v2</option>
                <option value="Anime_6B">Digital Art & Vector Clean</option>
                <option value="Bicubic_HD">Bicubic Smooth</option>
              </select>
            </div>

            {/* Denoise Level Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text)]">Denoise Strength</span>
                <span className="font-mono text-[var(--color-text-muted)]">{Math.round(denoiseLevel * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={denoiseLevel}
                onChange={(e) => setDenoiseLevel(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>

            {/* Face Enhancement Toggle */}
            <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--color-text)] block">
                  Face & Eye Restoration
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  Fix minor facial artifacts via CodeFormer
                </span>
              </div>
              <input
                type="checkbox"
                checked={faceEnhance}
                onChange={(e) => setFaceEnhance(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-primary)] rounded cursor-pointer"
              />
            </div>

            {/* Upscale CTA Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleRunUpscale}
                loading={isProcessing}
                icon={<Maximize2 className="w-4 h-4" />}
              >
                {isProcessing ? 'Upscaling Asset...' : `Upscale to ${targetDimensions}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
