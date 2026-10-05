import React from 'react';
import { Link } from 'react-router-dom';
import type { Batch } from '../types';
import { BatchStatusBadge } from './StatusBadges';
import {
  Play, Pause, Download, Trash2, ArrowRight,
  DollarSign, Cpu, Clock
} from 'lucide-react';
import { Button } from './common/Button';

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
    <div className="rounded-xl p-5 flex flex-col justify-between space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary-accent)] transition-all duration-150 shadow-sm">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to={`/batches/${batch.id}`}
            className="group flex items-center gap-1.5 text-base font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
          >
            <span>{batch.name}</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Created {new Date(batch.createdAt).toLocaleDateString()} at{' '}
              {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <BatchStatusBadge status={batch.status} />
      </div>

      {/* Progress Bar & Counters */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">
            {batch.processedImages + batch.failedImages} / {batch.totalImages} images
          </span>
          <span className="text-[var(--color-primary)] font-mono font-semibold">
            {batch.progressPercentage}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden border border-[var(--color-border-subtle)]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-[var(--color-success)]'
                : 'bg-[var(--color-primary)]'
            }`}
            style={{ width: `${Math.min(batch.progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Risk Metrics Pills */}
      <div className="grid grid-cols-4 gap-2 pt-1 text-center">
        <div className="p-2 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-[var(--color-success)]">
          <div className="text-xs font-bold font-mono">{batch.safeImages}</div>
          <div className="text-[10px] uppercase font-semibold">Safe</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/20 text-[var(--color-warning)]">
          <div className="text-xs font-bold font-mono">{batch.reviewRequiredImages}</div>
          <div className="text-[10px] uppercase font-semibold">Review</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error)]/20 text-[var(--color-error)]">
          <div className="text-xs font-bold font-mono">{batch.rejectedImages}</div>
          <div className="text-[10px] uppercase font-semibold">Reject</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
          <div className="text-xs font-bold font-mono">{batch.failedImages}</div>
          <div className="text-[10px] uppercase font-semibold">Failed</div>
        </div>
      </div>

      {/* Usage & Cost Summary */}
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-surface-secondary)] text-[11px] text-[var(--color-text-muted)]">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Tokens: <strong className="text-[var(--color-text)]">{(batch.totalInputTokens + batch.totalOutputTokens).toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-[var(--color-success)]" />
          <span>Cost: <strong className="text-[var(--color-success)]">${Number(batch.estimatedCostUsd || 0).toFixed(4)}</strong></span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-1.5">
          {(isQueued || isPaused) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => (isPaused ? onResume(batch.id) : onStart(batch.id))}
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              {isPaused ? 'Resume' : 'Start'}
            </Button>
          )}

          {isProcessing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPause(batch.id)}
              icon={<Pause className="w-3.5 h-3.5" />}
            >
              Pause
            </Button>
          )}

          <Button
            variant="tertiary"
            size="sm"
            onClick={() => onExport(batch)}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(batch.id)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
            title="Delete Batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link
            to={`/batches/${batch.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
