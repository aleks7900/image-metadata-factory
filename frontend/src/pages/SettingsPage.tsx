import React, { useState } from 'react';
import { Sun, Moon, Save, Check } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Settings State
  const [defaultProvider, setDefaultProvider] = useState('OpenAI');
  const [defaultResolution, setDefaultResolution] = useState('1024x1024');
  const [minKeywords, setMinKeywords] = useState(30);
  const [maxKeywords, setMaxKeywords] = useState(45);
  const [minDescChars, setMinDescChars] = useState(100);
  const [maxDescChars, setMaxDescChars] = useState(250);
  const [workerConcurrency, setWorkerConcurrency] = useState(5);
  const [autoRetryFailed, setAutoRetryFailed] = useState(true);
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Application Settings
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Configure default generation parameters, commercial stock compliance rules, and theme preferences
        </p>
      </div>

      {savedNotification && (
        <div className="p-3 rounded-xl bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Preferences saved successfully</span>
        </div>
      )}

      {/* Theme & Appearance */}
      <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
          Theme & Visual Appearance
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Select between light and green-tinted deep dark mode designed for creative sessions.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-semibold">Light Theme</div>
              <div className="text-xs text-[var(--color-text-muted)]">Clean mint and white surfaces</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
            }`}
          >
            <Moon className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold">Dark Theme</div>
              <div className="text-xs text-[var(--color-text-muted)]">Green-tinted neutral charcoal</div>
            </div>
          </button>
        </div>
      </div>

      {/* Stock Marketplace Compliance Rules */}
      <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
          Stock Compliance Policies (Adobe Stock, Getty, Shutterstock)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Keywords Target Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minKeywords}
                onChange={(e) => setMinKeywords(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">to</span>
              <input
                type="number"
                value={maxKeywords}
                onChange={(e) => setMaxKeywords(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">tags</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Description Character Length
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minDescChars}
                onChange={(e) => setMinDescChars(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">to</span>
              <input
                type="number"
                value={maxDescChars}
                onChange={(e) => setMaxDescChars(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">chars</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generation & Worker Concurrency */}
      <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
          Backend Processing Concurrency & Defaults
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Worker Pool Concurrency ({workerConcurrency} parallel threads)
            </label>
            <input
              type="range"
              min="1"
              max="16"
              value={workerConcurrency}
              onChange={(e) => setWorkerConcurrency(parseInt(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Default Generator Provider
            </label>
            <select
              value={defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="OpenAI">OpenAI (DALL-E 3 / GPT Image)</option>
              <option value="Gemini">Google Gemini Vision</option>
              <option value="Stability">Stability AI</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text)]">
              Default Resolution
            </label>
            <select
              value={defaultResolution}
              onChange={(e) => setDefaultResolution(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="1024x1024">1024 × 1024 (Square 1:1)</option>
              <option value="1536x1024">1536 × 1024 (Landscape 3:2)</option>
              <option value="1024x1536">1024 × 1536 (Portrait 2:3)</option>
            </select>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[var(--color-text)] block">
              Auto-retry Transient Failures
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Retry rate-limited LLM vision calls with exponential backoff
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoRetryFailed}
            onChange={(e) => setAutoRetryFailed(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)] rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          icon={<Save className="w-4 h-4" />}
        >
          Save All Settings
        </Button>
      </div>
    </div>
  );
};
