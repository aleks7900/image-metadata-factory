import React from 'react';
import { Link } from 'react-router-dom';
import type { Batch } from '../types';
import { BatchStatusBadge } from './StatusBadges';
import {
  Play, Pause, Download, Trash2, ArrowRight,
  DollarSign, Cpu, Clock
} from 'lucide-react';

interface BatchCardProps {
  batch: Batch;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onExport: (batch: Batch) => void;
  onDelete: (id: string) => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  onStart,
  onPause,
  onResume,
  onExport,
  onDelete,
}) => {
  const isProcessing = batch.status === 'PROCESSING';
  const isPaused = batch.status === 'PAUSED';
  const isQueued = batch.status === 'QUEUED';
  const isCompleted = batch.status === 'COMPLETED';

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between space-y-5 border border-slate-800/80 bg-slate-900/60 transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to={`/batches/${batch.id}`}
            className="group flex items-center gap-2 text-base font-bold text-white hover:text-indigo-400 transition-colors"
          >
            <span>{batch.name}</span>
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Created {new Date(batch.createdAt).toLocaleDateString()} at {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <BatchStatusBadge status={batch.status} />
      </div>

      {/* Progress Bar & Counters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-300">
            {batch.processedImages + batch.failedImages} / {batch.totalImages} Images
          </span>
          <span className="text-indigo-400 font-mono font-bold">
            {batch.progressPercentage}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isProcessing
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                : isCompleted
                ? 'bg-emerald-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.min(batch.progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Risk Metrics Pills */}
      <div className="grid grid-cols-4 gap-2 pt-1 text-center">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          <div className="text-xs font-bold font-mono">{batch.safeImages}</div>
          <div className="text-[10px] text-emerald-400 uppercase font-semibold">Safe</div>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <div className="text-xs font-bold font-mono">{batch.reviewRequiredImages}</div>
          <div className="text-[10px] text-amber-400 uppercase font-semibold">Review</div>
        </div>
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
          <div className="text-xs font-bold font-mono">{batch.rejectedImages}</div>
          <div className="text-[10px] text-rose-400 uppercase font-semibold">Reject</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
          <div className="text-xs font-bold font-mono">{batch.failedImages}</div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Failed</div>
        </div>
      </div>

      {/* Usage & Cost Summary */}
      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tokens: <strong className="text-slate-200">{(batch.totalInputTokens + batch.totalOutputTokens).toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cost: <strong className="text-emerald-300">${Number(batch.estimatedCostUsd || 0).toFixed(4)}</strong></span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          {(isQueued || isPaused) && (
            <button
              onClick={() => isPaused ? onResume(batch.id) : onStart(batch.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'Resume' : 'Start'}</span>
            </button>
          )}

          {isProcessing && (
            <button
              onClick={() => onPause(batch.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => onExport(batch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(batch.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Delete Batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link
            to={`/batches/${batch.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
