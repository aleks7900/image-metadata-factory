import React, { useState } from 'react';
import { X, Download, ShieldCheck, FileSpreadsheet, Check } from 'lucide-react';
import { apiClient } from '../api/client';

interface ExportModalProps {
  isOpen: boolean;
  batchId: string;
  batchName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, batchId, batchName, onClose }) => {
  const [policy, setPolicy] = useState<'SAFE_AND_APPROVED' | 'SAFE_ONLY' | 'ALL'>('SAFE_AND_APPROVED');
  const [format, setFormat] = useState<'STANDARD' | 'EXTENDED'>('STANDARD');

  if (!isOpen) return null;

  const handleDownload = () => {
    const url = apiClient.getExportUrl(batchId, policy, format);
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Export Batch to CSV</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{batchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Policy Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Commercial Export Policy
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPolicy('SAFE_AND_APPROVED')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  policy === 'SAFE_AND_APPROVED'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/80'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  policy === 'SAFE_AND_APPROVED' ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600'
                }`}>
                  {policy === 'SAFE_AND_APPROVED' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Safe & Approved Only
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Recommended
                    </span>
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exports verified SAFE images and human-approved images. Excludes REJECT and pending review items.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPolicy('SAFE_ONLY')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  policy === 'SAFE_ONLY'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/80'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  policy === 'SAFE_ONLY' ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600'
                }`}>
                  {policy === 'SAFE_ONLY' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Strict Safe Only</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Strictly exports only images with zero commercial or model-release warnings.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPolicy('ALL')}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  policy === 'ALL'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/80'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  policy === 'ALL' ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600'
                }`}>
                  {policy === 'ALL' && <Check className="w-2.5 h-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">All Completed Images</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exports all ready images including rejected items (useful for internal compliance audit).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              CSV Column Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('STANDARD')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'STANDARD'
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-950/80'
                }`}
              >
                <div className="text-sm font-semibold">Standard Format</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  <code>filename, title, description, keywords</code>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('EXTENDED')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'EXTENDED'
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-950/80'
                }`}
              >
                <div className="text-sm font-semibold">Extended Audit</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Standard + risk, release, trademarks, IP columns
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Values sanitized with Unicode UTF-8 BOM and spreadsheet formula injection protection.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
