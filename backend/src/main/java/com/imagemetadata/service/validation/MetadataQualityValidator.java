package com.imagemetadata.service.validation;

import com.imagemetadata.dto.VisionAnalysisDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;

@Service
public class MetadataQualityValidator {

    private final int minKeywords;
    private final int maxKeywords;
    private final int minDescLength;
    private final int maxDescLength;
    private final int minTitleLength;
    private final int maxTitleLength;

    public MetadataQualityValidator(
            @Value("${app.validation.min-keywords:30}") int minKeywords,
            @Value("${app.validation.max-keywords:45}") int maxKeywords,
            @Value("${app.validation.min-description-length:100}") int minDescLength,
            @Value("${app.validation.max-description-length:250}") int maxDescLength,
            @Value("${app.validation.min-title-length:15}") int minTitleLength,
            @Value("${app.validation.max-title-length:150}") int maxTitleLength
    ) {
        this.minKeywords = minKeywords;
        this.maxKeywords = maxKeywords;
        this.minDescLength = minDescLength;
        this.maxDescLength = maxDescLength;
        this.minTitleLength = minTitleLength;
        this.maxTitleLength = maxTitleLength;
    }

    public QualityValidationResult validate(
            String title,
            String description,
            List<String> rawKeywords,
            VisionAnalysisDto vision
    ) {
        List<String> violations = new ArrayList<>();

        // 1. Title Validation
        String sanitizedTitle = title != null ? title.trim() : "";
        if (!StringUtils.hasText(sanitizedTitle)) {
            violations.add("Title is missing or empty");
        } else if (sanitizedTitle.length() < minTitleLength) {
            violations.add("Title is too short (" + sanitizedTitle.length() + " chars, minimum is " + minTitleLength + ")");
        } else if (sanitizedTitle.length() > maxTitleLength) {
            violations.add("Title exceeds length limit (" + sanitizedTitle.length() + " chars, maximum is " + maxTitleLength + ")");
        }

        // 2. Description Validation
        String sanitizedDescription = description != null ? description.trim() : "";
        if (!StringUtils.hasText(sanitizedDescription)) {
            violations.add("Description is missing or empty");
        } else if (sanitizedDescription.length() < minDescLength) {
            violations.add("Description is too short (" + sanitizedDescription.length() + " chars, target is " + minDescLength + "-" + maxDescLength + ")");
        } else if (sanitizedDescription.length() > maxDescLength) {
            violations.add("Description exceeds length limit (" + sanitizedDescription.length() + " chars, target is " + minDescLength + "-" + maxDescLength + ")");
        }

        // 3. Keywords Normalization & Deduplication
        List<String> sanitizedKeywords = new ArrayList<>();
        Set<String> seenNormalized = new HashSet<>();
        Set<String> rootStems = new HashSet<>();

        if (rawKeywords != null) {
            for (String kw : rawKeywords) {
                if (kw == null) continue;
                String cleaned = kw.trim().toLowerCase().replaceAll("[^a-z0-9\\s\\-]", "");
                if (cleaned.length() < 2) continue;

                // Check exact duplicate
                if (seenNormalized.contains(cleaned)) {
                    continue;
                }

                // Check singular / plural duplication (e.g. "mountain" vs "mountains", "lake" vs "lakes")
                Set<String> candidateStems = getCandidateStems(cleaned);
                boolean isDuplicateStem = false;
                for (String stem : candidateStems) {
                    if (rootStems.contains(stem)) {
                        isDuplicateStem = true;
                        break;
                    }
                }
                if (isDuplicateStem) {
                    continue;
                }

                seenNormalized.add(cleaned);
                rootStems.addAll(candidateStems);
                sanitizedKeywords.add(cleaned);
            }
        }

        // 4. Keyword Count Verification
        if (sanitizedKeywords.size() < minKeywords) {
            violations.add("Keyword count is below requirement (" + sanitizedKeywords.size() + " keywords, required " + minKeywords + "-" + maxKeywords + ")");
        } else if (sanitizedKeywords.size() > maxKeywords) {
            // Trim to max allowed
            sanitizedKeywords = sanitizedKeywords.subList(0, maxKeywords);
        }

        boolean isValid = violations.isEmpty();
        return new QualityValidationResult(isValid, violations, sanitizedTitle, sanitizedDescription, sanitizedKeywords);
    }

    private Set<String> getCandidateStems(String word) {
        Set<String> stems = new HashSet<>();
        stems.add(word);
        if (word.endsWith("ies") && word.length() > 4) {
            stems.add(word.substring(0, word.length() - 3) + "y");
        }
        if (word.endsWith("es") && word.length() > 3) {
            stems.add(word.substring(0, word.length() - 2));
            stems.add(word.substring(0, word.length() - 1)); // handles lakes -> lake
        }
        if (word.endsWith("s") && !word.endsWith("ss") && word.length() > 3) {
            stems.add(word.substring(0, word.length() - 1));
        }
        return stems;
    }

    public record QualityValidationResult(
            boolean isValid,
            List<String> violations,
            String sanitizedTitle,
            String sanitizedDescription,
            List<String> sanitizedKeywords
    ) {}
}
