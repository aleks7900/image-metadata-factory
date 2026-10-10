package com.imagemetadata;

import com.imagemetadata.dto.CreateBatchRequest;
import com.imagemetadata.dto.ReclassifyBatchCategoriesRequest;
import com.imagemetadata.dto.UpdateMetadataRequest;
import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.ImageJob;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import com.imagemetadata.service.BatchManagementService;
import com.imagemetadata.service.ImageJobManagementService;
import com.imagemetadata.service.export.CsvExportService;
import com.imagemetadata.service.pipeline.ImagePipelineService;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class AdobeStockCategoryIntegrationTest {

    @Autowired
    private BatchManagementService batchService;

    @Autowired
    private ImageJobManagementService jobManagementService;

    @Autowired
    private ImagePipelineService pipelineService;

    @Autowired
    private CsvExportService csvExportService;

    @Autowired
    private ProcessingBatchRepository batchRepository;

    @Autowired
    private ImageJobRepository jobRepository;

    private static byte[] createSampleJpegBytes(int width, int height, Color color) {
        try {
            BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setColor(color);
            g.fillRect(0, 0, width, height);
            g.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate test image", e);
        }
    }

    @Test
    @DisplayName("End-to-end pipeline: 045-natural-freckled-beauty.png must be classified as 13 - People")
    void testNaturalFreckledBeautyPipelineIntegration() {
        var batchResponse = batchService.createBatch(CreateBatchRequest.builder()
                .name("Freckled Beauty Portrait Test")
                .build());
        UUID batchId = batchResponse.getId();

        byte[] imageBytes = createSampleJpegBytes(2400, 3000, new Color(220, 180, 140));
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "045-natural-freckled-beauty.png",
                "image/png",
                imageBytes
        );

        batchService.uploadImages(batchId, List.of(file));
        batchService.startBatch(batchId);

        await().atMost(Duration.ofSeconds(10))
                .pollInterval(Duration.ofMillis(200))
                .until(() -> {
                    var b = batchRepository.findById(batchId).orElseThrow();
                    return b.getStatus() == BatchStatus.COMPLETED;
                });

        List<ImageJob> jobs = jobRepository.findByBatchId(batchId);
        assertEquals(1, jobs.size());
        ImageJob job = jobs.get(0);

        assertEquals(JobStatus.READY, job.getStatus());
        assertEquals("045-natural-freckled-beauty.png", job.getOriginalFilename());

        // Category verification
        assertEquals(13, job.getCategory(), "Must be Adobe Stock category 13 (People), not 20 (Transport)");
        assertEquals("People", job.getCategoryName());
        assertNotNull(job.getCategoryConfidence());
        assertTrue(job.getCategoryConfidence() >= 0.90, "Confidence should be >= 0.90");
        assertNotNull(job.getCategoryReason());

        // Verify CSV Export output
        ByteArrayInputStream csvStream = csvExportService.exportBatchToCsv(batchId, CsvExportService.ExportPolicy.ALL, CsvExportService.ExportFormat.ADOBE_STOCK);
        try (CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build()
                .parse(new InputStreamReader(csvStream, StandardCharsets.UTF_8))) {
            List<CSVRecord> records = parser.getRecords();
            assertEquals(1, records.size());
            CSVRecord record = records.get(0);
            assertEquals("045-natural-freckled-beauty.png", record.get("Filename"));
            assertEquals("13", record.get("Category"), "CSV export must contain numeric category ID 13");
        } catch (Exception e) {
            fail("Failed to parse exported CSV: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("End-to-end pipeline: sports car image must be classified as 20 - Transport")
    void testCarPipelineIntegration() {
        var batchResponse = batchService.createBatch(CreateBatchRequest.builder()
                .name("Sports Car Test")
                .build());
        UUID batchId = batchResponse.getId();

        byte[] imageBytes = createSampleJpegBytes(2500, 1600, Color.RED);
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "modern_electric_sports_car_01.jpg",
                "image/jpeg",
                imageBytes
        );

        batchService.uploadImages(batchId, List.of(file));
        batchService.startBatch(batchId);

        await().atMost(Duration.ofSeconds(10))
                .pollInterval(Duration.ofMillis(200))
                .until(() -> {
                    var b = batchRepository.findById(batchId).orElseThrow();
                    return b.getStatus() == BatchStatus.COMPLETED;
                });

        List<ImageJob> jobs = jobRepository.findByBatchId(batchId);
        assertEquals(1, jobs.size());
        ImageJob job = jobs.get(0);

        assertEquals(20, job.getCategory(), "Must be Adobe Stock category 20 (Transport)");
        assertEquals("Transport", job.getCategoryName());
    }

    @Test
    @DisplayName("Manual category update sets categoryManuallyEdited and is preserved during regeneration")
    void testCategoryManualEditPreservationOnRegeneration() {
        var batchResponse = batchService.createBatch(CreateBatchRequest.builder()
                .name("Category Edit Preservation Test")
                .build());
        UUID batchId = batchResponse.getId();

        byte[] imageBytes = createSampleJpegBytes(2400, 2400, Color.BLUE);
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "portrait_manual_edit_test.jpg",
                "image/jpeg",
                imageBytes
        );

        batchService.uploadImages(batchId, List.of(file));
        batchService.startBatch(batchId);

        await().atMost(Duration.ofSeconds(10))
                .until(() -> batchRepository.findById(batchId).orElseThrow().getStatus() == BatchStatus.COMPLETED);

        ImageJob job = jobRepository.findByBatchId(batchId).get(0);
        assertEquals(13, job.getCategory());
        assertFalse(job.isCategoryManuallyEdited());

        // User manually changes category to 12 (Lifestyle)
        jobManagementService.updateMetadata(job.getId(), UpdateMetadataRequest.builder()
                .title(job.getTitle())
                .description(job.getDescription())
                .keywords(List.of("lifestyle", "wellness", "natural", "portrait"))
                .category(12) // Lifestyle
                .build());

        ImageJob updatedJob = jobRepository.findById(job.getId()).orElseThrow();
        assertEquals(12, updatedJob.getCategory());
        assertEquals("Lifestyle", updatedJob.getCategoryName());
        assertTrue(updatedJob.isCategoryManuallyEdited(), "Must be flagged as manually edited");

        // Trigger regeneration
        pipelineService.regenerateMetadata(job.getId());

        await().atMost(Duration.ofSeconds(10))
                .until(() -> jobRepository.findById(job.getId()).orElseThrow().getStatus() == JobStatus.READY);

        ImageJob regeneratedJob = jobRepository.findById(job.getId()).orElseThrow();
        assertEquals(12, regeneratedJob.getCategory(), "Manually edited category 12 must be preserved after regeneration");
        assertEquals("Lifestyle", regeneratedJob.getCategoryName());
        assertTrue(regeneratedJob.isCategoryManuallyEdited());
    }

    @Test
    @DisplayName("Batch audit identifies suspicious category assignments and reclassify fixes them safely")
    void testBatchAuditAndReclassification() {
        var batchResponse = batchService.createBatch(CreateBatchRequest.builder()
                .name("Batch Audit Test")
                .build());
        UUID batchId = batchResponse.getId();

        byte[] imageBytes = createSampleJpegBytes(2400, 2400, Color.PINK);
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "freckled_beauty_audit_test.jpg",
                "image/jpeg",
                imageBytes
        );

        batchService.uploadImages(batchId, List.of(file));
        batchService.startBatch(batchId);

        await().atMost(Duration.ofSeconds(10))
                .until(() -> batchRepository.findById(batchId).orElseThrow().getStatus() == BatchStatus.COMPLETED);

        ImageJob job = jobRepository.findByBatchId(batchId).get(0);

        // Simulate a legacy bug where the job had category 20 (Transport) saved without manual edit flag
        job.setCategory(20);
        job.setCategoryName("Transport");
        job.setCategoryManuallyEdited(false);
        job.setReviewDecision(ReviewDecision.PENDING);
        jobRepository.save(job);

        // Run Audit
        var auditResponse = batchService.auditBatchCategories(batchId);
        assertEquals(1, auditResponse.getTotalImages());
        assertEquals(1, auditResponse.getSuspiciousCount(), "The portrait with Transport category must be flagged as suspicious");
        assertEquals(1, auditResponse.getSuspiciousItems().size());

        var suspiciousItem = auditResponse.getSuspiciousItems().get(0);
        assertEquals(job.getId(), suspiciousItem.getImageJobId());
        assertEquals(20, suspiciousItem.getCurrentCategory());
        assertEquals(13, suspiciousItem.getSuggestedCategory(), "Suggested category must be 13 (People)");
        assertEquals("People", suspiciousItem.getSuggestedCategoryName());

        // Run Reclassification
        var reclassifyResponse = batchService.reclassifyBatchCategories(batchId, ReclassifyBatchCategoriesRequest.builder()
                .onlySuspicious(true)
                .includeApproved(false)
                .build());

        assertEquals(1, reclassifyResponse.getReclassifiedCount());

        ImageJob reclassifiedJob = jobRepository.findById(job.getId()).orElseThrow();
        assertEquals(13, reclassifiedJob.getCategory(), "Job must now be safely reclassified to 13 (People)");
        assertEquals("People", reclassifiedJob.getCategoryName());
    }
}
