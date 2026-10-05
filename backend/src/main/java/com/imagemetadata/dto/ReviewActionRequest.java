package com.imagemetadata.dto;

import com.imagemetadata.model.ReviewDecision;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewActionRequest {

    @NotNull(message = "Review decision is required")
    private ReviewDecision decision;
}
