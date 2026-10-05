package com.imagemetadata.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class VisionAnalysisDto {
    @Builder.Default
    private List<String> subjects = new ArrayList<>();

    @Builder.Default
    private List<String> objects = new ArrayList<>();

    private String environment;
    private String setting;

    @Builder.Default
    private List<String> activities = new ArrayList<>();

    private String visualStyle;
    private String composition;

    @Builder.Default
    private List<String> colors = new ArrayList<>();

    private String lighting;
    private String mood;

    @Builder.Default
    private List<String> concepts = new ArrayList<>();

    @Builder.Default
    private List<Object> possiblePeople = new ArrayList<>();

    @Builder.Default
    private List<String> possibleBrands = new ArrayList<>();

    @Builder.Default
    private List<String> possibleCopyrightedCharacters = new ArrayList<>();

    @Builder.Default
    private List<String> visibleText = new ArrayList<>();
}
