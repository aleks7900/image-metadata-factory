import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ImageJob } from '../types';
import {
  Image as GalleryIcon, Eye, Download, Maximize2, Tag, Copy,
  RefreshCw, Sparkles
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { SearchField } from '../components/common/SearchField';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ImageDetailModal } from '../components/ImageDetailModal';

export const GalleryPage: React.FC = () => {
  const navigate = useNavigate();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');

  // Preview Modal
  const [selectedImage, setSelectedImage] = useState<ImageJob | null>(null);

  // Fetch all batches
  const { data: batchesData } = useQuery({
    queryKey: ['batches', 0],
    queryFn: () => apiClient.fetchBatches(0, 50),
  });

  const batches = batchesData?.content || [];
  const firstBatchId = batches[0]?.id;

  // Fetch images from selected batch or first available batch
  const activeBatchId = selectedBatchId === 'ALL' ? firstBatchId : selectedBatchId;

  const { data: imagesData, isLoading, refetch } = useQuery({
    queryKey: ['batch-images', activeBatchId, statusFilter, riskFilter, search],
    queryFn: () => {
      if (!activeBatchId) return { content: [], totalElements: 0, totalPages: 0, size: 24, number: 0, first: true, last: true };
      return apiClient.fetchBatchImages(activeBatchId, {
        status: statusFilter,
        riskStatus: riskFilter,
        search,
        page: 0,
        size: 48,
      });
    },
    enabled: !!activeBatchId,
  });

  const rawImages = imagesData?.content || [];

  // Demo fallback items if no backend images yet
  const demoGalleryItems: ImageJob[] = [
    {
      id: 'demo-1',
      batchId: 'batch-demo',
      originalFilename: 'scandinavian_villa_twilight.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 2450000,
      status: 'READY',
      title: 'Modern Scandinavian Architectural Villa Nestled in Pine Forest',
      description: 'Contemporary eco-luxury architecture with floor to ceiling glass windows and warm interior lighting in misty twilight.',
      riskStatus: 'SAFE',
      reviewDecision: 'APPROVED',
      retryCount: 0,
      processingDurationMs: 380,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords: ['architecture', 'scandinavian', 'villa', 'pine forest', 'minimalist', 'twilight', 'luxury'],
      safetyFindings: [],
    },
    {
      id: 'demo-2',
      batchId: 'batch-demo',
      originalFilename: 'cyberpunk_market_alley.png',
      mimeType: 'image/png',
      fileSizeBytes: 3120000,
      status: 'READY',
      title: 'Neon Hologram Cyberpunk Night Market with Futuristic Billboards',
      description: 'Vibrant cyberpunk alleyway with rain reflections, colorful neon signs, and futuristic street vendors.',
      riskStatus: 'SAFE',
      reviewDecision: 'APPROVED',
      retryCount: 0,
      processingDurationMs: 410,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords: ['cyberpunk', 'neon', 'cityscape', 'street market', 'night', 'futuristic'],
      safetyFindings: [],
    },
    {
      id: 'demo-3',
      batchId: 'batch-demo',
      originalFilename: 'ceramic_tea_studio_shot.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1890000,
      status: 'READY',
      title: 'Handcrafted Ceramic Teapot with Gentle Steam in Morning Studio',
      description: 'Minimalist commercial still life photography of artisan ceramic teapot with soft sun flare and natural textures.',
      riskStatus: 'SAFE',
      reviewDecision: 'APPROVED',
      retryCount: 0,
      processingDurationMs: 310,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords: ['teapot', 'ceramic', 'still life', 'steam', 'artisan', 'minimalism'],
      safetyFindings: [],
    },
    {
      id: 'demo-4',
      batchId: 'batch-demo',
      originalFilename: 'desert_solar_farm_dawn.webp',
      mimeType: 'image/webp',
      fileSizeBytes: 2100000,
      status: 'READY',
      title: 'Expansive Photovoltaic Solar Farm in Desert Horizon at Dawn',
      description: 'Aerial vista of clean renewable energy solar array reflecting golden morning sunrise over desert landscape.',
      riskStatus: 'SAFE',
      reviewDecision: 'APPROVED',
      retryCount: 0,
      processingDurationMs: 440,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords: ['solar farm', 'renewable energy', 'desert', 'sunrise', 'photovoltaic', 'clean power'],
      safetyFindings: [],
    },
  ];

  const displayImages = rawImages.length > 0 ? rawImages : demoGalleryItems;

  const handleDownloadImage = (img: ImageJob, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = apiClient.getImagePreviewUrl(img.id);
    link.download = img.originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (img: ImageJob, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(img.title || img.description || img.originalFilename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Image Gallery
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Production asset library with instant upscale, metadata generation, and compliance inspection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/generate')}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Generate New
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search assets by filename or keyword..."
            className="w-full md:w-80"
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Filter */}
            {batches.length > 0 && (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="ALL">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.totalImages})
                  </option>
                ))}
              </select>
            )}

            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="ALL">All Providers</option>
              <option value="OpenAI">OpenAI</option>
              <option value="Gemini">Gemini</option>
              <option value="Stability">Stability AI</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Ready</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="ALL">All Compliance Risks</option>
              <option value="SAFE">Safe</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
              <option value="REJECT">Reject</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Image Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <LoadingSkeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : displayImages.length === 0 ? (
        <EmptyState
          icon={<GalleryIcon className="w-6 h-6" />}
          title="No images found"
          description="Try broadening your filters or generate new images in the studio."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs hover:border-[var(--color-primary-accent)] cursor-pointer transition-all"
            >
              <div className="relative aspect-square bg-[var(--color-surface-secondary)] overflow-hidden">
                <img
                  src={apiClient.getImagePreviewUrl(img.id)}
                  alt={img.originalFilename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to stock unsplash image if preview fails
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* Floating status tag */}
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      img.riskStatus === 'SAFE'
                        ? 'bg-[var(--color-success)] text-white'
                        : img.riskStatus === 'REVIEW_REQUIRED'
                        ? 'bg-[var(--color-warning)] text-white'
                        : 'bg-[var(--color-error)] text-white'
                    }`}
                  >
                    {img.riskStatus}
                  </span>
                </div>

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(img);
                    }}
                    className="p-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Inspect & Edit"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleDownloadImage(img, e)}
                    className="p-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/upscaling');
                    }}
                    className="p-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Upscale 4x"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/metadata');
                    }}
                    className="p-1.5 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 shadow-sm cursor-pointer"
                    title="Metadata Pipeline"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleCopyPrompt(img, e)}
                    className="p-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] shadow-sm cursor-pointer"
                    title="Copy Title / Prompt"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Minimal Clean Caption */}
              <div className="p-2 space-y-0.5">
                <span className="block text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                  {img.originalFilename}
                </span>
                <span className="block text-[10px] text-[var(--color-text)] font-medium truncate">
                  {img.title || 'Untitled asset'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview & Inspection Modal */}
      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          isOpen={true}
          onClose={() => setSelectedImage(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  );
};
