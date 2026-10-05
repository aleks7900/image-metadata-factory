import React from 'react';
import type { ImageJob } from '../types';
import { JobStatusBadge, RiskBadge, ReviewDecisionBadge } from './StatusBadges';
import { apiClient } from '../api/client';
import { Eye, Check, XCircle, AlertTriangle } from 'lucide-react';

interface ImageCardProps {
  image: ImageJob;
  onClick: () => void;
  onApprove: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onClick, onApprove, onReject }) => {
  const isReviewRequired = image.riskStatus === 'REVIEW_REQUIRED';
  const isRejected = image.riskStatus === 'REJECT';

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl bg-slate-900 border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
        isReviewRequired
          ? 'border-amber-500/40 hover:border-amber-500/80 shadow-amber-500/5'
          : isRejected
          ? 'border-rose-500/30 hover:border-rose-500/70'
          : 'border-slate-800 hover:border-slate-700 hover:shadow-indigo-500/10'
      }`}
    >
      {/* Thumbnail Aspect Ratio Container */}
      <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
        <img
          src={apiClient.getImagePreviewUrl(image.id)}
          alt={image.originalFilename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Floating Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
          <RiskBadge risk={image.riskStatus} />
          {image.reviewDecision !== 'PENDING' && (
            <ReviewDecisionBadge decision={image.reviewDecision} />
          )}
        </div>

        <div className="absolute top-2 right-2">
          <JobStatusBadge status={image.status} />
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="p-2 rounded-xl bg-slate-800/90 text-white hover:bg-slate-700 shadow-md backdrop-blur transition-transform active:scale-95"
            title="Inspect Details & Edit"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onApprove}
            className="p-2 rounded-xl bg-emerald-600/90 text-white hover:bg-emerald-500 shadow-md backdrop-blur transition-transform active:scale-95"
            title="Quick Approve"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onReject}
            className="p-2 rounded-xl bg-rose-600/90 text-white hover:bg-rose-500 shadow-md backdrop-blur transition-transform active:scale-95"
            title="Quick Reject"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Content Info */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-slate-400 truncate max-w-[170px]">
            {image.originalFilename}
          </span>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            {image.keywords?.length || 0} kw
          </span>
        </div>

        {/* Generated Title */}
        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug">
          {image.title || (
            <span className="text-slate-500 italic">No title generated yet</span>
          )}
        </h4>

        {/* First 3 Keywords Tags */}
        {image.keywords && image.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {image.keywords.slice(0, 3).map((kw, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-400"
              >
                {kw}
              </span>
            ))}
            {image.keywords.length > 3 && (
              <span className="text-[10px] text-slate-500 self-center">
                +{image.keywords.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Warning Indicator */}
        {isReviewRequired && (
          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Model release / branding review</span>
          </div>
        )}
      </div>
    </div>
  );
};
