package com.imagemetadata.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CsvValidationResult {
    private boolean valid;
    private int exportableImagesCount;
    private int totalImagesCount;
    private String policy;
    private String format;

    @Builder.Default
    private List<String> errors = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    @Builder.Default
    private List<Map<String, String>> previewRows = new ArrayList<>();
}
