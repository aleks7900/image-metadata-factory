package com.imagemetadata.controller;

import com.imagemetadata.dto.ImageJobResponse;
import com.imagemetadata.dto.ReviewActionRequest;
import com.imagemetadata.dto.UpdateMetadataRequest;
import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.service.ImageJobManagementService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/images")
public class ImageJobController {

    private final ImageJobManagementService jobService;

    public ImageJobController(ImageJobManagementService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ImageJobResponse> getImage(@PathVariable UUID id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewImage(@PathVariable UUID id) {
        Resource resource = jobService.loadImageResource(id);
        String mimeType = jobService.getJobMimeType(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType != null ? mimeType : "image/jpeg"))
                .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                .body(resource);
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<Map<String, String>> retryJob(@PathVariable UUID id) {
        jobService.retryJob(id);
        return ResponseEntity.ok(Map.of("message", "Retry triggered for image", "imageId", id.toString()));
    }

    @PostMapping("/{id}/regenerate")
    public ResponseEntity<Map<String, String>> regenerateMetadata(@PathVariable UUID id) {
        jobService.regenerateMetadata(id);
        return ResponseEntity.ok(Map.of("message", "Regeneration triggered for image", "imageId", id.toString()));
    }

    @PatchMapping("/{id}/metadata")
    public ResponseEntity<ImageJobResponse> updateMetadata(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMetadataRequest request
    ) {
        return ResponseEntity.ok(jobService.updateMetadata(id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ImageJobResponse> approveImage(@PathVariable UUID id) {
        return ResponseEntity.ok(jobService.reviewJob(id, ReviewDecision.APPROVED));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ImageJobResponse> rejectImage(@PathVariable UUID id) {
        return ResponseEntity.ok(jobService.reviewJob(id, ReviewDecision.REJECTED));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<ImageJobResponse> reviewImage(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewActionRequest request
    ) {
        return ResponseEntity.ok(jobService.reviewJob(id, request.getDecision()));
    }
}
