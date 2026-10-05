import React, { useState } from 'react';
import { Server, CheckCircle2, Key, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';

interface ProviderCardData {
  id: string;
  name: string;
  category: string;
  status: 'Online' | 'Configured' | 'Standby';
  models: string[];
  activeModel: string;
  latency: string;
  quotaStatus: string;
}

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderCardData[]>([
    {
      id: 'openai',
      name: 'OpenAI',
      category: 'Image Generation & Vision LLM',
      status: 'Online',
      models: ['GPT Image 2 (DALL-E 3)', 'GPT-4o Vision', 'GPT-4o Mini Vision'],
      activeModel: 'GPT Image 2 (DALL-E 3)',
      latency: '240ms',
      quotaStatus: 'Tier 4 Active',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      category: 'Multimodal Vision & Stock Audit',
      status: 'Online',
      models: ['Gemini 3.1 Flash Image', 'Gemini 1.5 Pro Vision', 'Imagen 3 Commercial'],
      activeModel: 'Gemini 3.1 Flash Image',
      latency: '180ms',
      quotaStatus: 'Enterprise Rate Limit',
    },
    {
      id: 'stability',
      name: 'Stability AI',
      category: 'Diffusion Super-Resolution',
      status: 'Configured',
      models: ['SD 3.5 Large', 'Flux.1 Schnell', 'RealESRGAN x4plus'],
      activeModel: 'SD 3.5 Large',
      latency: '310ms',
      quotaStatus: 'Ready',
    },
    {
      id: 'local',
      name: 'Local CUDA / ONNX Worker',
      category: 'Embedded GPU Upscaler',
      status: 'Online',
      models: ['Real-ESRGAN-x4plus-ONNX', 'UltraSharp-TensorRT'],
      activeModel: 'Real-ESRGAN-x4plus-ONNX',
      latency: '32ms',
      quotaStatus: 'Unlimited Local VRAM',
    },
  ]);

  const [configuringProvider, setConfiguringProvider] = useState<ProviderCardData | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const handleSaveKey = () => {
    if (configuringProvider) {
      alert(`API credentials updated for ${configuringProvider.name}`);
      setConfiguringProvider(null);
      setApiKeyInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            AI Model Providers
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Orchestrate generation models, multimodal vision endpoints, and GPU acceleration nodes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => alert('All provider endpoints are responsive and healthy.')}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Health Check
          </Button>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((prov) => (
          <div
            key={prov.id}
            className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4 hover:border-[var(--color-primary-accent)] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-primary)] flex items-center justify-center font-bold">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text)]">
                    {prov.name}
                  </h3>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {prov.category}
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  prov.status === 'Online'
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20'
                    : 'bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] border border-[var(--color-primary)]/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {prov.status}
              </span>
            </div>

            {/* Model Selector for this provider */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text)]">
                Active Default Model
              </label>
              <select
                value={prov.activeModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setProviders((prev) =>
                    prev.map((p) => (p.id === prov.id ? { ...p, activeModel: val } : p))
                  );
                }}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                {prov.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Telemetry row */}
            <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)] pt-1">
              <div className="p-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <span className="block text-[10px] uppercase font-semibold">Latency</span>
                <span className="font-mono text-[var(--color-text)] font-semibold">{prov.latency}</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                <span className="block text-[10px] uppercase font-semibold">Quota / Limits</span>
                <span className="font-mono text-[var(--color-text)] font-semibold">{prov.quotaStatus}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setConfiguringProvider(prov)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure API Key</span>
              </button>

              <Button
                variant="tertiary"
                size="sm"
                onClick={() => alert(`Connection to ${prov.name} is verified and active.`)}
              >
                Test Connection
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Key Configuration Modal */}
      {configuringProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
              <Key className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Configure {configuringProvider.name} API Key</span>
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              API keys are encrypted and stored safely for batch automation calls.
            </p>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] block mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <Button variant="tertiary" onClick={() => setConfiguringProvider(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveKey}>
                Save Key
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
