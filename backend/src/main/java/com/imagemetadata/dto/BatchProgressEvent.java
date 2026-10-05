package com.imagemetadata.dto;

import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchProgressEvent {
    private UUID batchId;
    private BatchStatus status;
    private int totalImages;
    private int processedImages;
    private int failedImages;
    private int safeImages;
    private int reviewRequiredImages;
    private int rejectedImages;
    private double progressPercentage;

    private UUID latestJobId;
    private String latestFilename;
    private JobStatus latestJobStatus;
    private String message;
}
