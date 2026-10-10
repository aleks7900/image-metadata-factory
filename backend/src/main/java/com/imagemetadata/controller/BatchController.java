package com.imagemetadata.controller;

import com.imagemetadata.dto.*;
import com.imagemetadata.model.JobStatus;
import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.model.RiskStatus;
import com.imagemetadata.service.BatchManagementService;
import com.imagemetadata.service.ImageJobManagementService;
import com.imagemetadata.service.export.CsvExportService;
import com.imagemetadata.service.pipeline.BatchProgressEmitter;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/batches")
public class BatchController {

    private final BatchManagementService batchService;
    private final ImageJobManagementService jobService;
    private final CsvExportService csvExportService;
    private final BatchProgressEmitter progressEmitter;

    public BatchController(
            BatchManagementService batchService,
            ImageJobManagementService jobService,
            CsvExportService csvExportService,
            BatchProgressEmitter progressEmitter
    ) {
        this.batchService = batchService;
        this.jobService = jobService;
        this.csvExportService = csvExportService;
        this.progressEmitter = progressEmitter;
    }

    @PostMapping
    public ResponseEntity<BatchResponse> createBatch(@Valid @RequestBody CreateBatchRequest request) {
        BatchResponse response = batchService.createBatch(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<BatchResponse>> listBatches(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(batchService.listBatches(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BatchResponse> getBatch(@PathVariable UUID id) {
        return ResponseEntity.ok(batchService.getBatchById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBatch(@PathVariable UUID id) {
        batchService.deleteBatch(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BatchResponse> uploadImages(
            @PathVariable UUID id,
            @RequestParam("files") List<MultipartFile> files
    ) {
        log.info("Received upload of {} files for batch {}", files.size(), id);
        return ResponseEntity.ok(batchService.uploadImages(id, files));
    }

    @GetMapping("/{id}/images")
    public ResponseEntity<Page<ImageJobResponse>> getBatchImages(
            @PathVariable UUID id,
            @RequestParam(required = false) JobStatus status,
            @RequestParam(required = false) RiskStatus riskStatus,
            @RequestParam(required = false) ReviewDecision reviewDecision,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 24, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(jobService.searchJobs(id, status, riskStatus, reviewDecision, search, pageable));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Map<String, String>> startBatch(@PathVariable UUID id) {
        batchService.startBatch(id);
        return ResponseEntity.ok(Map.of("message", "Batch processing started", "batchId", id.toString()));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<Map<String, String>> pauseBatch(@PathVariable UUID id) {
        batchService.pauseBatch(id);
        return ResponseEntity.ok(Map.of("message", "Batch processing paused", "batchId", id.toString()));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<Map<String, String>> resumeBatch(@PathVariable UUID id) {
        batchService.resumeBatch(id);
        return ResponseEntity.ok(Map.of("message", "Batch processing resumed", "batchId", id.toString()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, String>> cancelBatch(@PathVariable UUID id) {
        batchService.cancelBatch(id);
        return ResponseEntity.ok(Map.of("message", "Batch processing cancelled", "batchId", id.toString()));
    }

    @PostMapping("/{id}/bulk-retry")
    public ResponseEntity<Map<String, String>> bulkRetry(@PathVariable UUID id) {
        batchService.retryFailedJobs(id);
        return ResponseEntity.ok(Map.of("message", "Triggered retry for all failed jobs in batch", "batchId", id.toString()));
    }

    @PostMapping("/{id}/bulk-review")
    public ResponseEntity<Map<String, Object>> bulkReview(
            @PathVariable UUID id,
            @Valid @RequestBody BulkReviewRequest request
    ) {
        int updated = batchService.bulkReview(id, request);
        return ResponseEntity.ok(Map.of(
                "message", "Bulk review completed",
                "batchId", id.toString(),
                "updatedCount", updated,
                "decision", request.getDecision().name()
        ));
    }

    @PostMapping("/{id}/categories/audit")
    public ResponseEntity<BatchCategoryAuditResponse> auditBatchCategories(@PathVariable UUID id) {
        return ResponseEntity.ok(batchService.auditBatchCategories(id));
    }

    @PostMapping("/{id}/categories/reclassify")
    public ResponseEntity<BatchReclassifyResponse> reclassifyBatchCategories(
            @PathVariable UUID id,
            @RequestBody(required = false) ReclassifyBatchCategoriesRequest request
    ) {
        return ResponseEntity.ok(batchService.reclassifyBatchCategories(
                id,
                request != null ? request : ReclassifyBatchCategoriesRequest.builder().build()
        ));
    }

    @GetMapping("/{id}/events")
    public SseEmitter streamBatchEvents(@PathVariable UUID id) {
        return progressEmitter.registerEmitter(id);
    }

    @GetMapping("/{id}/cost-estimate")
    public ResponseEntity<CostEstimateResponse> getCostEstimate(@PathVariable UUID id) {
        return ResponseEntity.ok(batchService.getCostEstimate(id));
    }

    @GetMapping("/{id}/validate-csv")
    public ResponseEntity<CsvValidationResult> validateCsv(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "SAFE_AND_APPROVED") CsvExportService.ExportPolicy policy
    ) {
        return ResponseEntity.ok(csvExportService.validateBatchForAdobeStock(id, policy));
    }

    @GetMapping("/{id}/export.csv")
    public ResponseEntity<InputStreamResource> exportCsv(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "SAFE_AND_APPROVED") CsvExportService.ExportPolicy policy,
            @RequestParam(defaultValue = "ADOBE_STOCK") CsvExportService.ExportFormat format
    ) {
        ByteArrayInputStream csvStream = csvExportService.exportBatchToCsv(id, policy, format);
        String filename = "adobe-stock-batch-" + id + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(new InputStreamResource(csvStream));
    }

    @GetMapping("/{id}/download.zip")
    public ResponseEntity<InputStreamResource> downloadZipBundle(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "SAFE_AND_APPROVED") CsvExportService.ExportPolicy policy,
            @RequestParam(defaultValue = "ADOBE_STOCK") CsvExportService.ExportFormat format
    ) {
        ByteArrayInputStream zipStream = csvExportService.exportBatchToZipBundle(id, policy, format);
        String filename = "adobe-stock-submission-" + id + ".zip";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(new InputStreamResource(zipStream));
    }

    @GetMapping("/concurrency")
    public ResponseEntity<Map<String, Object>> getConcurrency() {
        return ResponseEntity.ok(Map.of("concurrency", batchService.getConcurrency()));
    }

    @PostMapping("/concurrency")
    public ResponseEntity<Map<String, Object>> setConcurrency(@RequestBody Map<String, Integer> payload) {
        Integer val = payload.get("concurrency");
        if (val == null || val < 1 || val > 50) {
            return ResponseEntity.badRequest().body(Map.of("error", "Concurrency must be between 1 and 50"));
        }
        batchService.setConcurrency(val);
        return ResponseEntity.ok(Map.of("concurrency", batchService.getConcurrency()));
    }
}

