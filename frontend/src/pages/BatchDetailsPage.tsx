import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ImageJob, RiskStatus, ReviewDecision } from '../types';
import { useBatchSse } from '../hooks/useBatchSse';
import { JobStatusBadge, RiskBadge, ReviewDecisionBadge, BatchStatusBadge } from '../components/StatusBadges';
import { ImageCard } from '../components/ImageCard';
import { ImageDetailModal } from '../components/ImageDetailModal';
import { ExportModal } from '../components/ExportModal';
import {
  ArrowLeft, Play, Pause, Download, RefreshCw, CheckCheck, Upload,
  ShieldCheck, AlertTriangle, XCircle, Search, LayoutGrid, Table,
  DollarSign, Cpu, Sparkles, Clock, Eye
} from 'lucide-react';

export const BatchDetailsPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & View State
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [selectedImage, setSelectedImage] = useState<ImageJob | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [uploadingMore, setUploadingMore] = useState(false);

  // Fetch Batch Details
  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => apiClient.fetchBatch(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const b = query.state.data;
      return b && b.status === 'PROCESSING' ? 3000 : false;
    },
  });

  // Fetch Paginated Images for Batch
  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['batch-images', batchId, page, statusFilter, riskFilter, decisionFilter, search],
    queryFn: () =>
      apiClient.fetchBatchImages(batchId!, {
        status: statusFilter,
        riskStatus: riskFilter,
        reviewDecision: decisionFilter,
        search,
        page,
        size: 24,
      }),
    enabled: !!batchId,
    refetchInterval: batch?.status === 'PROCESSING' ? 3000 : false,
  });

  // Server-Sent Events (SSE) Live Telemetry
  const { latestEvent, isConnected } = useBatchSse(batchId, batch?.status === 'PROCESSING');

  // Batch Lifecycle Mutations
  const startMutation = useMutation({
    mutationFn: () => apiClient.startBatch(batchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiClient.pauseBatch(batchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiClient.resumeBatch(batchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
    },
  });

  const bulkRetryMutation = useMutation({
    mutationFn: () => apiClient.bulkRetry(batchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
    },
  });

  const bulkReviewMutation = useMutation({
    mutationFn: ({ risk, decision }: { risk: RiskStatus; decision: ReviewDecision }) =>
      apiClient.bulkReview(batchId!, risk, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
    },
  });

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !batchId) return;
    setUploadingMore(true);
    try {
      const filesArray = Array.from(e.target.files);
      await apiClient.uploadImages(batchId, filesArray);
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
    } catch (err: any) {
      alert('Failed to upload additional images: ' + err.message);
    } finally {
      setUploadingMore(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const images = imagesData?.content || [];
  const isProcessing = batch?.status === 'PROCESSING';

  if (batchLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-3xl bg-slate-900 animate-pulse border border-slate-800" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-white">Batch not found</h2>
        <Link to="/" className="text-indigo-400 hover:underline mt-2 inline-block">
          Return to Batches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Batches</span>
        </Link>

        {/* Live SSE indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span>{isConnected ? 'Real-Time SSE Connected' : 'Polling Sync'}</span>
        </div>
      </div>

      {/* Main Batch Overview Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/20 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {batch.name}
              </h1>
              <BatchStatusBadge status={batch.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="font-mono text-slate-500">ID: {batch.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Created {new Date(batch.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Primary Batch Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(batch.status === 'QUEUED' || batch.status === 'PAUSED') && (
              <button
                onClick={() => (batch.status === 'PAUSED' ? resumeMutation.mutate() : startMutation.mutate())}
                disabled={startMutation.isPending || resumeMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{batch.status === 'PAUSED' ? 'Resume Pipeline' : 'Start Processing'}</span>
              </button>
            )}

            {isProcessing && (
              <button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Batch</span>
              </button>
            )}

            {batch.reviewRequiredImages > 0 && (
              <button
                onClick={() => bulkReviewMutation.mutate({ risk: 'REVIEW_REQUIRED', decision: 'APPROVED' })}
                disabled={bulkReviewMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Approve all images in REVIEW_REQUIRED status"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Bulk Approve Review ({batch.reviewRequiredImages})</span>
              </button>
            )}

            {batch.failedImages > 0 && (
              <button
                onClick={() => bulkRetryMutation.mutate()}
                disabled={bulkRetryMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Retry all failed jobs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Failed ({batch.failedImages})</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMore}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadingMore ? 'Uploading...' : 'Add Images'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadMore}
            />

            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Progress Display Bar: 73% (730 / 1000) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">
              Processing Batch: <strong className="text-white font-mono">{batch.processedImages + batch.failedImages}</strong> / {batch.totalImages} images
            </span>
            <span className="font-mono text-indigo-400 text-sm">
              {batch.progressPercentage}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isProcessing
                  ? 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500 animate-pulse'
                  : batch.status === 'COMPLETED'
                  ? 'bg-emerald-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(batch.progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Live SSE Event Stream Banner */}
        {latestEvent && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-300 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />
              <span className="truncate">{latestEvent.message}</span>
              {latestEvent.latestFilename && (
                <span className="font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 truncate">
                  {latestEvent.latestFilename}
                </span>
              )}
            </div>
            {latestEvent.latestJobStatus && (
              <JobStatusBadge status={latestEvent.latestJobStatus} />
            )}
          </div>
        )}

        {/* Breakdown Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Safe</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-300 mt-1 font-mono">{batch.safeImages}</div>
            <div className="text-[10px] text-emerald-500/80">Marketplace Ready</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Review Req.</span>
            </div>
            <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono">{batch.reviewRequiredImages}</div>
            <div className="text-[10px] text-amber-500/80">Model / Text check</div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <XCircle className="w-4 h-4" />
              <span>Rejected</span>
            </div>
            <div className="text-xl font-extrabold text-rose-300 mt-1 font-mono">{batch.rejectedImages}</div>
            <div className="text-[10px] text-rose-500/80">Trademark / IP violation</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Failed</span>
            </div>
            <div className="text-xl font-extrabold text-slate-300 mt-1 font-mono">{batch.failedImages}</div>
            <div className="text-[10px] text-slate-500">Retryable errors</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
              <Cpu className="w-4 h-4" />
              <span>LLM Tokens</span>
            </div>
            <div className="text-xl font-extrabold text-slate-200 mt-1 font-mono">
              {((batch.totalInputTokens + batch.totalOutputTokens) / 1000).toFixed(1)}k
            </div>
            <div className="text-[10px] text-slate-500">{batch.totalRequests} API calls</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <DollarSign className="w-4 h-4" />
              <span>Est. Cost</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-300 mt-1 font-mono">
              ${Number(batch.estimatedCostUsd || 0).toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500">~{batch.averageDurationMs}ms avg</div>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search filename or generated title..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="SAFE">SAFE Only</option>
            <option value="REVIEW_REQUIRED">REVIEW REQUIRED</option>
            <option value="REJECT">REJECT Only</option>
          </select>

          {/* Pipeline Stage Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Pipeline Stages</option>
            <option value="READY">READY</option>
            <option value="VISION_ANALYSIS">VISION ANALYSIS</option>
            <option value="METADATA_GENERATION">METADATA GENERATION</option>
            <option value="SAFETY_VALIDATION">SAFETY VALIDATION</option>
            <option value="QUALITY_VALIDATION">QUALITY AUDIT</option>
            <option value="FAILED">FAILED</option>
            <option value="UPLOADED">UPLOADED</option>
          </select>

          {/* Review Decision Filter */}
          <select
            value={decisionFilter}
            onChange={(e) => {
              setDecisionFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Decisions</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* View Mode Switch */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Images Grid or Table View */}
      {imagesLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No images found matching active filters.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onClick={() => setSelectedImage(img)}
              onApprove={async (e) => {
                e.stopPropagation();
                await apiClient.reviewImage(img.id, 'APPROVED');
                queryClient.invalidateQueries({ queryKey: ['batch-images'] });
                queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
              }}
              onReject={async (e) => {
                e.stopPropagation();
                await apiClient.reviewImage(img.id, 'REJECTED');
                queryClient.invalidateQueries({ queryKey: ['batch-images'] });
                queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
              }}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Stock Title</th>
                  <th className="py-3 px-4">Keywords</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Pipeline Status</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {images.map((img) => (
                  <tr
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4">
                      <div className="w-12 h-10 rounded-lg bg-slate-950 overflow-hidden border border-slate-800">
                        <img
                          src={apiClient.getImagePreviewUrl(img.id)}
                          alt={img.originalFilename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-300 max-w-[150px] truncate">
                      {img.originalFilename}
                    </td>
                    <td className="py-2.5 px-4 text-slate-200 max-w-[260px] truncate">
                      {img.title || <span className="text-slate-500 italic">Pending...</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {img.keywords?.length || 0}
                    </td>
                    <td className="py-2.5 px-4">
                      <RiskBadge risk={img.riskStatus} />
                    </td>
                    <td className="py-2.5 px-4">
                      <JobStatusBadge status={img.status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <ReviewDecisionBadge decision={img.reviewDecision} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(img);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {imagesData && imagesData.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 text-xs text-slate-400">
          <span>
            Showing {images.length} of {imagesData.totalElements} images
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-mono">
              {page + 1} / {imagesData.totalPages}
            </span>
            <button
              disabled={page >= imagesData.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail / Review Modal */}
      {selectedImage && (
        <ImageDetailModal
          isOpen={!!selectedImage}
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
            queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
          }}
        />
      )}

      {/* CSV Export Modal */}
      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          batchId={batch.id}
          batchName={batch.name}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
};
