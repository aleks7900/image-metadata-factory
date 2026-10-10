import React, { useState, useEffect } from 'react';
import { X, Download, ShieldCheck, FileSpreadsheet, Check, AlertCircle, AlertTriangle, PackageCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from './common/Button';
import type { CsvValidationResult } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  batchId: string;
  batchName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  batchId,
  batchName,
  onClose,
}) => {
  const [policy, setPolicy] = useState<'SAFE_AND_APPROVED' | 'SAFE_ONLY' | 'ALL'>('SAFE_AND_APPROVED');
  const [format, setFormat] = useState<'ADOBE_STOCK' | 'STANDARD' | 'EXTENDED'>('STANDARD');
  const [validation, setValidation] = useState<CsvValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && batchId) {
      runValidation();
    }
  }, [isOpen, batchId, policy, format]);

  const runValidation = async () => {
    try {
      setIsValidating(true);
      const res = await apiClient.validateCsv(batchId, policy);
      setValidation(res);
    } catch {
      // Ignored in test/offline environments
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const url = apiClient.getExportUrl(batchId, policy, format);
    window.open(url, '_blank');
    onClose();
  };

  const handleDownloadZip = () => {
    const url = apiClient.getZipExportUrl(batchId, policy, format);
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                Export Batch to CSV
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-bold uppercase tracking-wider">
                  Adobe Stock Ready
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-md">
                {batchName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] mb-2">
              Export Specification Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat('ADOBE_STOCK')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  format === 'ADOBE_STOCK'
                    ? 'border-red-500 bg-red-500/10 text-red-500 shadow-sm'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Adobe Stock</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500 text-white font-bold">
                    Official
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1 font-mono">
                  Filename, Title, Keywords, Category, Releases
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('STANDARD')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'STANDARD'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]'
                }`}
              >
                <div className="text-sm font-semibold">Standard CSV</div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1 font-mono">
                  filename, title, description, keywords
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('EXTENDED')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'EXTENDED'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]'
                }`}
              >
                <div className="text-sm font-semibold">Extended Audit</div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Full compliance data, risk scores & IP findings
                </div>
              </button>
            </div>
          </div>

          {/* Policy Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] mb-2">
              Commercial Export Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPolicy('SAFE_AND_APPROVED')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  policy === 'SAFE_AND_APPROVED'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
                }`}
              >
                <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                  policy === 'SAFE_AND_APPROVED' ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'
                }`}>
                  {policy === 'SAFE_AND_APPROVED' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-xs font-semibold block">Safe & Approved Only</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Verified SAFE + manual reviews</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPolicy('SAFE_ONLY')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  policy === 'SAFE_ONLY'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
                }`}
              >
                <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                  policy === 'SAFE_ONLY' ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'
                }`}>
                  {policy === 'SAFE_ONLY' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-xs font-semibold block">Strict Safe Only</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Zero warnings only</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPolicy('ALL')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  policy === 'ALL'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
                }`}
              >
                <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                  policy === 'ALL' ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'
                }`}>
                  {policy === 'ALL' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-xs font-semibold block">All Completed</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">All processed rows</span>
                </div>
              </button>
            </div>
          </div>

          {/* Live Pre-Export Validation Summary */}
          {validation && (
            <div className={`p-4 rounded-xl border ${
              validation.valid
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}>
              <div className="flex items-center justify-between font-semibold text-xs mb-2">
                <div className="flex items-center gap-2">
                  {validation.valid ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>
                    {isValidating
                      ? 'Validating Adobe Stock compliance...'
                      : validation.valid
                      ? `Adobe Stock Validation Passed (${validation.exportableImagesCount} images ready)`
                      : `Validation Issues Detected (${validation.errors.length} errors, ${validation.warnings.length} warnings)`}
                  </span>
                </div>
                <span className="text-[11px] font-mono">
                  {validation.exportableImagesCount} / {validation.totalImagesCount} exportable
                </span>
              </div>

              {validation.errors.length > 0 && (
                <div className="space-y-1 mt-2 text-xs text-red-600 dark:text-red-400">
                  {validation.errors.slice(0, 3).map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {validation.errors.length > 3 && (
                    <p className="text-[11px] italic">+ {validation.errors.length - 3} more errors</p>
                  )}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="space-y-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {validation.warnings.slice(0, 2).map((warn, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compliance & Security Guarantee */}
          <div className="p-3 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Strict RFC 4180 UTF-8 compliance, verified 1–21 category mapping, and formula injection sanitization (CWE-1236).</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleDownloadZip}
              icon={<PackageCheck className="w-4 h-4" />}
            >
              Download All (.zip)
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadCsv}
              icon={<Download className="w-4 h-4" />}
            >
              Download CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
