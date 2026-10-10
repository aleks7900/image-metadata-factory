package com.imagemetadata.dto;

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
public class BatchReclassifyResponse {
    private UUID batchId;
    private int reclassifiedCount;
    private int skippedManuallyEditedCount;
    private int skippedApprovedCount;
    private int totalTargeted;

    @Builder.Default
    private List<ReclassifiedJobItem> reclassifiedJobs = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReclassifiedJobItem {
        private UUID imageJobId;
        private String originalFilename;
        private Integer previousCategory;
        private String previousCategoryName;
        private int newCategory;
        private String newCategoryName;
        private double confidence;
        private String reason;
    }
}
