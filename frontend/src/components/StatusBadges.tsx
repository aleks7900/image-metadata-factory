import React from 'react';
import type { JobStatus, RiskStatus, ReviewDecision, BatchStatus } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Sparkles, ShieldAlert, Cpu } from 'lucide-react';

export const JobStatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  switch (status) {
    case 'READY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Ready
        </span>
      );
    case 'VISION_ANALYSIS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/20 animate-pulse">
          <Cpu className="w-3.5 h-3.5 animate-spin" />
          Vision Analysis
        </span>
      );
    case 'METADATA_GENERATION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] border border-[var(--color-primary)]/20 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Generating Metadata
        </span>
      );
    case 'SAFETY_VALIDATION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5" />
          Safety Validation
        </span>
      );
    case 'QUALITY_VALIDATION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] border border-[var(--color-primary)]/20 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Quality Audit
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]/20">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case 'UPLOADED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
          <Clock className="w-3.5 h-3.5" />
          Uploaded
        </span>
      );
  }
};

export const RiskBadge: React.FC<{ risk: RiskStatus }> = ({ risk }) => {
  switch (risk) {
    case 'SAFE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20">
          <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
          SAFE
        </span>
      );
    case 'REVIEW_REQUIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20">
          <AlertTriangle className="w-3 h-3 text-[var(--color-warning)]" />
          REVIEW REQUIRED
        </span>
      );
    case 'REJECT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]/20">
          <XCircle className="w-3 h-3 text-[var(--color-error)]" />
          REJECT
        </span>
      );
  }
};

export const ReviewDecisionBadge: React.FC<{ decision: ReviewDecision }> = ({ decision }) => {
  switch (decision) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20">
          Approved
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]/20">
          Rejected
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
          Pending Review
        </span>
      );
  }
};

export const BatchStatusBadge: React.FC<{ status: BatchStatus }> = ({ status }) => {
  switch (status) {
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] border border-[var(--color-primary)]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-ping" />
          Processing
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    case 'PAUSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20">
          Paused
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]/20">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case 'QUEUED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
          Queued
        </span>
      );
  }
};
