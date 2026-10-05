package com.imagemetadata.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "image_keywords")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_job_id", nullable = false)
    private UUID imageJobId;

    @Column(name = "keyword", nullable = false, length = 150)
    private String keyword;

    @Column(name = "position", nullable = false)
    private int position;
}
