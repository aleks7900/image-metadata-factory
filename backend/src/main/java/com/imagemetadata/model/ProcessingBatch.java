package com.imagemetadata.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processing_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessingBatch {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private BatchStatus status;

    @Column(name = "total_images", nullable = false)
    @Builder.Default
    private int totalImages = 0;

    @Column(name = "processed_images", nullable = false)
    @Builder.Default
    private int processedImages = 0;

    @Column(name = "failed_images", nullable = false)
    @Builder.Default
    private int failedImages = 0;

    @Column(name = "safe_images", nullable = false)
    @Builder.Default
    private int safeImages = 0;

    @Column(name = "review_required_images", nullable = false)
    @Builder.Default
    private int reviewRequiredImages = 0;

    @Column(name = "rejected_images", nullable = false)
    @Builder.Default
    private int rejectedImages = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = BatchStatus.QUEUED;
        }
    }
}
