import React, { useState, useEffect } from 'react';
import {
  X, Check, XCircle, RefreshCw, Sparkles, Copy,
  ShieldAlert, ShieldCheck, UserCheck, FileText,
  Cpu, Clock, Save
} from 'lucide-react';
import type { ImageJob, ReviewDecision } from '../types';
import { JobStatusBadge, RiskBadge, ReviewDecisionBadge } from './StatusBadges';
import { apiClient } from '../api/client';

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

  const descLength = description.length;
  const isDescLengthValid = descLength >= 100 && descLength <= 250;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3 truncate">
            <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate">
              {image.originalFilename}
            </span>
            <JobStatusBadge status={image.status} />
            <RiskBadge risk={image.riskStatus} />
            <ReviewDecisionBadge decision={image.reviewDecision} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: Image Preview + Compliance Findings (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-slate-950/40 overflow-y-auto">
            {/* Image Preview */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[260px] max-h-[380px]">
              <img
                src={apiClient.getImagePreviewUrl(image.id)}
                alt={image.originalFilename}
                className="w-full h-full object-contain max-h-[380px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-950/80 backdrop-blur rounded text-[10px] font-mono text-slate-400 border border-slate-800">
                {(image.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {image.mimeType}
              </div>
            </div>

            {/* Error Message if Failed */}
            {image.errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                  <XCircle className="w-4 h-4" />
                  <span>Pipeline Failure Reason:</span>
                </div>
                <p className="font-mono text-[11px] break-all">{image.errorMessage}</p>
              </div>
            )}

            {/* Commercial Risk & Compliance Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span>Commercial Safety & IP Compliance</span>
              </h3>

              {image.riskStatus === 'SAFE' && image.safetyFindings.length === 0 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Zero trademarks, recognizable faces, or copyright risks detected. Eligible for commercial stock submission.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {image.safetyFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        finding.type === 'TRADEMARK'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                          : finding.type === 'PERSON'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                          {finding.type === 'TRADEMARK' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                          {finding.type === 'PERSON' && <UserCheck className="w-3.5 h-3.5 text-amber-400" />}
                          {finding.type} WARNING: {finding.value}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono">
                          {(finding.confidence * 100).toFixed(0)}% Conf
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {finding.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Telemetry */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Telemetry</div>
              <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Duration: <strong className="text-slate-200">{image.processingDurationMs}ms</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Retries: <strong className="text-slate-200">{image.retryCount}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Metadata, Vision Analysis Tabs (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full bg-slate-900">
            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800">
              <button
                onClick={() => setActiveTab('metadata')}
                className={`pb-3 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'metadata'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Stock Metadata</span>
              </button>
              <button
                onClick={() => setActiveTab('vision')}
                className={`pb-3 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'vision'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Vision Analysis Context</span>
              </button>
            </div>

            {/* Tab 1: Editable Stock Metadata */}
            {activeTab === 'metadata' && (
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {statusMessage && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    statusMessage.includes('success')
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {statusMessage}
                  </div>
                )}

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Stock Title
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {title.length} chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter descriptive stock title..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Stock Description
                    </label>
                    <span className={`text-[11px] font-mono ${
                      isDescLengthValid ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {descLength} / 100–250 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter natural, commercial scene description..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm leading-relaxed resize-none"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Ordered Keywords
                      </label>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        keywords.length >= 30 && keywords.length <= 45
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {keywords.length} / 30–45
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyKeywordsToClipboard}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKeywords ? 'Copied!' : 'Copy All'}</span>
                    </button>
                  </div>

                  {/* Keyword Adder */}
                  <div className="flex items-center gap-2 mb-3">
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
                      placeholder="Type keyword and press Enter or Add..."
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addKeyword}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Keywords Chips Container */}
                  <div className="max-h-48 overflow-y-auto p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap gap-1.5">
                    {keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-800 text-slate-200 border border-slate-700/80 group"
                      >
                        <span className="text-[9px] font-mono text-slate-500 font-bold">{idx + 1}</span>
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => removeKeyword(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Save Metadata Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveMetadata}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving Changes...' : 'Save Metadata Changes'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Vision Analysis */}
            {activeTab === 'vision' && (
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {image.visionAnalysis ? (
                  <div className="space-y-4 text-xs">
                    {/* Visual Attributes Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Environment</span>
                        <p className="text-slate-200 mt-1 font-medium">{image.visionAnalysis.environment || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Lighting & Mood</span>
                        <p className="text-slate-200 mt-1 font-medium">
                          {image.visionAnalysis.lighting || 'N/A'} • {image.visionAnalysis.mood || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Visual Style & Composition</span>
                        <p className="text-slate-200 mt-1 font-medium">
                          {image.visionAnalysis.visualStyle || 'N/A'} • {image.visionAnalysis.composition || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Dominant Colors</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {image.visionAnalysis.colors?.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Subjects and Objects */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Identified Subjects & Objects</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {image.visionAnalysis.subjects?.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs">
                            {s}
                          </span>
                        ))}
                        {image.visionAnalysis.objects?.map((o, i) => (
                          <span key={i} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs">
                            {o}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Commercial Concepts */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Marketplace Concepts</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {image.visionAnalysis.concepts?.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">
                            #{c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Raw JSON */}
                    {image.rawVisionAnalysisJson && (
                      <div className="mt-4">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-1.5">
                          Raw Structured LLM JSON
                        </span>
                        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                          {image.rawVisionAnalysisJson}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Vision analysis data will appear here once processed by multimodal model.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReview('APPROVED')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Approve Image</span>
            </button>
            <button
              onClick={() => handleReview('REJECTED')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Image</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Regenerate</span>
            </button>

            {image.status === 'FAILED' && (
              <button
                onClick={handleRetry}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/80 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Pipeline</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
