import React from 'react';
import type { ImageJob } from '../types';
import { JobStatusBadge, RiskBadge, ReviewDecisionBadge } from './StatusBadges';
import { apiClient } from '../api/client';
import { Eye, Check, XCircle, AlertTriangle, Download, Copy, Maximize2 } from 'lucide-react';

interface ImageCardProps {
  image: ImageJob;
  onClick: () => void;
  onApprove?: (e: React.MouseEvent) => void;
  onReject?: (e: React.MouseEvent) => void;
  onUpscale?: (e: React.MouseEvent) => void;
  onCopyPrompt?: (e: React.MouseEvent) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onClick,
  onApprove,
  onReject,
  onUpscale,
  onCopyPrompt,
}) => {
  const isReviewRequired = image.riskStatus === 'REVIEW_REQUIRED';
  const isRejected = image.riskStatus === 'REJECT';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = apiClient.getImagePreviewUrl(image.id);
    link.download = image.originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = image.title || image.description || image.originalFilename;
    navigator.clipboard.writeText(textToCopy);
    if (onCopyPrompt) onCopyPrompt(e);
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl bg-[var(--color-surface)] border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isReviewRequired
          ? 'border-[var(--color-warning)]/40 hover:border-[var(--color-warning)]'
          : isRejected
          ? 'border-[var(--color-error)]/40 hover:border-[var(--color-error)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'
      }`}
    >
      {/* Thumbnail Aspect Ratio Container */}
      <div className="relative aspect-[4/3] bg-[var(--color-surface-secondary)] overflow-hidden">
        <img
          src={apiClient.getImagePreviewUrl(image.id)}
          alt={image.originalFilename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Floating Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          <RiskBadge risk={image.riskStatus} />
          {image.reviewDecision !== 'PENDING' && (
            <ReviewDecisionBadge decision={image.reviewDecision} />
          )}
        </div>

        <div className="absolute top-2 right-2 z-10">
          <JobStatusBadge status={image.status} />
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-1.5 p-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm transition-transform active:scale-95 cursor-pointer"
            title="Inspect Details & Edit"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm transition-transform active:scale-95 cursor-pointer"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm transition-transform active:scale-95 cursor-pointer"
            title="Copy Title / Prompt"
          >
            <Copy className="w-4 h-4" />
          </button>

          {onUpscale && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpscale(e);
              }}
              className="p-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="Upscale"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {onApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(e);
              }}
              className="p-2 rounded-lg bg-[var(--color-success)] text-white hover:opacity-90 shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="Quick Approve"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {onReject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject(e);
              }}
              className="p-2 rounded-lg bg-[var(--color-error)] text-white hover:opacity-90 shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="Quick Reject"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Card Content Info */}
      <div className="p-3 space-y-1.5 bg-[var(--color-surface)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-[var(--color-text-muted)] truncate max-w-[170px]">
            {image.originalFilename}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono shrink-0">
            {image.keywords?.length || 0} kw
          </span>
        </div>

        {/* Generated Title */}
        <h4 className="text-xs font-medium text-[var(--color-text)] line-clamp-2 leading-snug min-h-[2rem]">
          {image.title || (
            <span className="text-[var(--color-text-muted)] italic">No title generated yet</span>
          )}
        </h4>

        {/* First 3 Keywords Tags */}
        {image.keywords && image.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {image.keywords.slice(0, 3).map((kw, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
              >
                {kw}
              </span>
            ))}
            {image.keywords.length > 3 && (
              <span className="text-[10px] text-[var(--color-text-muted)] self-center">
                +{image.keywords.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Warning Indicator */}
        {isReviewRequired && (
          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-warning)]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Model release / branding review</span>
          </div>
        )}
      </div>
    </div>
  );
};
