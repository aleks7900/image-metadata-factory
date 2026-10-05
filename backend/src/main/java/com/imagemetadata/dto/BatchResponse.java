package com.imagemetadata.dto;

import com.imagemetadata.model.BatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchResponse {
    private UUID id;
    private String name;
    private BatchStatus status;
    private int totalImages;
    private int processedImages;
    private int failedImages;
    private int safeImages;
    private int reviewRequiredImages;
    private int rejectedImages;
    private double progressPercentage;
    private Instant createdAt;
    private Instant startedAt;
    private Instant completedAt;

    // Aggregated metrics
    private long totalRequests;
    private long totalInputTokens;
    private long totalOutputTokens;
    private BigDecimal estimatedCostUsd;
    private double averageDurationMs;
}
