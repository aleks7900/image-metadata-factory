package com.imagemetadata.dto;

import com.imagemetadata.model.SafetyFindingType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SafetyFindingDto {
    private SafetyFindingType type;
    private String value;
    private double confidence;
    private String reason;
}
