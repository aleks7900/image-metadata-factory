export type BatchStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'PAUSED' | 'FAILED' | 'CANCELLED';

export type JobStatus =
  | 'UPLOADED'
  | 'VISION_ANALYSIS'
  | 'METADATA_GENERATION'
  | 'SAFETY_VALIDATION'
  | 'QUALITY_VALIDATION'
  | 'READY'
  | 'FAILED';

export type RiskStatus = 'SAFE' | 'REVIEW_REQUIRED' | 'REJECT';

export type ReviewDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export type SafetyFindingType =
  | 'TRADEMARK'
  | 'PERSON'
  | 'PROPERTY_RELEASE'
  | 'COPYRIGHT'
  | 'WATERMARK'
  | 'QUALITY'
  | 'AI_ARTIFACT'
  | 'METADATA_ISSUE'
  | 'DUPLICATE'
  | 'VISIBLE_TEXT';

export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  totalImages: number;
  processedImages: number;
  failedImages: number;
  safeImages: number;
  reviewRequiredImages: number;
  rejectedImages: number;
  progressPercentage: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  // Aggregate metrics
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  averageDurationMs: number;
}

export interface SafetyFinding {
  type: SafetyFindingType;
  value: string;
  confidence: number;
  reason?: string;
}

export interface VisionAnalysis {
  subjects: string[];
  objects: string[];
  environment?: string;
  setting?: string;
  activities: string[];
  visualStyle?: string;
  composition?: string;
  colors: string[];
  lighting?: string;
  mood?: string;
  concepts: string[];
  possiblePeople: any[];
  possibleBrands: string[];
  possibleCopyrightedCharacters: string[];
  visibleText: string[];
}

export interface ImageJob {
  id: string;
  batchId: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: JobStatus;
  title?: string;
  description?: string;
  category?: number;
  categoryName?: string;
  releases?: string;
  isAiGenerated?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  complianceStatus?: string;
  riskStatus: RiskStatus;
  reviewDecision: ReviewDecision;
  errorMessage?: string;
  retryCount: number;
  processingDurationMs: number;
  createdAt: string;
  updatedAt: string;
  keywords: string[];
  safetyFindings: SafetyFinding[];
  visionAnalysis?: VisionAnalysis;
  rawVisionAnalysisJson?: string;
}

export interface CsvValidationResult {
  valid: boolean;
  exportableImagesCount: number;
  totalImagesCount: number;
  policy: string;
  format: string;
  errors: string[];
  warnings: string[];
  previewRows: Record<string, string>[];
}

export interface ModelCostEstimate {
  provider: string;
  model: string;
  description: string;
  estimatedInputTokensPerImage: number;
  estimatedOutputTokensPerImage: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costPerImageUsd: number;
  totalBatchCostUsd: number;
  costFor100ImagesUsd: number;
  costFor500ImagesUsd: number;
  costFor1000ImagesUsd: number;
}

export interface CostEstimateResponse {
  batchId: string;
  totalImages: number;
  pendingImages: number;
  estimates: ModelCostEstimate[];
}

export interface BatchProgressEvent {
  batchId: string;
  status: BatchStatus;
  totalImages: number;
  processedImages: number;
  failedImages: number;
  safeImages: number;
  reviewRequiredImages: number;
  rejectedImages: number;
  progressPercentage: number;
  latestJobId?: string;
  latestFilename?: string;
  latestJobStatus?: JobStatus;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
