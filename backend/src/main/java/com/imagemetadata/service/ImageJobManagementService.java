package com.imagemetadata.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagemetadata.dto.*;
import com.imagemetadata.exception.ResourceNotFoundException;
import com.imagemetadata.model.*;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ImageKeywordRepository;
import com.imagemetadata.repository.SafetyFindingRepository;
import com.imagemetadata.repository.VisionAnalysisRepository;
import com.imagemetadata.service.pipeline.ImagePipelineService;
import com.imagemetadata.service.storage.ImageStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class ImageJobManagementService {

    private final ImageJobRepository jobRepository;
    private final ImageKeywordRepository keywordRepository;
    private final SafetyFindingRepository safetyFindingRepository;
    private final VisionAnalysisRepository visionAnalysisRepository;
    private final ImageStorageService storageService;
    private final ImagePipelineService pipelineService;
    private final ObjectMapper objectMapper;

    public ImageJobManagementService(
            ImageJobRepository jobRepository,
            ImageKeywordRepository keywordRepository,
            SafetyFindingRepository safetyFindingRepository,
            VisionAnalysisRepository visionAnalysisRepository,
            ImageStorageService storageService,
            ImagePipelineService pipelineService,
            ObjectMapper objectMapper
    ) {
        this.jobRepository = jobRepository;
        this.keywordRepository = keywordRepository;
        this.safetyFindingRepository = safetyFindingRepository;
        this.visionAnalysisRepository = visionAnalysisRepository;
        this.storageService = storageService;
        this.pipelineService = pipelineService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ImageJobResponse getJobById(UUID imageJobId) {
        ImageJob job = jobRepository.findById(imageJobId)
                .orElseThrow(() -> new ResourceNotFoundException("ImageJob not found: " + imageJobId));
        return mapToResponse(job);
    }

    @Transactional(readOnly = true)
    public Page<ImageJobResponse> searchJobs(
            UUID batchId,
            JobStatus status,
            RiskStatus riskStatus,
            ReviewDecision decision,
            String search,
            Pageable pageable
    ) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        if (status == null && riskStatus == null && decision == null && cleanSearch == null) {
            return jobRepository.findByBatchId(batchId, pageable).map(this::mapToResponse);
        }
        return jobRepository.searchJobs(batchId, status, riskStatus, decision, cleanSearch, pageable)
                .map(this::mapToResponse);
    }

    public void retryJob(UUID imageJobId) {
        CompletableFuture.runAsync(() -> pipelineService.retryJob(imageJobId));
    }

    public void regenerateMetadata(UUID imageJobId) {
        CompletableFuture.runAsync(() -> pipelineService.regenerateMetadata(imageJobId));
    }

    @Transactional
    public ImageJobResponse updateMetadata(UUID imageJobId, UpdateMetadataRequest request) {
        ImageJob job = jobRepository.findById(imageJobId)
                .orElseThrow(() -> new ResourceNotFoundException("ImageJob not found: " + imageJobId));

        job.setTitle(request.getTitle().trim());
        job.setDescription(request.getDescription().trim());
        if (request.getCategory() != null) {
            job.setCategory(request.getCategory());
            AdobeStockCategory cat = AdobeStockCategory.fromId(request.getCategory());
            job.setCategoryName(cat != null ? cat.getName() : "Custom");
            job.setCategoryConfidence(1.0);
            job.setCategoryReason("Manually assigned by user");
            job.setCategoryManuallyEdited(true);
        }
        if (request.getReleases() != null) {
            job.setReleases(request.getReleases().trim());
        }
        if (request.getIsAiGenerated() != null) {
            job.setAiGenerated(request.getIsAiGenerated());
        }
        job.setUpdatedAt(Instant.now());

        // Replace keywords with new ordered set
        keywordRepository.deleteByImageJobId(imageJobId);
        List<ImageKeyword> newKeywords = new ArrayList<>();
        int position = 1;
        for (String kw : request.getKeywords()) {
            if (kw == null || kw.trim().isEmpty()) continue;
            newKeywords.add(ImageKeyword.builder()
                    .imageJobId(imageJobId)
                    .keyword(kw.trim().toLowerCase())
                    .position(position++)
                    .build());
        }
        keywordRepository.saveAll(newKeywords);

        ImageJob updated = jobRepository.save(job);
        log.info("Manually updated metadata for image job {}", imageJobId);
        return mapToResponse(updated);
    }

    @Transactional
    public ImageJobResponse reviewJob(UUID imageJobId, ReviewDecision decision) {
        ImageJob job = jobRepository.findById(imageJobId)
                .orElseThrow(() -> new ResourceNotFoundException("ImageJob not found: " + imageJobId));

        job.setReviewDecision(decision);
        job.setUpdatedAt(Instant.now());
        ImageJob updated = jobRepository.save(job);
        log.info("Set review decision for job {} to {}", imageJobId, decision);
        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public Resource loadImageResource(UUID imageJobId) {
        ImageJob job = jobRepository.findById(imageJobId)
                .orElseThrow(() -> new ResourceNotFoundException("ImageJob not found: " + imageJobId));
        return storageService.load(job.getStoragePath());
    }

    @Transactional(readOnly = true)
    public String getJobMimeType(UUID imageJobId) {
        ImageJob job = jobRepository.findById(imageJobId)
                .orElseThrow(() -> new ResourceNotFoundException("ImageJob not found: " + imageJobId));
        return job.getMimeType();
    }

    private ImageJobResponse mapToResponse(ImageJob job) {
        List<ImageKeyword> keywords = keywordRepository.findByImageJobIdOrderByPositionAsc(job.getId());
        List<String> keywordStrings = keywords.stream().map(ImageKeyword::getKeyword).toList();

        List<SafetyFinding> findings = safetyFindingRepository.findByImageJobId(job.getId());
        List<SafetyFindingDto> findingDtos = findings.stream().map(f -> SafetyFindingDto.builder()
                .type(f.getType())
                .value(f.getValue())
                .confidence(f.getConfidence())
                .reason(f.getReason())
                .build()).toList();

        Optional<VisionAnalysis> visionOpt = visionAnalysisRepository.findByImageJobId(job.getId());
        VisionAnalysisDto visionDto = null;
        String rawVision = null;
        if (visionOpt.isPresent()) {
            rawVision = visionOpt.get().getAnalysisJson();
            try {
                visionDto = objectMapper.readValue(rawVision, VisionAnalysisDto.class);
            } catch (Exception ignored) {}
        }

        return ImageJobResponse.builder()
                .id(job.getId())
                .batchId(job.getBatchId())
                .originalFilename(job.getOriginalFilename())
                .mimeType(job.getMimeType())
                .fileSizeBytes(job.getFileSizeBytes())
                .status(job.getStatus())
                .title(job.getTitle())
                .description(job.getDescription())
                .riskStatus(job.getRiskStatus())
                .reviewDecision(job.getReviewDecision())
                .errorMessage(job.getErrorMessage())
                .retryCount(job.getRetryCount())
                .processingDurationMs(job.getProcessingDurationMs())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .keywords(keywordStrings)
                .safetyFindings(findingDtos)
                .visionAnalysis(visionDto)
                .rawVisionAnalysisJson(rawVision)
                .category(job.getCategory())
                .categoryName(job.getCategoryName())
                .categoryConfidence(job.getCategoryConfidence())
                .categoryReason(job.getCategoryReason())
                .categorySuggested(job.getCategorySuggested())
                .categoryManuallyEdited(job.isCategoryManuallyEdited())
                .releases(job.getReleases())
                .isAiGenerated(job.isAiGenerated())
                .imageWidth(job.getImageWidth())
                .imageHeight(job.getImageHeight())
                .complianceStatus(job.getComplianceStatus())
                .build();
    }
}
