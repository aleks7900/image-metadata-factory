package com.imagemetadata.service;

import com.imagemetadata.dto.*;
import com.imagemetadata.exception.ResourceNotFoundException;
import com.imagemetadata.exception.StorageException;
import com.imagemetadata.model.*;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.LlmUsageLogRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import com.imagemetadata.service.pipeline.BatchProcessorService;
import com.imagemetadata.service.storage.ImageStorageService;
import com.imagemetadata.service.storage.StoredImage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.FilterInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
public class BatchManagementService {

    private final ProcessingBatchRepository batchRepository;
    private final ImageJobRepository jobRepository;
    private final LlmUsageLogRepository usageLogRepository;
    private final ImageStorageService storageService;
    private final BatchProcessorService batchProcessorService;

    public BatchManagementService(
            ProcessingBatchRepository batchRepository,
            ImageJobRepository jobRepository,
            LlmUsageLogRepository usageLogRepository,
            ImageStorageService storageService,
            BatchProcessorService batchProcessorService
    ) {
        this.batchRepository = batchRepository;
        this.jobRepository = jobRepository;
        this.usageLogRepository = usageLogRepository;
        this.storageService = storageService;
        this.batchProcessorService = batchProcessorService;
    }

    @Transactional
    public BatchResponse createBatch(CreateBatchRequest request) {
        ProcessingBatch batch = ProcessingBatch.builder()
                .name(request.getName().trim())
                .status(BatchStatus.QUEUED)
                .createdAt(Instant.now())
                .build();

        ProcessingBatch saved = batchRepository.save(batch);
        log.info("Created new processing batch: {} ({})", saved.getName(), saved.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public BatchResponse uploadImages(UUID batchId, List<MultipartFile> files) {
        ProcessingBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No files provided for upload");
        }

        // Keep track of existing filenames in this batch for duplicate detection
        Set<String> existingFilenames = jobRepository.findByBatchId(batchId).stream()
                .map(ImageJob::getOriginalFilename)
                .collect(Collectors.toCollection(HashSet::new));

        List<ImageJob> newJobs = new ArrayList<>();
        Exception lastUploadException = null;

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg";

            // Support for ZIP archives
            if (isZipFile(originalName, file.getContentType())) {
                try (ZipInputStream zipIn = new ZipInputStream(file.getInputStream())) {
                    ZipEntry entry;
                    while ((entry = zipIn.getNextEntry()) != null) {
                        if (entry.isDirectory()) continue;
                        String entryName = entry.getName();
                        if (entryName.startsWith("__MACOSX") || entryName.startsWith(".")) continue;

                        String fileName = Paths.get(entryName).getFileName().toString();
                        if (isSupportedImageExtension(fileName)) {
                            try {
                                String uniqueName = ensureUniqueFilename(fileName, existingFilenames);
                                existingFilenames.add(uniqueName);

                                // Protect zip stream from being closed prematurely by individual entry writes
                                InputStream nonClosingEntryStream = new FilterInputStream(zipIn) {
                                    @Override
                                    public void close() {
                                        // Do not close parent zip stream
                                    }
                                };

                                StoredImage stored = storageService.store(
                                        nonClosingEntryStream,
                                        uniqueName,
                                        determineMimeType(uniqueName),
                                        entry.getSize(),
                                        batchId
                                );

                                ImageJob job = ImageJob.builder()
                                        .batchId(batchId)
                                        .originalFilename(stored.getOriginalFilename())
                                        .storagePath(stored.getStoragePath())
                                        .mimeType(stored.getMimeType())
                                        .fileSizeBytes(stored.getSizeBytes())
                                        .status(JobStatus.UPLOADED)
                                        .riskStatus(RiskStatus.SAFE)
                                        .reviewDecision(ReviewDecision.PENDING)
                                        .createdAt(Instant.now())
                                        .updatedAt(Instant.now())
                                        .build();
                                newJobs.add(job);
                            } catch (Exception e) {
                                lastUploadException = e;
                                log.warn("Failed to store individual zip entry {}: {}", entryName, e.getMessage());
                            }
                        }
                        zipIn.closeEntry();
                    }
                } catch (Exception e) {
                    lastUploadException = e;
                    log.error("Failed to process zip file {}: {}", originalName, e.getMessage(), e);
                }
            } else {
                // Regular single image upload with duplicate detection and resilient error handling
                try {
                    String uniqueName = ensureUniqueFilename(originalName, existingFilenames);
                    existingFilenames.add(uniqueName);

                    StoredImage stored = storageService.store(file.getInputStream(), uniqueName, file.getContentType(), file.getSize(), batchId);
                    ImageJob job = ImageJob.builder()
                            .batchId(batchId)
                            .originalFilename(stored.getOriginalFilename())
                            .storagePath(stored.getStoragePath())
                            .mimeType(stored.getMimeType())
                            .fileSizeBytes(stored.getSizeBytes())
                            .status(JobStatus.UPLOADED)
                            .riskStatus(RiskStatus.SAFE)
                            .reviewDecision(ReviewDecision.PENDING)
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    newJobs.add(job);
                } catch (StorageException e) {
                    lastUploadException = e;
                    log.warn("Failed to upload single file {}: {}", originalName, e.getMessage());
                } catch (Exception e) {
                    lastUploadException = e;
                    log.warn("Failed to upload single file {}: {}", originalName, e.getMessage());
                }
            }
        }

        if (newJobs.isEmpty()) {
            if (lastUploadException instanceof StorageException se) {
                throw se;
            }
            if (lastUploadException != null) {
                throw new IllegalArgumentException("Unsupported file extension: " + lastUploadException.getMessage(), lastUploadException);
            }
            throw new IllegalArgumentException("Unsupported file extension: No valid image files could be imported (check file extensions: jpg, jpeg, png, webp, zip)");
        }

        jobRepository.saveAll(newJobs);
        batch.setTotalImages(batch.getTotalImages() + newJobs.size());
        batchRepository.save(batch);

        log.info("Uploaded {} images to batch {}", newJobs.size(), batchId);
        return mapToResponse(batch);
    }

    private boolean isZipFile(String filename, String contentType) {
        if (filename != null && filename.toLowerCase().endsWith(".zip")) return true;
        return "application/zip".equalsIgnoreCase(contentType) || "application/x-zip-compressed".equalsIgnoreCase(contentType);
    }

    private boolean isSupportedImageExtension(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
    }

    private String determineMimeType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    private String ensureUniqueFilename(String filename, Set<String> existingNames) {
        if (!existingNames.contains(filename)) {
            return filename;
        }
        int dot = filename.lastIndexOf('.');
        String base = dot > 0 ? filename.substring(0, dot) : filename;
        String ext = dot > 0 ? filename.substring(dot) : "";
        int counter = 1;
        String candidate = base + "_" + counter + ext;
        while (existingNames.contains(candidate)) {
            counter++;
            candidate = base + "_" + counter + ext;
        }
        return candidate;
    }

    @Transactional(readOnly = true)
    public Page<BatchResponse> listBatches(Pageable pageable) {
        return batchRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public BatchResponse getBatchById(UUID batchId) {
        ProcessingBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
        return mapToResponse(batch);
    }

    @Transactional
    public void deleteBatch(UUID batchId) {
        ProcessingBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        List<ImageJob> jobs = jobRepository.findByBatchId(batchId);
        for (ImageJob job : jobs) {
            storageService.delete(job.getStoragePath());
        }

        batchRepository.delete(batch);
        log.info("Deleted batch {} and all associated images", batchId);
    }

    public void startBatch(UUID batchId) {
        batchProcessorService.startBatch(batchId);
    }

    public void pauseBatch(UUID batchId) {
        batchProcessorService.pauseBatch(batchId);
    }

    public void resumeBatch(UUID batchId) {
        batchProcessorService.resumeBatch(batchId);
    }

    public void cancelBatch(UUID batchId) {
        batchProcessorService.cancelBatch(batchId);
    }

    public void retryFailedJobs(UUID batchId) {
        batchProcessorService.retryFailedJobs(batchId);
    }

    @Transactional
    public int bulkReview(UUID batchId, BulkReviewRequest request) {
        RiskStatus targetRisk = request.getRiskStatus() != null ? request.getRiskStatus() : RiskStatus.REVIEW_REQUIRED;
        int updated = jobRepository.updateReviewDecisionByBatchIdAndRiskStatus(batchId, targetRisk, request.getDecision());
        log.info("Bulk updated {} jobs in batch {} to {}", updated, batchId, request.getDecision());
        return updated;
    }

    @Transactional(readOnly = true)
    public CostEstimateResponse getCostEstimate(UUID batchId) {
        ProcessingBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));

        int total = batch.getTotalImages();
        int pending = (int) jobRepository.countByBatchIdAndStatus(batchId, JobStatus.UPLOADED);
        int calcCount = pending > 0 ? pending : Math.max(total, 1);

        int inTokensPerImg = 1865;
        int outTokensPerImg = 400;

        List<CostEstimateResponse.ModelCostEstimate> list = new ArrayList<>();
        list.add(createModelEstimate("openai", "gpt-4o-mini", "Fast, cost-efficient multimodal Vision model (Recommended)", inTokensPerImg, outTokensPerImg, calcCount, 0.15, 0.60));
        list.add(createModelEstimate("openai", "gpt-4o", "Flagship high-detail multimodal Vision model", inTokensPerImg, outTokensPerImg, calcCount, 2.50, 10.00));
        list.add(createModelEstimate("mock", "mock-vision-v1", "Deterministic zero-cost test suite model", inTokensPerImg, outTokensPerImg, calcCount, 0.0, 0.0));

        return CostEstimateResponse.builder()
                .batchId(batchId)
                .totalImages(total)
                .pendingImages(pending)
                .estimates(list)
                .build();
    }

    private CostEstimateResponse.ModelCostEstimate createModelEstimate(
            String provider, String model, String desc,
            int inTokensPerImg, int outTokensPerImg, int count,
            double promptPricePer1M, double completionPricePer1M
    ) {
        long totalIn = (long) inTokensPerImg * count;
        long totalOut = (long) outTokensPerImg * count;
        double costPerImage = (inTokensPerImg / 1_000_000.0) * promptPricePer1M + (outTokensPerImg / 1_000_000.0) * completionPricePer1M;
        double totalCost = costPerImage * count;

        return CostEstimateResponse.ModelCostEstimate.builder()
                .provider(provider)
                .model(model)
                .description(desc)
                .estimatedInputTokensPerImage(inTokensPerImg)
                .estimatedOutputTokensPerImage(outTokensPerImg)
                .totalInputTokens(totalIn)
                .totalOutputTokens(totalOut)
                .costPerImageUsd(BigDecimal.valueOf(costPerImage).setScale(6, RoundingMode.HALF_UP))
                .totalBatchCostUsd(BigDecimal.valueOf(totalCost).setScale(4, RoundingMode.HALF_UP))
                .costFor100ImagesUsd(BigDecimal.valueOf(costPerImage * 100).setScale(4, RoundingMode.HALF_UP))
                .costFor500ImagesUsd(BigDecimal.valueOf(costPerImage * 500).setScale(4, RoundingMode.HALF_UP))
                .costFor1000ImagesUsd(BigDecimal.valueOf(costPerImage * 1000).setScale(4, RoundingMode.HALF_UP))
                .build();
    }

    public int getConcurrency() {
        return batchProcessorService.getConcurrency();
    }

    public void setConcurrency(int val) {
        batchProcessorService.setConcurrency(val);
    }

    private BatchResponse mapToResponse(ProcessingBatch b) {
        double progress = b.getTotalImages() > 0
                ? ((double) (b.getProcessedImages() + b.getFailedImages()) / b.getTotalImages()) * 100.0
                : 0.0;

        long totalReqs = usageLogRepository.countByBatchId(b.getId());
        long inTokens = usageLogRepository.sumInputTokensByBatchId(b.getId());
        long outTokens = usageLogRepository.sumOutputTokensByBatchId(b.getId());
        BigDecimal cost = usageLogRepository.sumEstimatedCostByBatchId(b.getId());
        double avgDuration = usageLogRepository.avgDurationMsByBatchId(b.getId());

        return BatchResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .status(b.getStatus())
                .totalImages(b.getTotalImages())
                .processedImages(b.getProcessedImages())
                .failedImages(b.getFailedImages())
                .safeImages(b.getSafeImages())
                .reviewRequiredImages(b.getReviewRequiredImages())
                .rejectedImages(b.getRejectedImages())
                .progressPercentage(Math.round(progress * 10.0) / 10.0)
                .createdAt(b.getCreatedAt())
                .startedAt(b.getStartedAt())
                .completedAt(b.getCompletedAt())
                .totalRequests(totalReqs)
                .totalInputTokens(inTokens)
                .totalOutputTokens(outTokens)
                .estimatedCostUsd(cost)
                .averageDurationMs(Math.round(avgDuration * 10.0) / 10.0)
                .build();
    }
}
