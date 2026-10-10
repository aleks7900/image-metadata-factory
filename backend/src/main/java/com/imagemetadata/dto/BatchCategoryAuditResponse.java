package com.imagemetadata.dto;

import com.imagemetadata.model.ReviewDecision;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCategoryAuditResponse {
    private UUID batchId;
    private int totalImages;
    private int validCount;
    private int suspiciousCount;
    private int manuallyEditedCount;

    @Builder.Default
    private List<SuspiciousCategoryItem> suspiciousItems = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuspiciousCategoryItem {
        private UUID imageJobId;
        private String originalFilename;
        private Integer currentCategory;
        private String currentCategoryName;
        private int suggestedCategory;
        private String suggestedCategoryName;
        private double confidence;
        private String reason;
        private boolean isManuallyEdited;
        private ReviewDecision reviewDecision;
        private String contradictionDetails;
    }
}
