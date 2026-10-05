import React, { useState } from 'react';
import { X, Download, ShieldCheck, FileSpreadsheet, Check } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from './common/Button';

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
  const [format, setFormat] = useState<'STANDARD' | 'EXTENDED'>('STANDARD');

  if (!isOpen) return null;

  const handleDownload = () => {
    const url = apiClient.getExportUrl(batchId, policy, format);
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">
                Export Batch to CSV
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-xs">
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Policy Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] mb-2">
              Commercial Export Policy
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPolicy('SAFE_AND_APPROVED')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  policy === 'SAFE_AND_APPROVED'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    policy === 'SAFE_AND_APPROVED'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {policy === 'SAFE_AND_APPROVED' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    Safe & Approved Only
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold">
                      Recommended
                    </span>
                  </span>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Exports verified SAFE images and human-approved images. Excludes REJECT and pending review items.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPolicy('SAFE_ONLY')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  policy === 'SAFE_ONLY'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    policy === 'SAFE_ONLY'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {policy === 'SAFE_ONLY' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-semibold">Strict Safe Only</span>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Strictly exports only images with zero commercial or model-release warnings.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPolicy('ALL')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  policy === 'ALL'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text)]'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    policy === 'ALL'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {policy === 'ALL' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-semibold">All Completed Images</span>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Exports all ready images including rejected items (useful for internal compliance audit).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text)] mb-2">
              CSV Column Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('STANDARD')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  format === 'STANDARD'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]'
                }`}
              >
                <div className="text-sm font-semibold">Standard Format</div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  <code>filename, title, description, keywords</code>
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
                  Standard + risk, release, trademarks, IP columns
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>Values sanitized with Unicode UTF-8 BOM and formula injection protection (CWE-1236).</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button variant="tertiary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
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
