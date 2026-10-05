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
import { Button } from '../components/common/Button';
import { SearchField } from '../components/common/SearchField';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import {
  ArrowLeft, Play, Pause, Download, RefreshCw, Upload,
  LayoutGrid, Table as TableIcon, Eye, Radio, Image as ImageIcon, CheckCheck, AlertTriangle
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
        <LoadingSkeleton className="h-44 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-6 h-6 text-[var(--color-warning)]" />}
        title="Batch Not Found"
        description="The requested batch does not exist or has been deleted."
        action={
          <Link to="/batches">
            <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Batches
            </Button>
          </Link>
        }
      />
    );
  }

  // Calculate elapsed time
  const getElapsedString = () => {
    if (!batch.startedAt) return 'Not started';
    const start = new Date(batch.startedAt).getTime();
    const end = batch.completedAt ? new Date(batch.completedAt).getTime() : Date.now();
    const sec = Math.floor((end - start) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/batches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Batches</span>
        </Link>

        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary)]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Live Stream Connected</span>
          </div>
        )}
      </div>

      {/* Production Dashboard Header Card */}
      <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
                {batch.name}
              </h2>
              <BatchStatusBadge status={batch.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
              <span>ID: <code className="font-mono text-[var(--color-text)]">{batch.id.slice(0, 8)}</code></span>
              <span>•</span>
              <span>
                {batch.processedImages + batch.failedImages} / {batch.totalImages} images processed
              </span>
              <span>•</span>
              <span>Elapsed: {getElapsedString()}</span>
              {latestEvent?.message && (
                <>
                  <span>•</span>
                  <span className="text-[var(--color-primary)] font-medium">{latestEvent.message}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {(batch.status === 'QUEUED' || batch.status === 'PAUSED') && (
              <Button
                variant="primary"
                onClick={() => (batch.status === 'PAUSED' ? resumeMutation.mutate() : startMutation.mutate())}
                icon={<Play className="w-4 h-4 fill-current" />}
              >
                {batch.status === 'PAUSED' ? 'Resume Batch' : 'Start Processing'}
              </Button>
            )}

            {isProcessing && (
              <Button
                variant="secondary"
                onClick={() => pauseMutation.mutate()}
                icon={<Pause className="w-4 h-4" />}
              >
                Pause
              </Button>
            )}

            {batch.failedImages > 0 && (
              <Button
                variant="secondary"
                onClick={() => bulkRetryMutation.mutate()}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Retry Failed ({batch.failedImages})
              </Button>
            )}

            {batch.safeImages > 0 && (
              <Button
                variant="secondary"
                onClick={() => bulkReviewMutation.mutate({ risk: 'SAFE', decision: 'APPROVED' })}
                icon={<CheckCheck className="w-4 h-4" />}
              >
                Approve Safe
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadingMore}
              icon={<Upload className="w-4 h-4" />}
            >
              Add Images
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadMore}
            />

            <Button
              variant="primary"
              onClick={() => setIsExportOpen(true)}
              icon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">
              Overall Pipeline Completion
            </span>
            <span className="font-mono font-bold text-[var(--color-primary)]">
              {batch.progressPercentage}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden border border-[var(--color-border-subtle)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                batch.status === 'COMPLETED'
                  ? 'bg-[var(--color-success)]'
                  : 'bg-[var(--color-primary)]'
              }`}
              style={{ width: `${Math.min(batch.progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-[var(--color-border)] text-center">
          <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-muted)] font-medium">Total Images</div>
            <div className="text-lg font-bold text-[var(--color-text)] font-mono mt-0.5">{batch.totalImages}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-[var(--color-success)]">
            <div className="text-xs font-semibold uppercase">Safe</div>
            <div className="text-lg font-bold font-mono mt-0.5">{batch.safeImages}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/20 text-[var(--color-warning)]">
            <div className="text-xs font-semibold uppercase">Review Req.</div>
            <div className="text-lg font-bold font-mono mt-0.5">{batch.reviewRequiredImages}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-error-bg)] border border-[var(--color-error)]/20 text-[var(--color-error)]">
            <div className="text-xs font-semibold uppercase">Rejected</div>
            <div className="text-lg font-bold font-mono mt-0.5">{batch.rejectedImages}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-muted)] font-medium">Estimated Cost</div>
            <div className="text-lg font-bold text-[var(--color-success)] font-mono mt-0.5">
              ${Number(batch.estimatedCostUsd || 0).toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)]">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by filename or title..."
          className="w-full sm:w-64"
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="VISION_ANALYSIS">Vision Analysis</option>
            <option value="METADATA_GENERATION">Metadata Generation</option>
            <option value="SAFETY_VALIDATION">Safety Validation</option>
            <option value="QUALITY_VALIDATION">Quality Audit</option>
            <option value="FAILED">Failed</option>
            <option value="UPLOADED">Uploaded</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="ALL">All Compliance Risks</option>
            <option value="SAFE">Safe</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
            <option value="REJECT">Reject</option>
          </select>

          {/* Review Decision Filter */}
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="ALL">All Decisions</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PENDING">Pending Review</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-[var(--color-surface-secondary)] p-0.5 rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Images Content Area: Grid or Table */}
      {imagesLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <LoadingSkeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-6 h-6 text-[var(--color-text-muted)]" />}
          title="No images match criteria"
          description="Adjust your search or filters to see more images in this batch."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onClick={() => setSelectedImage(img)}
              onApprove={async () => {
                await apiClient.reviewImage(img.id, 'APPROVED');
                queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
              }}
              onReject={async () => {
                await apiClient.reviewImage(img.id, 'REJECTED');
                queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
              }}
            />
          ))}
        </div>
      ) : (
        /* Professional Data Table View */
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Filename / Stock Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Compliance</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Keywords</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {images.map((img) => (
                <tr
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className="hover:bg-[var(--color-surface-secondary)]/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <img
                      src={apiClient.getImagePreviewUrl(img.id)}
                      alt={img.originalFilename}
                      className="w-10 h-10 rounded-lg object-cover bg-[var(--color-surface-secondary)]"
                    />
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <div className="font-mono text-[var(--color-text)] truncate">{img.originalFilename}</div>
                    <div className="text-[var(--color-text-muted)] truncate">{img.title || 'No title generated'}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <JobStatusBadge status={img.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <RiskBadge risk={img.riskStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    <ReviewDecisionBadge decision={img.reviewDecision} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--color-text-muted)]">
                    {img.keywords?.length || 0} kw
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--color-text-muted)]">
                    {img.processingDurationMs ? `${img.processingDurationMs}ms` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(img);
                      }}
                      icon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {imagesData && imagesData.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">
            Page {imagesData.number + 1} of {imagesData.totalPages} ({imagesData.totalElements} total images)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={imagesData.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={imagesData.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ImageDetailModal
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
          queryClient.invalidateQueries({ queryKey: ['batch-images', batchId] });
        }}
      />

      <ExportModal
        isOpen={isExportOpen}
        batchId={batch.id}
        batchName={batch.name}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
