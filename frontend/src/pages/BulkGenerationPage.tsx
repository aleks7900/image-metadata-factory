import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Download, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const BulkGenerationPage: React.FC = () => {
  const navigate = useNavigate();

  // Workflow Steps: 'input' | 'config' | 'processing' | 'results'
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Input Data
  const [promptText, setPromptText] = useState(
    `Modern Scandinavian eco-villa in alpine autumn forest, 8k\nCommercial studio product shot of ceramic teapot with steam\nFuturistic solar energy farm in desert with dramatic sunrise\nUrban rooftop hydroponic garden with green vegetation\nMinimalist Japanese tea room with warm sunlight through shoji screens\nCyberpunk cityscape street market with neon holographic billboards\nAerial photograph of emerald coastal reef with azure ocean waters\nHigh-end ergonomic workspace with wooden desk and potted bonsai`
  );

  // Configuration
  const [batchName, setBatchName] = useState('Commercial Q4 Bulk Production');
  const [provider, setProvider] = useState('OpenAI');
  const [model, setModel] = useState('GPT Image 2');
  const [aspectRatio, setAspectRatio] = useState('1024x1024');
  const [concurrency, setConcurrency] = useState(4);
  const [autoStockMetadata, setAutoStockMetadata] = useState(true);

  // Simulated live progress stats
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 8,
    completed: 6,
    running: 2,
    queued: 0,
    failed: 0,
  });

  const progressPercentage = Math.round((stats.completed / (stats.total || 1)) * 100);

  const promptsList = promptText
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const handleStartGeneration = () => {
    setCurrentStep(3);
    setIsProcessing(true);
    setStats({
      total: promptsList.length,
      completed: 0,
      running: 2,
      queued: Math.max(0, promptsList.length - 2),
      failed: 0,
    });

    // Simulate progress ticks
    let done = 0;
    const interval = setInterval(() => {
      done++;
      if (done >= promptsList.length) {
        clearInterval(interval);
        setStats({
          total: promptsList.length,
          completed: promptsList.length,
          running: 0,
          queued: 0,
          failed: 0,
        });
        setIsProcessing(false);
        setCurrentStep(4);
      } else {
        setStats({
          total: promptsList.length,
          completed: done,
          running: Math.min(2, promptsList.length - done),
          queued: Math.max(0, promptsList.length - done - 2),
          failed: 0,
        });
      }
    }, 900);
  };

  const steps = [
    { num: 1, label: 'Input' },
    { num: 2, label: 'Configuration' },
    { num: 3, label: 'Processing' },
    { num: 4, label: 'Results' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Bulk Generation
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          High-throughput batch production from prompt matrices, CSV datasets, and automated workflows
        </p>
      </div>

      {/* Workflow Step Stepper */}
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    currentStep === step.num
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : currentStep > step.num
                      ? 'bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                      : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {currentStep > step.num ? '✓' : step.num}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    currentStep === step.num
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 ${
                    currentStep > step.num
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-[var(--color-border)]'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Input */}
      {currentStep === 1 && (
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text)]">
                1. Prompts Input
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Paste one prompt per line, or upload a CSV file with your generation matrix
              </p>
            </div>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]">
              {promptsList.length} Prompts Loaded
            </span>
          </div>

          <div className="space-y-2">
            <textarea
              rows={8}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter one prompt per line..."
              className="w-full p-4 text-sm font-mono rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="tertiary"
                size="sm"
                onClick={() =>
                  setPromptText(
                    `Commercial stock of modern solar panels on suburban house\nHigh-end electric vehicle charging at futuristic smart city station\nOrganic vegetables freshly harvested in wicker basket on rustic wooden table`
                  )
                }
              >
                Load Sample Prompts
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={() => setCurrentStep(2)}
              disabled={promptsList.length === 0}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Configuration */}
      {currentStep === 2 && (
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              2. Batch & Generation Settings
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Select model specifications, concurrency limits, and stock compliance flags
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Batch Name
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Model Provider
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
                <option value="OpenAI">OpenAI (DALL-E 3 / GPT Image)</option>
                <option value="Gemini">Google Gemini 3.1 Flash Image</option>
                <option value="Stability">Stability AI (SD 3.5 Large)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Generation Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value={model}>{model}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Aspect Ratio / Dimensions
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
                <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
                <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Worker Concurrency ({concurrency} workers)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-[var(--color-text)] block">
                Auto-generate Stock Metadata
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                Automatically run Multimodal Vision, stock titles, 30–45 keywords, and IP audits on each result
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoStockMetadata}
              onChange={(e) => setAutoStockMetadata(e.target.checked)}
              className="w-5 h-5 accent-[var(--color-primary)] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="tertiary" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleStartGeneration}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              Start Bulk Generation ({promptsList.length} Tasks)
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 & 4: Processing & Results Dashboard */}
      {(currentStep === 3 || currentStep === 4) && (
        <div className="space-y-5">
          {/* Main Progress KPI Card */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  {batchName}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {stats.completed} / {stats.total} completed
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/20 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-info)] animate-ping" />
                    Running
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                )}
              </div>
            </div>

            {/* Material Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[var(--color-text-muted)]">{progressPercentage}% Completed</span>
                <span className="text-[var(--color-primary)]">
                  {stats.completed} of {stats.total} assets
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden border border-[var(--color-border-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Semantic KPI Counters */}
            <div className="grid grid-cols-4 gap-3 pt-2 text-center">
              <div className="p-3.5 rounded-xl bg-[var(--color-info-bg)] border border-[var(--color-info)]/20 text-[var(--color-info)]">
                <div className="text-2xl font-extrabold font-mono">{stats.running}</div>
                <div className="text-xs uppercase font-semibold mt-0.5">Running</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/20 text-[var(--color-warning)]">
                <div className="text-2xl font-extrabold font-mono">{stats.queued}</div>
                <div className="text-xs uppercase font-semibold mt-0.5">Queued</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-[var(--color-success)]">
                <div className="text-2xl font-extrabold font-mono">{stats.completed}</div>
                <div className="text-xs uppercase font-semibold mt-0.5">Completed</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-error-bg)] border border-[var(--color-error)]/20 text-[var(--color-error)]">
                <div className="text-2xl font-extrabold font-mono">{stats.failed}</div>
                <div className="text-xs uppercase font-semibold mt-0.5">Failed</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <Button
                variant="tertiary"
                onClick={() => setCurrentStep(1)}
              >
                New Bulk Batch
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/batches')}
                >
                  View in Batches
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/gallery')}
                  icon={<Download className="w-4 h-4" />}
                >
                  Open Gallery & Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
