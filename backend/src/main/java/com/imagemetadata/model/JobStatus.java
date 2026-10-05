package com.imagemetadata.model;

public enum JobStatus {
    UPLOADED,
    VISION_ANALYSIS,
    METADATA_GENERATION,
    SAFETY_VALIDATION,
    QUALITY_VALIDATION,
    READY,
    FAILED
}
