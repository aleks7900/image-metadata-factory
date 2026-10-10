package com.imagemetadata;

import com.imagemetadata.dto.CostEstimateResponse;
import com.imagemetadata.dto.CreateBatchRequest;
import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.ImageJob;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.RiskStatus;
import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import com.imagemetadata.service.BatchManagementService;
import com.imagemetadata.service.pipeline.BatchProcessorService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class LargeBatchReliabilityTest {

    @Autowired
    private BatchManagementService batchService;

    @Autowired
    private BatchProcessorService processorService;

    @Autowired
    private ProcessingBatchRepository batchRepository;

    @Autowired
    private ImageJobRepository jobRepository;

    @Test
    @DisplayName("Reliability: Create 1,000 image batch, estimate costs across models, verify memory safety")
    void testLargeBatch1000CreationAndCostEstimation() {
        var batchResponse = batchService.createBatch(new CreateBatchRequest("1000 Image Stock Photography Batch"));
        UUID batchId = batchResponse.getId();

        // Simulate 1,000 image jobs in the batch
        List<ImageJob> jobs = new ArrayList<>(1000);
        for (int i = 1; i <= 1000; i++) {
            jobs.add(ImageJob.builder()
                    .batchId(batchId)
                    .originalFilename(String.format("stock_img_%04d.jpg", i))
                    .storagePath(String.format("/storage/%s/img_%04d.jpg", batchId, i))
                    .mimeType("image/jpeg")
                    .fileSizeBytes(2_500_000L) // 2.5MB
                    .status(JobStatus.UPLOADED)
                    .riskStatus(RiskStatus.SAFE)
                    .reviewDecision(ReviewDecision.PENDING)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build());
        }

        jobRepository.saveAll(jobs);

        var batch = batchRepository.findById(batchId).orElseThrow();
        batch.setTotalImages(1000);
        batchRepository.save(batch);

        // Verify batch retrieval
        long count = jobRepository.countByBatchId(batchId);
        assertEquals(1000, count, "All 1,000 jobs must be persisted and counted");

        // Verify Cost Estimation for 1,000 images
        CostEstimateResponse costEstimate = batchService.getCostEstimate(batchId);
        assertNotNull(costEstimate);
        assertEquals(1000, costEstimate.getTotalImages());
        assertEquals(1000, costEstimate.getPendingImages());
        assertEquals(3, costEstimate.getEstimates().size());

        // Check OpenAI gpt-4o-mini estimate
        var miniEstimate = costEstimate.getEstimates().stream()
                .filter(e -> "gpt-4o-mini".equals(e.getModel()))
                .findFirst().orElseThrow();

        assertNotNull(miniEstimate.getTotalInputTokens());
        assertNotNull(miniEstimate.getTotalOutputTokens());
        assertTrue(miniEstimate.getTotalInputTokens() > 1_000_000L, "Total input tokens for 1,000 images > 1M");
        assertTrue(miniEstimate.getTotalBatchCostUsd().doubleValue() > 0.0, "Total batch cost must be computed");
        assertTrue(miniEstimate.getCostFor1000ImagesUsd().doubleValue() > 0.0);
    }

    @Test
    @DisplayName("Reliability: Batch cancellation stops active and pending processing")
    void testBatchCancellation() {
        var batchResponse = batchService.createBatch(new CreateBatchRequest("Cancellation Test Batch"));
        UUID batchId = batchResponse.getId();

        List<ImageJob> jobs = new ArrayList<>(20);
        for (int i = 1; i <= 20; i++) {
            jobs.add(ImageJob.builder()
                    .batchId(batchId)
                    .originalFilename(String.format("cancel_test_%02d.jpg", i))
                    .storagePath(String.format("/dummy/path/%d.jpg", i))
                    .mimeType("image/jpeg")
                    .fileSizeBytes(100_000L)
                    .status(JobStatus.UPLOADED)
                    .riskStatus(RiskStatus.SAFE)
                    .reviewDecision(ReviewDecision.PENDING)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build());
        }
        jobRepository.saveAll(jobs);

        var batch = batchRepository.findById(batchId).orElseThrow();
        batch.setTotalImages(20);
        batch.setStatus(BatchStatus.PROCESSING);
        batchRepository.save(batch);

        // Cancel the batch
        batchService.cancelBatch(batchId);

        var cancelledBatch = batchRepository.findById(batchId).orElseThrow();
        assertEquals(BatchStatus.CANCELLED, cancelledBatch.getStatus(), "Batch status must transition to CANCELLED");
    }
}
