package com.imagemetadata.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclassifyBatchCategoriesRequest {
    /**
     * If true, only images flagged as suspicious during audit will be reclassified.
     * Defaults to true.
     */
    @Builder.Default
    private boolean onlySuspicious = true;

    /**
     * If true, allows reclassification of APPROVED assets.
     * Defaults to false to prevent accidental overwrite of approved metadata without explicit authorization.
     */
    @Builder.Default
    private boolean includeApproved = false;

    /**
     * Optional explicit list of image job IDs to selectively reclassify.
     */
    private List<UUID> imageJobIds;
}
