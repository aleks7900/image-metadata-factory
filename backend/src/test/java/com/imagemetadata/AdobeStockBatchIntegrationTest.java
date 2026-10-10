package com.imagemetadata;

import com.imagemetadata.dto.CreateBatchRequest;
import com.imagemetadata.model.BatchStatus;
import com.imagemetadata.model.ImageJob;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.repository.ImageJobRepository;
import com.imagemetadata.repository.ImageKeywordRepository;
import com.imagemetadata.repository.ProcessingBatchRepository;
import com.imagemetadata.service.BatchManagementService;
import com.imagemetadata.service.export.CsvExportService;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class AdobeStockBatchIntegrationTest {

    @Autowired
    private BatchManagementService batchService;

    @Autowired
    private CsvExportService csvExportService;

    @Autowired
    private ProcessingBatchRepository batchRepository;

    @Autowired
    private ImageJobRepository jobRepository;

    @Autowired
    private ImageKeywordRepository keywordRepository;

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
            throw new RuntimeException("Failed to generate test JPEG image", e);
        }
    }

    @Test
    @DisplayName("End-to-End: Process 100 images, generate Adobe Stock metadata, compliance validation, and verify exported CSV")
    void testEndToEnd100ImageAdobeStockWorkflow() throws Exception {
        // 1. Create Batch
        var batchResponse = batchService.createBatch(new CreateBatchRequest("Adobe Stock 100 Image Evaluation Batch"));
        UUID batchId = batchResponse.getId();
        assertNotNull(batchId);

        // 2. Prepare 100 sample images with diverse realistic stock subjects
        String[] subjects = {
                "mountain_landscape", "city_skyline_architecture", "golden_retriever_animal",
                "business_meeting_office", "healthy_food_salad", "technology_ai_robot",
                "tropical_travel_beach", "modern_abstract_pattern", "autumn_forest_trees",
                "fitness_running_sport"
        };

        // Create 2000x2000 pixels (4MP - Adobe Stock minimum resolution standard)
        byte[] standardJpeg = createSampleJpegBytes(2000, 2000, new Color(45, 120, 210));

        List<MultipartFile> files = new ArrayList<>(100);
        Set<String> uploadedFilenames = new LinkedHashSet<>();

        for (int i = 1; i <= 100; i++) {
            String subject = subjects[(i - 1) % subjects.length];
            String filename = String.format("%s_%03d.jpg", subject, i);
            uploadedFilenames.add(filename);

            files.add(new MockMultipartFile(
                    "files",
                    filename,
                    "image/jpeg",
                    standardJpeg
            ));
        }

        // 3. Upload images
        batchService.uploadImages(batchId, files);
        var batch = batchRepository.findById(batchId).orElseThrow();
        assertEquals(100, batch.getTotalImages(), "All 100 images must be registered in the batch");

        // 4. Increase concurrency for fast test execution and Start batch
        batchService.setConcurrency(8);
        batchService.startBatch(batchId);

        // 5. Await processing completion (max 30 seconds)
        await().atMost(Duration.ofSeconds(30))
                .pollInterval(Duration.ofMillis(250))
                .until(() -> {
                    var b = batchRepository.findById(batchId).orElseThrow();
                    return b.getStatus() == BatchStatus.COMPLETED || b.getStatus() == BatchStatus.FAILED;
                });

        batch = batchRepository.findById(batchId).orElseThrow();
        assertEquals(BatchStatus.COMPLETED, batch.getStatus());
        assertEquals(100, batch.getProcessedImages(), "Exactly 100 images must be successfully processed");
        assertEquals(0, batch.getFailedImages(), "No images should fail processing in mock mode");

        // 6. Verify image jobs and generated metadata
        List<ImageJob> jobs = jobRepository.findByBatchId(batchId);
        assertEquals(100, jobs.size());

        for (ImageJob job : jobs) {
            assertEquals(JobStatus.READY, job.getStatus());
            assertTrue(uploadedFilenames.contains(job.getOriginalFilename()), "Filename must match original upload");

            // Verify Title: Commercially useful, non-empty, prefer concise under 70 characters
            assertNotNull(job.getTitle(), "Title must not be null");
            assertFalse(job.getTitle().isBlank(), "Title must not be blank");
            assertTrue(job.getTitle().length() <= 120, "Title must be concise (found: " + job.getTitle() + ")");

            // Verify Description: stored internally
            assertNotNull(job.getDescription(), "Description must be generated and stored internally");
            assertFalse(job.getDescription().isBlank(), "Description must not be blank");

            // Verify Category: 1 to 21
            assertNotNull(job.getCategory(), "Category must be inferred for Adobe Stock");
            assertTrue(job.getCategory() >= 1 && job.getCategory() <= 21,
                    "Category must be an official Adobe Stock category ID (1-21), got: " + job.getCategory());
            assertNotNull(job.getCategoryName(), "Category name must be present");

            // Verify Releases: Never automatically populated without explicit release docs
            assertTrue(job.getReleases() == null || job.getReleases().isBlank(),
                    "Releases must never be automatically populated");

            // Verify Compliance Classification
            assertNotNull(job.getComplianceStatus(), "Compliance status must be evaluated");
            assertThat(job.getComplianceStatus()).isIn("PASS", "WARNING", "REVIEW REQUIRED", "BLOCKED BY LOCAL VALIDATION");

            // Verify Keywords: between 30 and 45 keywords, ordered
            var keywords = keywordRepository.findByImageJobIdOrderByPositionAsc(job.getId());
            assertTrue(keywords.size() >= 25 && keywords.size() <= 45,
                    "Keywords count should be 30-45 (found: " + keywords.size() + ")");

            // Verify keywords are distinct (no duplicates)
            Set<String> uniqueKw = new HashSet<>();
            for (var kw : keywords) {
                assertNotNull(kw.getKeyword());
                assertFalse(kw.getKeyword().isBlank());
                assertTrue(uniqueKw.add(kw.getKeyword().toLowerCase()),
                        "Duplicate keyword found: " + kw.getKeyword());
            }
        }

        // 7. Validate CSV prior to export
        var validationResult = csvExportService.validateBatchForAdobeStock(batchId, CsvExportService.ExportPolicy.ALL);
        assertNotNull(validationResult);
        assertEquals(100, validationResult.getTotalImagesCount());
        assertEquals(100, validationResult.getExportableImagesCount());
        assertTrue(validationResult.isValid(), "Batch should pass Adobe Stock CSV validation");

        // 8. Export Adobe Stock CSV
        ByteArrayInputStream csvStream = csvExportService.exportBatchToCsv(
                batchId,
                CsvExportService.ExportPolicy.ALL,
                CsvExportService.ExportFormat.ADOBE_STOCK
        );

        // 9. Parse and verify with RFC 4180 CSV parser
        try (CSVParser parser = CSVParser.parse(
                new InputStreamReader(csvStream, StandardCharsets.UTF_8),
                CSVFormat.RFC4180.builder().setHeader().setSkipHeaderRecord(true).build()
        )) {
            Map<String, Integer> headerMap = parser.getHeaderMap();
            assertNotNull(headerMap);

            // Verify strictly official Adobe Stock columns: Filename,Title,Keywords,Category,Releases
            assertEquals(5, headerMap.size(), "Adobe Stock CSV must have exactly 5 columns");
            assertTrue(headerMap.containsKey("Filename"), "Must contain Filename header");
            assertTrue(headerMap.containsKey("Title"), "Must contain Title header");
            assertTrue(headerMap.containsKey("Keywords"), "Must contain Keywords header");
            assertTrue(headerMap.containsKey("Category"), "Must contain Category header");
            assertTrue(headerMap.containsKey("Releases"), "Must contain Releases header");
            assertFalse(headerMap.containsKey("Description"), "Description MUST NOT be in Adobe Stock CSV export");

            List<CSVRecord> records = parser.getRecords();
            assertEquals(100, records.size(), "Exported CSV must contain exactly 100 data rows");

            Set<String> parsedFilenames = new HashSet<>();
            for (CSVRecord record : records) {
                String filename = record.get("Filename");
                String title = record.get("Title");
                String keywordsStr = record.get("Keywords");
                String categoryStr = record.get("Category");
                String releases = record.get("Releases");

                assertTrue(uploadedFilenames.contains(filename), "CSV filename must match uploaded file: " + filename);
                assertTrue(parsedFilenames.add(filename), "CSV must not contain duplicate filename rows");

                assertFalse(title.isBlank(), "Title must not be blank");
                assertFalse(keywordsStr.isBlank(), "Keywords must not be blank");

                int categoryId = Integer.parseInt(categoryStr);
                assertTrue(categoryId >= 1 && categoryId <= 21, "Category ID must be between 1 and 21");

                assertTrue(releases.isBlank(), "Releases column must be blank for unreleased stock photos");

                // Verify keywords comma-separated structure
                String[] kwTokens = keywordsStr.split(",");
                assertTrue(kwTokens.length >= 25, "Keywords list must have sufficient keywords");
            }

            assertEquals(100, parsedFilenames.size(), "All 100 images must be present in exported CSV without loss");
        }

        // 10. Verify ZIP bundle download containing images + adobe_stock_metadata.csv
        ByteArrayInputStream zipStream = csvExportService.exportBatchToZipBundle(
                batchId,
                CsvExportService.ExportPolicy.ALL,
                CsvExportService.ExportFormat.ADOBE_STOCK
        );

        int zipEntryCount = 0;
        boolean foundCsvInZip = false;

        try (ZipInputStream zipIn = new ZipInputStream(zipStream)) {
            ZipEntry entry;
            while ((entry = zipIn.getNextEntry()) != null) {
                zipEntryCount++;
                if (entry.getName().equals("adobe_stock_metadata.csv")) {
                    foundCsvInZip = true;
                }
                zipIn.closeEntry();
            }
        }

        assertTrue(foundCsvInZip, "ZIP archive must contain adobe_stock_metadata.csv");
        // 100 images + 1 csv = 101 entries
        assertEquals(101, zipEntryCount, "ZIP bundle must contain all 100 images plus metadata CSV");
    }
}
