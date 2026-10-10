package com.imagemetadata.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMetadataRequest {

    @NotBlank(message = "Title cannot be blank")
    @Size(min = 5, max = 500, message = "Title must be between 5 and 500 characters")
    private String title;

    @NotBlank(message = "Description cannot be blank")
    @Size(min = 20, max = 2000, message = "Description must be between 20 and 2000 characters")
    private String description;

    @NotEmpty(message = "Keywords list cannot be empty")
    @Size(min = 1, max = 100, message = "Keywords list must contain between 1 and 100 items")
    private List<String> keywords;

    private Integer category;
    private String releases;
    private Boolean isAiGenerated;
}
