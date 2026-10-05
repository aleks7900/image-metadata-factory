package com.imagemetadata.service.llm;

import com.imagemetadata.dto.SafetyFindingDto;
import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.model.RiskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageAnalysisResult {
    private VisionAnalysisDto vision;
    private String rawVisionJson;
    private String title;
    private String description;

    @Builder.Default
    private List<String> keywords = new ArrayList<>();

    @Builder.Default
    private RiskStatus riskStatus = RiskStatus.SAFE;

    private String safetyReasoning;

    @Builder.Default
    private List<SafetyFindingDto> safetyFindings = new ArrayList<>();

    private boolean modelReleaseMayBeRequired;
    private String provider;
    private String model;
    private String promptVersion;

    @Builder.Default
    private int inputTokens = 0;

    @Builder.Default
    private int outputTokens = 0;

    @Builder.Default
    private BigDecimal estimatedCostUsd = BigDecimal.ZERO;

    @Builder.Default
    private long durationMs = 0;
}
