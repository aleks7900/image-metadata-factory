import React, { useState, useEffect } from 'react';
import {
  X, Check, XCircle, RefreshCw, Copy,
  ShieldAlert, ShieldCheck, Save, Download, Tag
} from 'lucide-react';
import type { ImageJob, ReviewDecision } from '../types';
import { JobStatusBadge, RiskBadge, ReviewDecisionBadge } from './StatusBadges';
import { apiClient } from '../api/client';
import { Button } from './common/Button';

interface ImageDetailModalProps {
  image: ImageJob | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  image,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'metadata' | 'vision' | 'safety'>('metadata');

  // Editable Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (image) {
      setTitle(image.title || '');
      setDescription(image.description || '');
      setKeywords(image.keywords || []);
      setStatusMessage(null);
    }
  }, [image]);

  if (!isOpen || !image) return null;

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await apiClient.updateImageMetadata(image.id, {
        title: title.trim(),
        description: description.trim(),
        keywords,
      });
      setStatusMessage('Metadata saved successfully!');
      onUpdated();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage('Failed to save metadata: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReview = async (decision: ReviewDecision) => {
    setActionLoading(true);
    try {
      await apiClient.reviewImage(image.id, decision);
      onUpdated();
      onClose();
    } catch (err: any) {
      alert('Failed to update review decision: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    try {
      await apiClient.regenerateImage(image.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      alert('Failed to trigger regeneration: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      await apiClient.retryImage(image.id);
      onUpdated();
      onClose();
    } catch (err: any) {
      alert('Failed to trigger retry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addKeyword = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const copyKeywordsToClipboard = () => {
    navigator.clipboard.writeText(keywords.join(', '));
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = apiClient.getImagePreviewUrl(image.id);
    link.download = image.originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const descLength = description.length;
  const isDescLengthValid = descLength >= 100 && descLength <= 250;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex items-center gap-3 truncate">
            <span className="font-mono text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded border border-[var(--color-border)] truncate">
              {image.originalFilename}
            </span>
            <JobStatusBadge status={image.status} />
            <RiskBadge risk={image.riskStatus} />
            <ReviewDecisionBadge decision={image.reviewDecision} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
          {/* Left Column: Image Preview + Compliance Findings (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 bg-[var(--color-surface-secondary)]/50 overflow-y-auto">
            {/* Image Preview Box */}
            <div className="relative rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] aspect-square flex items-center justify-center shadow-sm">
              <img
                src={apiClient.getImagePreviewUrl(image.id)}
                alt={image.originalFilename}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Quick Image Specs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                <span className="block text-[10px] uppercase font-semibold">File Format</span>
                <span className="font-mono text-[var(--color-text)] font-medium">{image.mimeType}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                <span className="block text-[10px] uppercase font-semibold">File Size</span>
                <span className="font-mono text-[var(--color-text)] font-medium">
                  {(image.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>

            {/* Safety & IP Summary Card */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[var(--color-primary)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                    Stock Audit & Compliance
                  </h4>
                </div>
                <RiskBadge risk={image.riskStatus} />
              </div>

              {image.safetyFindings && image.safetyFindings.length > 0 ? (
                <div className="space-y-2">
                  {image.safetyFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-[var(--color-warning)]">{finding.type}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {(finding.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <div className="text-[var(--color-text)] font-medium">{finding.value}</div>
                      {finding.reason && (
                        <div className="text-[11px] text-[var(--color-text-muted)]">{finding.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[var(--color-success)] p-2 rounded-lg bg-[var(--color-success-bg)]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Zero commercial infringement or trademark flags detected.</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metadata Editor & Vision Analysis (7 cols) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[var(--color-surface)]">
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-[var(--color-border)] px-6 pt-2 bg-[var(--color-surface)]">
              <button
                onClick={() => setActiveTab('metadata')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'metadata'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Stock Metadata Editor
              </button>
              <button
                onClick={() => setActiveTab('vision')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'vision'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Vision Analysis
              </button>
              <button
                onClick={() => setActiveTab('safety')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'safety'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Raw Model Audit
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {statusMessage && (
                <div className="p-3 text-xs font-medium rounded-lg bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] border border-[var(--color-primary)]/20">
                  {statusMessage}
                </div>
              )}

              {activeTab === 'metadata' && (
                <div className="space-y-4">
                  {/* Title Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
                        Stock Title
                      </label>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        Natural & descriptive (no brand stuffing)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Modern Architecture with Sustainable Solar Panels at Sunset"
                      className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Description Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
                        Commercial Description
                      </label>
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          isDescLengthValid
                            ? 'text-[var(--color-success)]'
                            : 'text-[var(--color-warning)]'
                        }`}
                      >
                        {descLength} / 100-250 characters
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter 100 to 250 character high-conversion stock description..."
                      className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                    />
                  </div>

                  {/* Keywords Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <span>Keywords ({keywords.length} items)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copyKeywordsToClipboard}
                          className="text-[11px] text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKeywords ? 'Copied!' : 'Copy all'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Add Keyword Input */}
                    <div className="flex items-center gap-2 mb-2.5">
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
                        placeholder="Add new keyword tag and press Enter..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <Button variant="secondary" size="sm" onClick={addKeyword}>
                        Add
                      </Button>
                    </div>

                    {/* Keywords Chips */}
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                      {keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] shadow-xs"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => removeKeyword(idx)}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={handleSaveMetadata}
                      loading={isSaving}
                      icon={<Save className="w-4 h-4" />}
                    >
                      Save Metadata
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'vision' && (
                <div className="space-y-3">
                  {image.visionAnalysis ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] space-y-2">
                        <span className="font-semibold text-[var(--color-text)] block">
                          Visual Subjects & Objects
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {image.visionAnalysis.subjects?.map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                            >
                              {s}
                            </span>
                          ))}
                          {image.visionAnalysis.objects?.map((o, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                            >
                              {o}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                          <span className="font-semibold text-[var(--color-text)] block mb-1">
                            Environment & Lighting
                          </span>
                          <p className="text-[var(--color-text-muted)]">
                            {image.visionAnalysis.environment || 'N/A'} • {image.visionAnalysis.lighting || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                          <span className="font-semibold text-[var(--color-text)] block mb-1">
                            Mood & Aesthetic
                          </span>
                          <p className="text-[var(--color-text-muted)]">
                            {image.visionAnalysis.mood || 'N/A'} • {image.visionAnalysis.visualStyle || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Vision analysis data will appear here once the multimodal model processes this asset.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'safety' && (
                <div className="space-y-2">
                  <pre className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-muted)] overflow-x-auto max-h-72">
                    {image.rawVisionAnalysisJson || JSON.stringify(image.safetyFindings || [], null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer Decision Toolbar */}
            <div className="px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={actionLoading}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Regenerate
                </Button>
                {image.status === 'FAILED' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRetry}
                    disabled={actionLoading}
                  >
                    Retry Job
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleReview('REJECTED')}
                  disabled={actionLoading}
                  icon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleReview('APPROVED')}
                  disabled={actionLoading}
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  Approve Asset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
