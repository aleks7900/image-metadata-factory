package com.imagemetadata.dto;

import com.imagemetadata.model.ReviewDecision;
import com.imagemetadata.model.RiskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkReviewRequest {

    private RiskStatus riskStatus;

    @NotNull(message = "Review decision is required")
    private ReviewDecision decision;
}
