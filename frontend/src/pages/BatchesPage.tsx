import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Batch } from '../types';
import { BatchCard } from '../components/BatchCard';
import { CreateBatchModal } from '../components/CreateBatchModal';
import { ExportModal } from '../components/ExportModal';
import { Button } from '../components/common/Button';
import { SearchField } from '../components/common/SearchField';
import { EmptyState } from '../components/common/EmptyState';
import {
  Layers, Plus, Sparkles, Image as ImageIcon, ShieldCheck,
  DollarSign, RefreshCw
} from 'lucide-react';

export const BatchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [exportBatch, setExportBatch] = useState<Batch | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['batches', page],
    queryFn: () => apiClient.fetchBatches(page, 12),
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => apiClient.startBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiClient.pauseBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => apiClient.resumeBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  });

  const rawBatches = data?.content || [];

  // Filter client-side by search and status
  const batches = rawBatches.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Aggregated global stats across visible batches
  const totalImages = rawBatches.reduce((acc, b) => acc + b.totalImages, 0);
  const totalSafe = rawBatches.reduce((acc, b) => acc + b.safeImages, 0);
  const totalCost = rawBatches.reduce((acc, b) => acc + Number(b.estimatedCostUsd || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Hero & Header */}
      <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Commercial Stock Automation</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Image Batch Engine
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] max-w-2xl mt-1">
              Process high-volume photo & generative image batches through multimodal vision analysis,
              IP & trademark compliance audit, and marketplace-ready CSV exports.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="tertiary"
              onClick={() => refetch()}
              icon={<RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-[var(--color-primary)]' : ''}`} />}
              tooltip="Refresh Batches"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create New Batch
            </Button>
          </div>
        </div>

        {/* Aggregate KPI Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--color-border)]">
          <div className="p-3.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Active Batches</span>
            </div>
            <div className="text-xl font-bold text-[var(--color-text)] mt-1 font-mono">
              {data?.totalElements || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Total Images Queued</span>
            </div>
            <div className="text-xl font-bold text-[var(--color-text)] mt-1 font-mono">
              {totalImages.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-success)]" />
              <span>Safe Stock Assets</span>
            </div>
            <div className="text-xl font-bold text-[var(--color-success)] mt-1 font-mono">
              {totalSafe.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
              <DollarSign className="w-3.5 h-3.5 text-[var(--color-success)]" />
              <span>Estimated LLM Cost</span>
            </div>
            <div className="text-xl font-bold text-[var(--color-success)] mt-1 font-mono">
              ${totalCost.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Filter batches by name..."
          className="w-full sm:w-72"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1 text-xs">
            {['ALL', 'PROCESSING', 'COMPLETED', 'PAUSED', 'QUEUED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[var(--color-primary-container)] text-[var(--color-primary-container-text)] font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batches Grid Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 animate-pulse">
              <div className="h-5 bg-[var(--color-surface-secondary)] rounded w-3/4" />
              <div className="h-3 bg-[var(--color-surface-secondary)] rounded w-1/2" />
              <div className="h-2 bg-[var(--color-surface-secondary)] rounded w-full" />
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-12 bg-[var(--color-surface-secondary)] rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-6 h-6" />}
          title={search || statusFilter !== 'ALL' ? 'No matching batches found' : 'No batches created yet'}
          description={
            search || statusFilter !== 'ALL'
              ? 'Try adjusting your search query or status filter to see batches.'
              : 'Create your first image batch to start commercial stock analysis and safety validation.'
          }
          action={
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create New Batch
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onStart={(id) => startMutation.mutate(id)}
              onPause={(id) => pauseMutation.mutate(id)}
              onResume={(id) => resumeMutation.mutate(id)}
              onExport={(b) => setExportBatch(b)}
              onDelete={(id) => {
                if (window.confirm(`Are you sure you want to delete batch "${batch.name}"?`)) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">
            Showing page {data.number + 1} of {data.totalPages} ({data.totalElements} total batches)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['batches'] })}
      />

      {exportBatch && (
        <ExportModal
          isOpen={true}
          batchId={exportBatch.id}
          batchName={exportBatch.name}
          onClose={() => setExportBatch(null)}
        />
      )}
    </div>
  );
};
