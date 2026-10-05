package com.imagemetadata;

import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.service.validation.MetadataQualityValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MetadataQualityValidatorTest {

    private MetadataQualityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new MetadataQualityValidator(30, 45, 100, 250, 15, 150);
    }

    @Test
    @DisplayName("Valid metadata meeting all criteria should pass")
    void testValidMetadataPasses() {
        String title = "Futuristic Neon City Street at Night With Cyberpunk Architecture";
        String description = "Vibrant cyberpunk metropolis with towering skyscrapers and bright neon signs reflecting off wet asphalt pavements during a dramatic rainy night.";

        List<String> keywords = new ArrayList<>();
        for (int i = 1; i <= 35; i++) {
            keywords.add("keyword" + i);
        }

        MetadataQualityValidator.QualityValidationResult result = validator.validate(title, description, keywords, new VisionAnalysisDto());

        assertTrue(result.isValid());
        assertTrue(result.violations().isEmpty());
        assertEquals(35, result.sanitizedKeywords().size());
    }

    @Test
    @DisplayName("Keyword count below 30 should produce violation")
    void testKeywordCountTooLowFails() {
        String title = "Futuristic Neon City Street at Night With Cyberpunk Architecture";
        String description = "Vibrant cyberpunk metropolis with towering skyscrapers and bright neon signs reflecting off wet asphalt pavements during a dramatic rainy night.";

        List<String> keywords = List.of("city", "neon", "cyberpunk", "night");

        MetadataQualityValidator.QualityValidationResult result = validator.validate(title, description, keywords, new VisionAnalysisDto());

        assertFalse(result.isValid());
        assertTrue(result.violations().stream().anyMatch(v -> v.contains("Keyword count is below requirement")));
    }

    @Test
    @DisplayName("Short description should produce violation")
    void testShortDescriptionFails() {
        String title = "Futuristic Neon City Street at Night With Cyberpunk Architecture";
        String description = "Too short description."; // < 100 chars

        List<String> keywords = new ArrayList<>();
        for (int i = 1; i <= 35; i++) {
            keywords.add("keyword" + i);
        }

        MetadataQualityValidator.QualityValidationResult result = validator.validate(title, description, keywords, new VisionAnalysisDto());

        assertFalse(result.isValid());
        assertTrue(result.violations().stream().anyMatch(v -> v.contains("Description is too short")));
    }

    @Test
    @DisplayName("Duplicate keywords and singular/plural pairs should be deduplicated")
    void testDeduplicationAndStemming() {
        String title = "Futuristic Neon City Street at Night With Cyberpunk Architecture";
        String description = "Vibrant cyberpunk metropolis with towering skyscrapers and bright neon signs reflecting off wet asphalt pavements during a dramatic rainy night.";

        List<String> keywords = new ArrayList<>();
        keywords.add("mountain");
        keywords.add("mountains"); // plural duplicate of mountain
        keywords.add("Mountain");  // exact case duplicate
        keywords.add("lake");
        keywords.add("lakes");     // plural duplicate of lake

        for (int i = 1; i <= 35; i++) {
            keywords.add("concept" + i);
        }

        MetadataQualityValidator.QualityValidationResult result = validator.validate(title, description, keywords, new VisionAnalysisDto());

        assertFalse(result.sanitizedKeywords().contains("mountains"));
        assertFalse(result.sanitizedKeywords().contains("lakes"));
        assertTrue(result.sanitizedKeywords().contains("mountain"));
        assertTrue(result.sanitizedKeywords().contains("lake"));
    }
}
