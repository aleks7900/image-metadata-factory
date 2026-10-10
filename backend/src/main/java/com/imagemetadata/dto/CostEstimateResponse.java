package com.imagemetadata.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CostEstimateResponse {
    private UUID batchId;
    private int totalImages;
    private int pendingImages;

    @Builder.Default
    private List<ModelCostEstimate> estimates = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModelCostEstimate {
        private String provider;
        private String model;
        private String description;
        private int estimatedInputTokensPerImage;
        private int estimatedOutputTokensPerImage;
        private long totalInputTokens;
        private long totalOutputTokens;
        private BigDecimal costPerImageUsd;
        private BigDecimal totalBatchCostUsd;
        private BigDecimal costFor100ImagesUsd;
        private BigDecimal costFor500ImagesUsd;
        private BigDecimal costFor1000ImagesUsd;
    }
}
