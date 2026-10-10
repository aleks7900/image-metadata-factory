import type {
  Batch,
  ImageJob,
  PageResponse,
  ReviewDecision,
  RiskStatus,
  CsvValidationResult,
  CostEstimateResponse,
  BatchCategoryAuditResponse,
  ReclassifyBatchCategoriesRequest,
  BatchReclassifyResponse,
} from '../types';

const API_BASE = '/api/v1';

export const apiClient = {
  // Batch API
  async fetchBatches(page = 0, size = 20): Promise<PageResponse<Batch>> {
    const res = await fetch(`${API_BASE}/batches?page=${page}&size=${size}&sort=createdAt,desc`);
    if (!res.ok) throw new Error('Failed to fetch batches');
    return res.json();
  },

  async fetchBatch(batchId: string): Promise<Batch> {
    const res = await fetch(`${API_BASE}/batches/${batchId}`);
    if (!res.ok) throw new Error('Failed to fetch batch');
    return res.json();
  },

  async createBatch(name: string): Promise<Batch> {
    const res = await fetch(`${API_BASE}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create batch');
    }
    return res.json();
  },

  async deleteBatch(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete batch');
  },

  async uploadImages(batchId: string, files: File[]): Promise<Batch> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await fetch(`${API_BASE}/batches/${batchId}/images`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload images');
    return res.json();
  },

  async startBatch(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start batch');
  },

  async pauseBatch(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause batch');
  },

  async resumeBatch(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume batch');
  },

  async bulkRetry(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/bulk-retry`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger bulk retry');
  },

  async bulkReview(batchId: string, riskStatus: RiskStatus | null, decision: ReviewDecision): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/bulk-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskStatus, decision }),
    });
    if (!res.ok) throw new Error('Failed to submit bulk review');
  },

  // Image Jobs API
  async fetchBatchImages(
    batchId: string,
    params: {
      status?: string;
      riskStatus?: string;
      reviewDecision?: string;
      search?: string;
      page?: number;
      size?: number;
    }
  ): Promise<PageResponse<ImageJob>> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.riskStatus && params.riskStatus !== 'ALL') query.append('riskStatus', params.riskStatus);
    if (params.reviewDecision && params.reviewDecision !== 'ALL') query.append('reviewDecision', params.reviewDecision);
    if (params.search) query.append('search', params.search);
    query.append('page', String(params.page || 0));
    query.append('size', String(params.size || 24));
    query.append('sort', 'createdAt,asc');

    const res = await fetch(`${API_BASE}/batches/${batchId}/images?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch batch images');
    return res.json();
  },

  async fetchImage(imageId: string): Promise<ImageJob> {
    const res = await fetch(`${API_BASE}/images/${imageId}`);
    if (!res.ok) throw new Error('Failed to fetch image details');
    return res.json();
  },

  async retryImage(imageId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/images/${imageId}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry image');
  },

  async regenerateImage(imageId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/images/${imageId}/regenerate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to regenerate image metadata');
  },

  async cancelBatch(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel batch');
  },

  async validateCsv(batchId: string, policy: string): Promise<CsvValidationResult> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/validate-csv?policy=${policy}`);
    if (!res.ok) throw new Error('Failed to validate CSV');
    return res.json();
  },

  async getCostEstimate(batchId: string): Promise<CostEstimateResponse> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/cost-estimate`);
    if (!res.ok) throw new Error('Failed to fetch cost estimation');
    return res.json();
  },

  async updateImageMetadata(
    imageId: string,
    data: {
      title: string;
      description: string;
      keywords: string[];
      category?: number;
      releases?: string;
      isAiGenerated?: boolean;
    }
  ): Promise<ImageJob> {
    const res = await fetch(`${API_BASE}/images/${imageId}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update metadata');
    }
    return res.json();
  },

  async reviewImage(imageId: string, decision: ReviewDecision): Promise<ImageJob> {
    const res = await fetch(`${API_BASE}/images/${imageId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) throw new Error('Failed to submit image review');
    return res.json();
  },

  getImagePreviewUrl(imageId: string): string {
    return `${API_BASE}/images/${imageId}/preview`;
  },

  getExportUrl(batchId: string, policy: string, format: string): string {
    return `${API_BASE}/batches/${batchId}/export.csv?policy=${policy}&format=${format}`;
  },

  getZipExportUrl(batchId: string, policy: string, format = 'ADOBE_STOCK'): string {
    return `${API_BASE}/batches/${batchId}/download.zip?policy=${policy}&format=${format}`;
  },

  async auditBatchCategories(batchId: string): Promise<BatchCategoryAuditResponse> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/categories/audit`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to audit batch categories');
    return res.json();
  },

  async reclassifyBatchCategories(
    batchId: string,
    request?: ReclassifyBatchCategoriesRequest
  ): Promise<BatchReclassifyResponse> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/categories/reclassify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request || { onlySuspicious: true, includeApproved: false }),
    });
    if (!res.ok) throw new Error('Failed to reclassify batch categories');
    return res.json();
  },
};
