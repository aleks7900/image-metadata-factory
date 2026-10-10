package com.imagemetadata.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdobeStockCategoryDto {
    private int id;
    private String name;
    private String description;
}
