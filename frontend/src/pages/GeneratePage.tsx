import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wand2, Sliders, ChevronDown, ChevronUp, Download,
  Maximize2, Tag, Copy, Check, Eye, X
} from 'lucide-react';
import { Button } from '../components/common/Button';

interface GeneratedItem {
  id: string;
  url: string;
  prompt: string;
  provider: string;
  model: string;
  dimensions: string;
  createdAt: string;
}

export const GeneratePage: React.FC = () => {
  const navigate = useNavigate();

  // Primary controls
  const [prompt, setPrompt] = useState(
    'A high-end architectural villa nestled in a Scandinavian pine forest at twilight, floor-to-ceiling glass, ambient warm interior lighting, photorealistic commercial stock photography, 8k resolution'
  );
  const [provider, setProvider] = useState('OpenAI');
  const [model, setModel] = useState('GPT Image 2');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('High');
  const [numImages, setNumImages] = useState(4);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('blurry, distorted, oversaturated, watermark, signature');
  const [stylePreset, setStylePreset] = useState('Photorealistic Stock');
  const [seed, setSeed] = useState('');
  const [cfgScale, setCfgScale] = useState(7.5);

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<GeneratedItem | null>(null);

  // Initial demo stock generation results
  const [results, setResults] = useState<GeneratedItem[]>([
    {
      id: 'gen-1',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1024&q=80',
      prompt: 'Modern architectural minimalist glass home nestled in lush forest, soft dusk lighting',
      provider: 'OpenAI',
      model: 'GPT Image 2',
      dimensions: '1024x1024',
      createdAt: new Date().toLocaleTimeString(),
    },
    {
      id: 'gen-2',
      url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1024&q=80',
      prompt: 'Interior architectural living space with panoramic mountain views and natural wood finish',
      provider: 'OpenAI',
      model: 'GPT Image 2',
      dimensions: '1024x1024',
      createdAt: new Date().toLocaleTimeString(),
    },
    {
      id: 'gen-3',
      url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1024&q=80',
      prompt: 'Contemporary kitchen with marble island and soft morning sun rays shining through',
      provider: 'OpenAI',
      model: 'GPT Image 2',
      dimensions: '1024x1024',
      createdAt: new Date().toLocaleTimeString(),
    },
    {
      id: 'gen-4',
      url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1024&q=80',
      prompt: 'Luxury modern terrace overlooking misty evergreen valley, clean Scandinavian aesthetics',
      provider: 'OpenAI',
      model: 'GPT Image 2',
      dimensions: '1024x1024',
      createdAt: new Date().toLocaleTimeString(),
    },
  ]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      const demoImages = [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1024&q=80',
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1024&q=80',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1024&q=80',
        'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1024&q=80',
      ];

      const newItems: GeneratedItem[] = Array.from({ length: numImages }).map((_, i) => ({
        id: 'gen-' + Date.now() + '-' + i,
        url: demoImages[i % demoImages.length],
        prompt: prompt.trim(),
        provider,
        model,
        dimensions: size,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));

      setResults((prev) => [...newItems, ...prev]);
      setIsGenerating(false);
    }, 1200);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Generate Image
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Create production-ready AI images optimized for stock and commercial pipelines
        </p>
      </div>

      {/* Main Generation Studio Card */}
      <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-6">
        {/* Large Comfortable Prompt Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
              Prompt
            </label>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span>{prompt.length} characters</span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[var(--color-primary)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate in detail..."
            className="w-full p-4 text-sm rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-y"
          />
        </div>

        {/* Natural Grouped Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                if (e.target.value === 'OpenAI') setModel('GPT Image 2');
                else if (e.target.value === 'Gemini') setModel('Gemini 3.1 Flash Image');
                else setModel('SD 3.5 Large');
              }}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="OpenAI">OpenAI / GPT Image</option>
              <option value="Gemini">Google Gemini Vision</option>
              <option value="Stability">Stability AI</option>
            </select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {provider === 'OpenAI' && (
                <>
                  <option value="GPT Image 2">GPT Image 2 (DALL-E 3)</option>
                  <option value="GPT-4o Vision">GPT-4o Multimodal</option>
                </>
              )}
              {provider === 'Gemini' && (
                <>
                  <option value="Gemini 3.1 Flash Image">Gemini 3.1 Flash Image</option>
                  <option value="Imagen 3 Commercial">Imagen 3 Commercial Stock</option>
                </>
              )}
              {provider === 'Stability' && (
                <>
                  <option value="SD 3.5 Large">SD 3.5 Large</option>
                  <option value="Flux.1 Schnell">Flux.1 Schnell</option>
                </>
              )}
            </select>
          </div>

          {/* Size & Aspect Ratio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Dimensions
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
              <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
              <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
              <option value="1792x1024">1792 × 1024 (Cinematic 16:9)</option>
            </select>
          </div>

          {/* Quality */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="Standard">Standard</option>
              <option value="High">High (Recommended)</option>
              <option value="Ultra">Ultra / HD Render</option>
            </select>
          </div>
        </div>

        {/* Stepper & Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                Number of images:
              </span>
              <div className="flex items-center border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-secondary)] p-0.5">
                <button
                  type="button"
                  onClick={() => setNumImages((n) => Math.max(1, n - 1))}
                  className="w-7 h-7 flex items-center justify-center text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded cursor-pointer"
                >
                  −
                </button>
                <span data-testid="num-images-value" className="w-8 text-center text-xs font-mono font-bold text-[var(--color-text)]">
                  {numImages}
                </span>
                <button
                  type="button"
                  onClick={() => setNumImages((n) => Math.min(10, n + 1))}
                  className="w-7 h-7 flex items-center justify-center text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced settings</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Primary Strongest Call-to-Action */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={!prompt.trim() || isGenerating}
            icon={<Wand2 className="w-4 h-4" />}
          >
            {isGenerating ? `Generating ${numImages} Images...` : 'Generate Images'}
          </Button>
        </div>

        {/* Expandable Advanced Settings */}
        {showAdvanced && (
          <div className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  Style Preset
                </label>
                <select
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                >
                  <option value="Photorealistic Stock">Photorealistic Stock</option>
                  <option value="Studio Commercial">Studio Commercial</option>
                  <option value="Cinematic Lighting">Cinematic Lighting</option>
                  <option value="Minimalist Architecture">Minimalist Architecture</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  Guidance CFG Scale ({cfgScale})
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  Random Seed (Optional)
                </label>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="e.g. 428919"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Negative Prompt
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Elements to exclude from the generation..."
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generated Results Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
            <span>Recent Generations</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] font-mono">
              {results.length}
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate('/gallery')}
            >
              Open Gallery
            </Button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm hover:border-[var(--color-primary-accent)] transition-all"
            >
              <div className="relative aspect-square overflow-hidden bg-[var(--color-surface-secondary)]">
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Floating tags */}
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono">
                    {item.dimensions}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--color-primary)] text-[10px] text-white font-medium">
                    {item.provider}
                  </span>
                </div>

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 z-20">
                  <button
                    onClick={() => setSelectedPreview(item)}
                    className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Quick Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = item.url;
                      link.download = `generated-${item.id}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate('/upscaling')}
                    className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Upscale 4x"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate('/metadata')}
                    className="p-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 shadow-sm cursor-pointer"
                    title="Generate Stock Metadata"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <p className="text-xs text-[var(--color-text)] line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-1">
                  <span>{item.model}</span>
                  <span>{item.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                {selectedPreview.dimensions} • {selectedPreview.model}
              </span>
              <button
                onClick={() => setSelectedPreview(null)}
                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden aspect-square bg-[var(--color-surface-secondary)] flex items-center justify-center">
              <img
                src={selectedPreview.url}
                alt={selectedPreview.prompt}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="text-xs text-[var(--color-text)]">{selectedPreview.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};
