package com.imagemetadata.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "safety_findings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SafetyFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_job_id", nullable = false)
    private UUID imageJobId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private SafetyFindingType type;

    @Column(name = "value", nullable = false)
    private String value;

    @Column(name = "confidence", nullable = false)
    private double confidence;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
}
