import React, { useState } from 'react';
import {
  Tag, ShieldCheck, FileSpreadsheet, Copy, Check, Save, ArrowRight
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const MetadataPage: React.FC = () => {
  // Active Pipeline Stage
  const pipelineStages = [
    { id: 1, name: 'Image Ingestion', done: true },
    { id: 2, name: 'Multimodal Vision', done: true },
    { id: 3, name: 'Stock Title', done: true },
    { id: 4, name: 'Description (100-250c)', done: true },
    { id: 5, name: 'Keywords (30-45)', done: true },
    { id: 6, name: 'IP & Safety Audit', done: true },
    { id: 7, name: 'CSV Submission', done: false },
  ];

  // Editable fields
  const [title, setTitle] = useState(
    'Modern Minimalist Architectural Villa in Pine Forest at Sunset'
  );
  const [description, setDescription] = useState(
    'Contemporary luxury residence featuring expansive floor to ceiling glass windows nestled in misty scandinavian forest during golden hour sunset photography.'
  );

  const [keywords, setKeywords] = useState<string[]>([
    'architecture', 'scandinavian', 'villa', 'minimalist', 'forest', 'pine trees',
    'golden hour', 'sunset', 'contemporary', 'luxury', 'real estate', 'exterior',
    'facade', 'modern living', 'eco friendly', 'sustainable', 'glass windows',
    'tranquility', 'nordic', 'landscape', 'dusk', 'wooden deck', 'aesthetic',
    'residential', 'timber', 'nature', 'retreat', 'peaceful', 'horizon', 'scenic',
    'reflection', 'outdoors', 'environment', 'design'
  ]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  const addKeyword = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeywordInput('');
    }
  };

  const removeKeyword = (idx: number) => {
    setKeywords(keywords.filter((_, i) => i !== idx));
  };

  const handleCopyKeywords = () => {
    navigator.clipboard.writeText(keywords.join(', '));
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  const descLen = description.length;
  const isDescValid = descLen >= 100 && descLen <= 250;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Metadata Pipeline
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Commercial stock compliance engine: Vision analysis, metadata enrichment, and IP validation
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            alert('Exporting CSV with sanitized formulas and BOM UTF-8...');
          }}
          icon={<FileSpreadsheet className="w-4 h-4" />}
        >
          Export Submission CSV
        </Button>
      </div>

      {/* Visual Pipeline Representation */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-3">
          {pipelineStages.map((stage, idx) => (
            <React.Fragment key={stage.id}>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    stage.done
                      ? 'bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                      : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {stage.done ? '✓' : stage.id}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    stage.done
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {stage.name}
                </span>
              </div>
              {idx < pipelineStages.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Metadata Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Asset & Vision Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-surface-secondary)]">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1024&q=80"
                alt="Selected asset"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Compliance Badge */}
            <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-[var(--color-success)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>IP & Trademark Safe</span>
                </span>
                <span>Audit Passed</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Deterministic regex and semantic vision checks detected zero logos, visible brands, or model release flags.
              </p>
            </div>

            {/* Extracted Vision Features */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] block">
                Multimodal Vision Analysis
              </span>
              <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs space-y-2">
                <div>
                  <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-semibold">Subjects</span>
                  <span className="text-[var(--color-text)]">Modern villa, pine trees, sunset horizon, glass facade</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block text-[10px] uppercase font-semibold">Lighting & Atmosphere</span>
                  <span className="text-[var(--color-text)]">Golden hour twilight, ambient warm interior, soft diffuse haze</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Metadata Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
            {savedNotification && (
              <div className="p-3 rounded-lg bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Stock metadata updated successfully</span>
              </div>
            )}

            {/* Stock Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] block">
                Stock Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* Commercial Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
                  Commercial Description
                </label>
                <span
                  className={`text-xs font-mono font-semibold ${
                    isDescValid ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'
                  }`}
                >
                  {descLen} / 100–250 chars
                </span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Keywords ({keywords.length} items)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] font-semibold">
                    Target: 30–45
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleCopyKeywords}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedKeywords ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKeywords ? 'Copied' : 'Copy keywords'}</span>
                </button>
              </div>

              {/* Add keyword bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="Type new keyword tag and press Enter..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <Button variant="secondary" size="sm" onClick={addKeyword}>
                  Add Tag
                </Button>
              </div>

              {/* Keywords Container */}
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] max-h-48 overflow-y-auto">
                {keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] shadow-2xs"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(idx)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] ml-0.5 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <Button
                variant="tertiary"
                onClick={() => {
                  setTitle('Modern Minimalist Architectural Villa in Pine Forest at Sunset');
                  setDescription('Contemporary luxury residence featuring expansive floor to ceiling glass windows nestled in misty scandinavian forest during golden hour sunset photography.');
                }}
              >
                Reset
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save Metadata
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
