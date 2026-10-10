package com.imagemetadata.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "image_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageJob {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "batch_id", nullable = false)
    private UUID batchId;

    @Column(name = "original_filename", nullable = false, length = 500)
    private String originalFilename;

    @Column(name = "storage_path", nullable = false, length = 1000)
    private String storagePath;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private JobStatus status;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_status", nullable = false, length = 50)
    @Builder.Default
    private RiskStatus riskStatus = RiskStatus.SAFE;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_decision", nullable = false, length = 50)
    @Builder.Default
    private ReviewDecision reviewDecision = ReviewDecision.PENDING;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "processing_duration_ms")
    @Builder.Default
    private long processingDurationMs = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "category")
    private Integer category;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Column(name = "releases", length = 500)
    private String releases;

    @Column(name = "is_ai_generated", nullable = false)
    @Builder.Default
    private boolean isAiGenerated = false;

    @Column(name = "image_width")
    private Integer imageWidth;

    @Column(name = "image_height")
    private Integer imageHeight;

    @Column(name = "compliance_status", length = 50)
    @Builder.Default
    private String complianceStatus = "PASS";

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "image_job_id")
    @OrderBy("position ASC")
    @Builder.Default
    private List<ImageKeyword> keywords = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "image_job_id")
    @Builder.Default
    private List<SafetyFinding> safetyFindings = new ArrayList<>();


    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = JobStatus.UPLOADED;
        }
        if (riskStatus == null) {
            riskStatus = RiskStatus.SAFE;
        }
        if (reviewDecision == null) {
            reviewDecision = ReviewDecision.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}
