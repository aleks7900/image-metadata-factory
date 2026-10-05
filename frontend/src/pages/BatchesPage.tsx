import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Batch } from '../types';
import { BatchCard } from '../components/BatchCard';
import { CreateBatchModal } from '../components/CreateBatchModal';
import { ExportModal } from '../components/ExportModal';
import { Layers, Plus, Sparkles, Image as ImageIcon, ShieldCheck, DollarSign, RefreshCw } from 'lucide-react';

export const BatchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [exportBatch, setExportBatch] = useState<Batch | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['batches', page],
    queryFn: () => apiClient.fetchBatches(page, 12),
    refetchInterval: 5000, // Poll every 5s for active progress updates
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

  const batches = data?.content || [];

  // Aggregated global stats across visible batches
  const totalImages = batches.reduce((acc, b) => acc + b.totalImages, 0);
  const totalSafe = batches.reduce((acc, b) => acc + b.safeImages, 0);
  const totalCost = batches.reduce((acc, b) => acc + Number(b.estimatedCostUsd || 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Hero & Metrics Banner */}
      <div className="relative rounded-3xl p-8 glass-panel border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Commercial Stock Automation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Multimodal Image Batch Engine
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Process hundreds or thousands of photographic and generative images through vision analysis, stock titles, 30–45 relevant keywords, IP & trademark safety validation, and clean CSV exports.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => refetch()}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Refresh Batches"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/60">
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Active Batches</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {data?.totalElements || 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <span>Total Images Queued</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {totalImages.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Safe Stock Assets</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
              {totalSafe.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Estimated LLM Cost</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-300 mt-1 font-mono">
              ${totalCost.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Batches Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Processing Batches</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {data?.totalElements || 0}
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 px-4 glass-panel rounded-3xl border border-slate-800/80 bg-slate-900/30 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No batches created yet</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Create your first batch and upload images to automatically generate searchable titles, descriptions, 30–45 keywords, and IP compliance checks.
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Batch</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                onStart={(id) => startMutation.mutate(id)}
                onPause={(id) => pauseMutation.mutate(id)}
                onResume={(id) => resumeMutation.mutate(id)}
                onExport={(b) => setExportBatch(b)}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this batch and its images?')) {
                    deleteMutation.mutate(id);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-slate-400">
              Page {page + 1} of {data.totalPages}
            </span>
            <button
              disabled={page >= data.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['batches'] })}
      />

      {exportBatch && (
        <ExportModal
          isOpen={!!exportBatch}
          batchId={exportBatch.id}
          batchName={exportBatch.name}
          onClose={() => setExportBatch(null)}
        />
      )}
    </div>
  );
};
