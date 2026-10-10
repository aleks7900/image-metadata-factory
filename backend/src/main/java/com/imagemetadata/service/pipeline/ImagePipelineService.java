package com.imagemetadata.service.pipeline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagemetadata.dto.SafetyFindingDto;
import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.exception.LlmProviderException;
import com.imagemetadata.model.*;
import com.imagemetadata.repository.*;
import com.imagemetadata.service.llm.*;
import com.imagemetadata.service.storage.ImageOptimizationService;
import com.imagemetadata.service.storage.ImageStorageService;
import com.imagemetadata.service.validation.CategoryValidationService;
import com.imagemetadata.service.validation.DeterministicSafetyValidator;
import com.imagemetadata.service.validation.MetadataQualityValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class ImagePipelineService {

    private final ImageJobRepository imageJobRepository;
    private final ImageKeywordRepository keywordRepository;
    private final SafetyFindingRepository safetyFindingRepository;
    private final VisionAnalysisRepository visionAnalysisRepository;
    private final LlmUsageLogRepository usageLogRepository;
    private final ImageStorageService storageService;
    private final LlmProviderRouter llmProviderRouter;
    private final DeterministicSafetyValidator deterministicSafetyValidator;
    private final MetadataQualityValidator metadataQualityValidator;
    private final ObjectMapper objectMapper;
    private final ImageOptimizationService imageOptimizationService;
    private final CategoryValidationService categoryValidationService;
    private final int maxRetries;
    private final boolean autoRepairEnabled;

    public ImagePipelineService(
            ImageJobRepository imageJobRepository,
            ImageKeywordRepository keywordRepository,
            SafetyFindingRepository safetyFindingRepository,
            VisionAnalysisRepository visionAnalysisRepository,
            LlmUsageLogRepository usageLogRepository,
            ImageStorageService storageService,
            LlmProviderRouter llmProviderRouter,
            DeterministicSafetyValidator deterministicSafetyValidator,
            MetadataQualityValidator metadataQualityValidator,
            ObjectMapper objectMapper,
            ImageOptimizationService imageOptimizationService,
            CategoryValidationService categoryValidationService,
            @Value("${app.processing.max-retries:3}") int maxRetries,
            @Value("${app.validation.auto-repair-enabled:true}") boolean autoRepairEnabled
    ) {
        this.imageJobRepository = imageJobRepository;
        this.keywordRepository = keywordRepository;
        this.safetyFindingRepository = safetyFindingRepository;
        this.visionAnalysisRepository = visionAnalysisRepository;
        this.usageLogRepository = usageLogRepository;
        this.storageService = storageService;
        this.llmProviderRouter = llmProviderRouter;
        this.deterministicSafetyValidator = deterministicSafetyValidator;
        this.metadataQualityValidator = metadataQualityValidator;
        this.objectMapper = objectMapper;
        this.imageOptimizationService = imageOptimizationService;
        this.categoryValidationService = categoryValidationService;
        this.maxRetries = maxRetries;
        this.autoRepairEnabled = autoRepairEnabled;
    }

    public void processJob(UUID imageJobId) {
        ImageJob job = imageJobRepository.findById(imageJobId)
                .orElseThrow(() -> new IllegalArgumentException("ImageJob not found: " + imageJobId));

        if (job.getStatus() == JobStatus.READY) {
            log.info("Job {} is already READY, skipping duplicate processing", imageJobId);
            return;
        }

        long pipelineStartTime = System.currentTimeMillis();
        ImageMetadataProvider provider = llmProviderRouter.getProvider();

        try {
            log.info("Starting processing pipeline for job {} ({}), provider={}", job.getId(), job.getOriginalFilename(), provider.getProviderName());

            // 1. Stage: VISION_ANALYSIS
            updateJobStatus(job, JobStatus.VISION_ANALYSIS, null);
            byte[] imageBytes = storageService.loadBytes(job.getStoragePath());
            if (imageBytes == null || imageBytes.length < 12) {
                throw new IllegalArgumentException("Corrupt image file: insufficient byte length (" + (imageBytes != null ? imageBytes.length : 0) + " bytes)");
            }
            if (!isValidImageHeader(imageBytes)) {
                throw new IllegalArgumentException("Corrupt or invalid image file: signature does not match supported image formats (JPEG, PNG, WebP)");
            }

            ImageOptimizationService.ImageInfo imageInfo = imageOptimizationService.inspectAndOptimizeForVision(imageBytes, job.getMimeType());
            job.setImageWidth(imageInfo.getWidth());
            job.setImageHeight(imageInfo.getHeight());
            byte[] visionInputBytes = imageInfo.getOptimizedVisionBytes() != null ? imageInfo.getOptimizedVisionBytes() : imageBytes;

            ImageAnalysisRequest request = ImageAnalysisRequest.builder()
                    .batchId(job.getBatchId())
                    .imageJobId(job.getId())
                    .originalFilename(job.getOriginalFilename())
                    .storagePath(job.getStoragePath())
                    .mimeType(job.getMimeType())
                    .imageBytes(visionInputBytes)
                    .build();

            ImageAnalysisResult visionResult = provider.analyzeVision(request);
            recordUsage(job.getBatchId(), job.getId(), "VISION_ANALYSIS", visionResult);
            persistVisionAnalysis(job.getId(), visionResult);

            // 2. Stage: METADATA_GENERATION
            updateJobStatus(job, JobStatus.METADATA_GENERATION, null);
            ImageAnalysisResult metadataResult = provider.generateMetadata(visionResult.getVision(), request);
            recordUsage(job.getBatchId(), job.getId(), "METADATA_GENERATION", metadataResult);

            String candidateTitle = metadataResult.getTitle();
            String candidateDescription = metadataResult.getDescription();
            List<String> candidateKeywords = metadataResult.getKeywords();

            Integer candidateCategoryId = metadataResult.getCategory();
            String candidateCategoryName = metadataResult.getCategoryName();
            Double candidateConfidence = metadataResult.getCategoryConfidence();
            String candidateReason = metadataResult.getCategoryReason();

            log.info("Job {} metadata generation produced category: id={}, name={}, confidence={}, reason='{}'",
                    job.getId(), candidateCategoryId, candidateCategoryName, candidateConfidence, candidateReason);

            // Validate and resolve category through CategoryValidationService
            CategoryValidationService.CategoryValidationResult catValidation = categoryValidationService.validateAndResolve(
                    candidateCategoryId,
                    candidateCategoryName,
                    candidateConfidence,
                    candidateReason,
                    visionResult.getVision(),
                    candidateTitle,
                    candidateKeywords
            );

            log.info("Job {} category validated: resolvedId={}, resolvedName={}, confidence={}, contradictionDetected={}, reviewRequired={}",
                    job.getId(), catValidation.resolvedCategoryId(), catValidation.resolvedCategoryName(),
                    catValidation.confidence(), catValidation.isContradictionDetected(), catValidation.isReviewRequired());

            if (!job.isCategoryManuallyEdited()) {
                job.setCategory(catValidation.resolvedCategoryId());
                job.setCategoryName(catValidation.resolvedCategoryName());
                job.setCategoryConfidence(catValidation.confidence());
                job.setCategoryReason(catValidation.reason());
                if (catValidation.originalCategoryId() != null && catValidation.originalCategoryId() != catValidation.resolvedCategoryId()) {
                    job.setCategorySuggested(catValidation.originalCategoryId());
                }
            }

            // 3. Stage: SAFETY_VALIDATION
            updateJobStatus(job, JobStatus.SAFETY_VALIDATION, null);
            ImageAnalysisResult safetyResult = provider.validateSafety(visionResult.getVision(), candidateTitle, candidateDescription, candidateKeywords, request);
            recordUsage(job.getBatchId(), job.getId(), "SAFETY_VALIDATION", safetyResult);

            // Merge with deterministic safety evaluation
            DeterministicSafetyValidator.SafetyEvaluationResult deterministicResult =
                    deterministicSafetyValidator.evaluate(visionResult.getVision(), candidateTitle, candidateDescription, candidateKeywords);

            RiskStatus finalRisk = resolveRisk(safetyResult.getRiskStatus(), deterministicResult.riskStatus());
            List<SafetyFindingDto> combinedFindings = new ArrayList<>(safetyResult.getSafetyFindings());
            combinedFindings.addAll(deterministicResult.findings());

            // If category contradiction was detected, flag for review and add finding
            if (catValidation.isContradictionDetected()) {
                combinedFindings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.QUALITY)
                        .value("Category Contradiction")
                        .confidence(0.95)
                        .reason(catValidation.contradictionDetails())
                        .build());
            }
            if (catValidation.isReviewRequired()) {
                finalRisk = resolveRisk(finalRisk, RiskStatus.REVIEW_REQUIRED);
            }

            // Add resolution finding if below Adobe Stock recommendation
            if (imageInfo.getWidth() > 0 && !imageInfo.isMeetsAdobeStockResolution()) {
                combinedFindings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.QUALITY)
                        .value("Low Resolution (" + imageInfo.getWidth() + "x" + imageInfo.getHeight() + ")")
                        .confidence(0.95)
                        .reason("Image resolution is below Adobe Stock's recommended 4 Megapixels.")
                        .build());
            }

            // 4. Stage: QUALITY_VALIDATION
            updateJobStatus(job, JobStatus.QUALITY_VALIDATION, null);
            MetadataQualityValidator.QualityValidationResult qualityResult =
                    metadataQualityValidator.validate(candidateTitle, candidateDescription, candidateKeywords, visionResult.getVision());

            // Automatic single repair cycle if violations found
            if (!qualityResult.isValid() && autoRepairEnabled) {
                log.info("Job {} quality check failed ({} violations). Attempting targeted LLM repair.", job.getId(), qualityResult.violations().size());
                ImageAnalysisResult repairResult = provider.repairMetadata(
                        visionResult.getVision(),
                        candidateTitle,
                        candidateDescription,
                        candidateKeywords,
                        qualityResult.violations(),
                        request
                );
                recordUsage(job.getBatchId(), job.getId(), "METADATA_REPAIR", repairResult);

                candidateTitle = repairResult.getTitle();
                candidateDescription = repairResult.getDescription();
                candidateKeywords = repairResult.getKeywords();

                // Re-validate post-repair
                qualityResult = metadataQualityValidator.validate(candidateTitle, candidateDescription, candidateKeywords, visionResult.getVision());
            }

            // 5. Final Stage: READY
            finalizeJob(job, qualityResult, finalRisk, combinedFindings, visionResult.getVision(), System.currentTimeMillis() - pipelineStartTime);
            log.info("Job {} successfully completed in {}ms. Risk={}, Title='{}'", job.getId(), job.getProcessingDurationMs(), finalRisk, job.getTitle());

        } catch (Exception e) {
            boolean isRetryable = (e instanceof LlmProviderException && ((LlmProviderException) e).isRetryable())
                    || e instanceof org.springframework.web.client.ResourceAccessException
                    || e instanceof java.io.IOException;

            if (isRetryable && job.getRetryCount() < maxRetries) {
                job.setRetryCount(job.getRetryCount() + 1);
                job.setErrorMessage("Retrying (" + job.getRetryCount() + "/" + maxRetries + "): " + e.getMessage());
                job.setUpdatedAt(Instant.now());
                imageJobRepository.save(job);
                log.warn("Job {} failed with retryable error (attempt {}/{}): {}. Retrying in 1s...",
                        job.getId(), job.getRetryCount(), maxRetries, e.getMessage());
                try {
                    Thread.sleep(1000L * job.getRetryCount());
                } catch (InterruptedException ignored) {}
                processJob(imageJobId);
                return;
            }

            log.error("Pipeline failure for job {}: {}", job.getId(), e.getMessage(), e);
            handleJobFailure(job, e);
        }
    }

    @Transactional
    public void retryJob(UUID imageJobId) {
        ImageJob job = imageJobRepository.findById(imageJobId)
                .orElseThrow(() -> new IllegalArgumentException("ImageJob not found: " + imageJobId));

        job.setStatus(JobStatus.UPLOADED);
        job.setErrorMessage(null);
        job.setRetryCount(job.getRetryCount() + 1);
        job.setUpdatedAt(Instant.now());
        imageJobRepository.save(job);

        processJob(imageJobId);
    }

    @Transactional
    public void regenerateMetadata(UUID imageJobId) {
        ImageJob job = imageJobRepository.findById(imageJobId)
                .orElseThrow(() -> new IllegalArgumentException("ImageJob not found: " + imageJobId));

        keywordRepository.deleteByImageJobId(imageJobId);
        safetyFindingRepository.deleteByImageJobId(imageJobId);
        visionAnalysisRepository.deleteByImageJobId(imageJobId);

        job.setStatus(JobStatus.UPLOADED);
        job.setErrorMessage(null);
        job.setTitle(null);
        job.setDescription(null);
        if (!job.isCategoryManuallyEdited()) {
            job.setCategory(null);
            job.setCategoryName(null);
            job.setCategoryConfidence(null);
            job.setCategoryReason(null);
            job.setCategorySuggested(null);
        }
        job.setRiskStatus(RiskStatus.SAFE);
        job.setReviewDecision(ReviewDecision.PENDING);
        job.setUpdatedAt(Instant.now());
        imageJobRepository.save(job);

        processJob(imageJobId);
    }

    private void updateJobStatus(ImageJob job, JobStatus status, String errorMessage) {
        job.setStatus(status);
        job.setErrorMessage(errorMessage);
        job.setUpdatedAt(Instant.now());
        imageJobRepository.save(job);
    }

    @Transactional
    protected void finalizeJob(
            ImageJob job,
            MetadataQualityValidator.QualityValidationResult qualityResult,
            RiskStatus finalRisk,
            List<SafetyFindingDto> findings,
            VisionAnalysisDto visionDto,
            long durationMs
    ) {
        job.setTitle(qualityResult.sanitizedTitle());
        job.setDescription(qualityResult.sanitizedDescription());
        job.setRiskStatus(finalRisk);
        job.setReviewDecision(finalRisk == RiskStatus.SAFE ? ReviewDecision.APPROVED : ReviewDecision.PENDING);
        job.setStatus(JobStatus.READY);
        job.setErrorMessage(null);
        job.setProcessingDurationMs(durationMs);
        job.setUpdatedAt(Instant.now());

        // Infer/Validate Adobe Stock category if not manually provided
        if (job.getCategory() == null) {
            CategoryValidationService.CategoryValidationResult fallbackValidation = categoryValidationService.validateAndResolve(
                    null,
                    null,
                    null,
                    null,
                    visionDto,
                    qualityResult.sanitizedTitle(),
                    qualityResult.sanitizedKeywords()
            );
            job.setCategory(fallbackValidation.resolvedCategoryId());
            job.setCategoryName(fallbackValidation.resolvedCategoryName());
            job.setCategoryConfidence(fallbackValidation.confidence());
            job.setCategoryReason(fallbackValidation.reason());
        }

        // Compute compliance status
        String complianceStatus = DeterministicSafetyValidator.mapComplianceStatus(finalRisk, findings);
        job.setComplianceStatus(complianceStatus);

        // Clear existing keywords & findings for idempotency
        keywordRepository.deleteByImageJobId(job.getId());
        safetyFindingRepository.deleteByImageJobId(job.getId());

        // Persist normalized keywords
        List<ImageKeyword> keywordEntities = new ArrayList<>();
        int pos = 1;
        for (String kw : qualityResult.sanitizedKeywords()) {
            keywordEntities.add(ImageKeyword.builder()
                    .imageJobId(job.getId())
                    .keyword(kw)
                    .position(pos++)
                    .build());
        }
        keywordRepository.saveAll(keywordEntities);

        // Persist safety findings
        List<SafetyFinding> findingEntities = new ArrayList<>();
        for (SafetyFindingDto f : findings) {
            findingEntities.add(SafetyFinding.builder()
                    .imageJobId(job.getId())
                    .type(f.getType())
                    .value(f.getValue())
                    .confidence(f.getConfidence())
                    .reason(f.getReason())
                    .build());
        }
        safetyFindingRepository.saveAll(findingEntities);

        imageJobRepository.save(job);
    }

    @Transactional
    protected void handleJobFailure(ImageJob job, Exception e) {
        job.setStatus(JobStatus.FAILED);
        job.setErrorMessage(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        job.setUpdatedAt(Instant.now());
        imageJobRepository.save(job);
    }

    private void persistVisionAnalysis(UUID imageJobId, ImageAnalysisResult visionResult) {
        try {
            visionAnalysisRepository.deleteByImageJobId(imageJobId);
            VisionAnalysis entity = VisionAnalysis.builder()
                    .imageJobId(imageJobId)
                    .analysisJson(visionResult.getRawVisionJson())
                    .provider(visionResult.getProvider())
                    .model(visionResult.getModel())
                    .promptVersion(visionResult.getPromptVersion())
                    .createdAt(Instant.now())
                    .build();
            visionAnalysisRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist vision analysis for job {}: {}", imageJobId, e.getMessage());
        }
    }

    private void recordUsage(UUID batchId, UUID imageJobId, String stage, ImageAnalysisResult result) {
        if (result == null) return;
        try {
            LlmUsageLog logEntry = LlmUsageLog.builder()
                    .batchId(batchId)
                    .imageJobId(imageJobId)
                    .stage(stage)
                    .provider(result.getProvider())
                    .model(result.getModel())
                    .inputTokens(result.getInputTokens())
                    .outputTokens(result.getOutputTokens())
                    .estimatedCostUsd(result.getEstimatedCostUsd())
                    .durationMs(result.getDurationMs())
                    .createdAt(Instant.now())
                    .build();
            usageLogRepository.save(logEntry);
        } catch (Exception e) {
            log.warn("Failed to record LLM usage log: {}", e.getMessage());
        }
    }

    private RiskStatus resolveRisk(RiskStatus llmRisk, RiskStatus deterministicRisk) {
        if (llmRisk == RiskStatus.REJECT || deterministicRisk == RiskStatus.REJECT) {
            return RiskStatus.REJECT;
        }
        if (llmRisk == RiskStatus.REVIEW_REQUIRED || deterministicRisk == RiskStatus.REVIEW_REQUIRED) {
            return RiskStatus.REVIEW_REQUIRED;
        }
        return RiskStatus.SAFE;
    }

    private boolean isValidImageHeader(byte[] bytes) {
        if (bytes == null || bytes.length < 12) return false;

        // JPEG: FF D8 FF
        boolean isJpeg = (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF;

        // PNG: 89 50 4E 47
        boolean isPng = (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;

        // WEBP: 'R' 'I' 'F' 'F' ... 'W' 'E' 'B' 'P'
        boolean isWebp = bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';

        return isJpeg || isPng || isWebp;
    }
}

