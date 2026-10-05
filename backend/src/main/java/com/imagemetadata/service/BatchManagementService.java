package com.imagemetadata.service;

import com.imagemetadata.dto.*;
import com.imagemetadata.exception.ResourceNotFoundException;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

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

        List<ImageJob> newJobs = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                StoredImage stored = storageService.store(file, batchId);
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
                log.error("Failed to store file {}: {}", file.getOriginalFilename(), e.getMessage());
            }
        }

        jobRepository.saveAll(newJobs);
        batch.setTotalImages(batch.getTotalImages() + newJobs.size());
        batchRepository.save(batch);

        log.info("Uploaded {} images to batch {}", newJobs.size(), batchId);
        return mapToResponse(batch);
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
