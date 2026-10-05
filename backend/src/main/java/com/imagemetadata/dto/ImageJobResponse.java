package com.imagemetadata.dto;

import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.model.RiskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageJobResponse {
    private UUID id;
    private UUID batchId;
    private String originalFilename;
    private String mimeType;
    private long fileSizeBytes;
    private JobStatus status;
    private String title;
    private String description;
    private RiskStatus riskStatus;
    private ReviewDecision reviewDecision;
    private String errorMessage;
    private int retryCount;
    private long processingDurationMs;
    private Instant createdAt;
    private Instant updatedAt;

    @Builder.Default
    private List<String> keywords = new ArrayList<>();

    @Builder.Default
    private List<SafetyFindingDto> safetyFindings = new ArrayList<>();

    private VisionAnalysisDto visionAnalysis;
    private String rawVisionAnalysisJson;
}
