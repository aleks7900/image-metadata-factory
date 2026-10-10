package com.imagemetadata;

import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.model.AdobeStockCategory;
import com.imagemetadata.service.validation.CategoryValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AdobeStockCategoryValidationUnitTest {

    private CategoryValidationService validator;

    @BeforeEach
    void setUp() {
        validator = new CategoryValidationService();
    }

    @Test
    @DisplayName("Portrait of freckled redhead beauty must be classified as 13 - People, not 20 - Transport")
    void testNaturalFreckledBeautyClassifiedAsPeople() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("freckled redhead woman", "beauty portrait"))
                .objects(List.of("freckles", "red hair", "eyes"))
                .visualStyle("beauty portrait photography")
                .composition("close-up facial portrait with shallow depth of field")
                .possiblePeople(List.of(Map.of("description", "young woman with red hair and natural freckles", "isRecognizable", true)))
                .build();

        String title = "Close-Up Beauty Portrait of Freckled Redhead Woman";
        // Keywords intentionally include 'skincare' and 'carefree' which previously triggered false 'car' substring match
        List<String> keywords = List.of(
                "portrait", "woman", "beauty", "freckles", "redhead",
                "skincare", "natural beauty", "face", "close-up", "red hair",
                "carefree", "cosmetics", "radiant", "youthful", "headshot"
        );

        // Scenario 1: LLM correctly provided People (13)
        var result = validator.validateAndResolve(13, "People", 0.98, "Human portrait subject", vision, title, keywords);
        assertEquals(13, result.resolvedCategoryId());
        assertEquals("People", result.resolvedCategoryName());
        assertTrue(result.isValid());
        assertFalse(result.isContradictionDetected());

        // Scenario 2: Legacy buggy LLM or heuristic suggested 20 - Transport (regression test)
        var contradictionResult = validator.validateAndResolve(20, "Transport", 0.90, "Buggy classification", vision, title, keywords);
        assertEquals(13, contradictionResult.resolvedCategoryId(), "Must reclassify contradictory Transport to People");
        assertEquals("People", contradictionResult.resolvedCategoryName());
        assertTrue(contradictionResult.isContradictionDetected());
        assertTrue(contradictionResult.isReviewRequired());
        assertEquals(20, contradictionResult.originalCategoryId());
    }

    @Test
    @DisplayName("Automobile / Sports Car must be classified as 20 - Transport")
    void testCarClassifiedAsTransport() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("electric sports car", "coastal highway"))
                .objects(List.of("alloy wheels", "aerodynamic body", "headlights"))
                .visualStyle("dynamic automotive photography")
                .composition("low angle tracking shot with motion blur")
                .build();

        String title = "Sleek Electric Sports Car Driving on Scenic Highway";
        List<String> keywords = List.of("car", "automobile", "sports car", "electric vehicle", "highway", "transportation", "driving");

        var result = validator.validateAndResolve(20, "Transport", 0.99, "Automotive vehicle subject", vision, title, keywords);
        assertEquals(20, result.resolvedCategoryId());
        assertEquals("Transport", result.resolvedCategoryName());
        assertFalse(result.isContradictionDetected());
    }

    @Test
    @DisplayName("Contradiction: Dominant vehicle incorrectly tagged as People must be reclassified to 20 - Transport")
    void testCarContradictionReclassifiedToTransport() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("sports car", "highway"))
                .visualStyle("automotive photography")
                .build();

        String title = "Red Sports Car Racing on Asphalt Highway";
        List<String> keywords = List.of("car", "vehicle", "automobile", "driving", "speed");

        var result = validator.validateAndResolve(13, "People", 0.80, "Erroneous", vision, title, keywords);
        assertEquals(20, result.resolvedCategoryId());
        assertEquals("Transport", result.resolvedCategoryName());
        assertTrue(result.isContradictionDetected());
    }

    @Test
    @DisplayName("Landscape must be classified as 11 - Landscapes")
    void testLandscapeClassifiedAsLandscapes() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("snow-capped mountain range", "calm alpine lake"))
                .objects(List.of("granite peaks", "pine forest", "water reflections"))
                .visualStyle("panoramic landscape photography")
                .build();

        String title = "Dramatic Alpine Mountain Lake Reflection at Sunrise";
        List<String> keywords = List.of("mountains", "lake", "reflection", "sunrise", "landscape", "alpine", "nature");

        var result = validator.validateAndResolve(11, "Landscapes", 0.98, "Alpine landscape scenery", vision, title, keywords);
        assertEquals(11, result.resolvedCategoryId());
        assertEquals("Landscapes", result.resolvedCategoryName());
        assertFalse(result.isContradictionDetected());
    }

    @Test
    @DisplayName("Food photography must be classified as 7 - Food")
    void testFoodClassifiedAsFood() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("artisan culinary dishes", "fresh ingredients"))
                .objects(List.of("serving platter", "rustic table", "olive oil"))
                .visualStyle("gourmet food photography")
                .build();

        String title = "Artisan Gourmet Food Platter on Rustic Table";
        List<String> keywords = List.of("food", "gourmet", "meal", "delicious", "culinary", "restaurant", "fresh", "dinner");

        var result = validator.validateAndResolve(7, "Food", 0.97, "Gourmet culinary presentation", vision, title, keywords);
        assertEquals(7, result.resolvedCategoryId());
        assertEquals("Food", result.resolvedCategoryName());
        assertFalse(result.isContradictionDetected());
    }

    @Test
    @DisplayName("Architecture must be classified as 2 - Buildings and Architecture")
    void testArchitectureClassifiedAsBuildingsAndArchitecture() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("modern skyscraper", "geometric facade"))
                .objects(List.of("glass windows", "steel frames"))
                .visualStyle("minimalist architectural photography")
                .build();

        String title = "Modern Skyscraper Geometric Facade and Windows";
        List<String> keywords = List.of("architecture", "skyscraper", "building", "modern", "facade", "geometric", "glass");

        var result = validator.validateAndResolve(2, "Buildings and Architecture", 0.96, "Urban skyscraper structure", vision, title, keywords);
        assertEquals(2, result.resolvedCategoryId());
        assertEquals("Buildings and Architecture", result.resolvedCategoryName());
        assertFalse(result.isContradictionDetected());
    }

    @Test
    @DisplayName("Mismatch between ID and Name resolves to correct category supported by vision")
    void testIncorrectIdNameCombination() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("freckled woman", "portrait"))
                .visualStyle("portrait photography")
                .possiblePeople(List.of(Map.of("description", "woman", "isRecognizable", true)))
                .build();

        String title = "Natural Portrait of Smiling Woman";
        List<String> keywords = List.of("portrait", "woman", "face", "smile");

        // Model returned ID 20 (Transport) but Name "People"
        var result = validator.validateAndResolve(20, "People", 0.95, "Conflict test", vision, title, keywords);
        assertEquals(13, result.resolvedCategoryId(), "Should resolve in favor of People (13) matching the portrait");
        assertEquals("People", result.resolvedCategoryName());
    }

    @Test
    @DisplayName("Invalid category IDs (outside 1-21) are rejected and safely inferred")
    void testInvalidCategoryIds() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("brown bear", "mountain river"))
                .build();
        String title = "Wild Bear Foraging by River";
        List<String> keywords = List.of("bear", "wildlife", "animal", "nature");

        for (int invalidId : List.of(-1, 0, 22, 999)) {
            var result = validator.validateAndResolve(invalidId, "Invalid", 0.5, "Out of bounds", vision, title, keywords);
            assertFalse(result.isValid());
            assertEquals(1, result.resolvedCategoryId(), "Bear wildlife must be inferred as Animals (1)");
            assertEquals("Animals", result.resolvedCategoryName());
        }
    }

    @Test
    @DisplayName("Missing category values (null ID and Name) are safely inferred")
    void testMissingCategoryValues() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .subjects(List.of("modern skyscraper"))
                .build();
        String title = "Tall Modern Office Tower";
        List<String> keywords = List.of("skyscraper", "building", "architecture");

        var result = validator.validateAndResolve(null, null, null, null, vision, title, keywords);
        assertFalse(result.isValid());
        assertEquals(2, result.resolvedCategoryId());
        assertEquals("Buildings and Architecture", result.resolvedCategoryName());
    }

    @Test
    @DisplayName("Whole-word matching regression test: 'skincare' does not match 'car', 'teamwork' does not match 'tea'")
    void testWholeWordMatchingRegression() {
        // Skincare keyword alone must not trigger Transport (20)
        AdobeStockCategory cat = AdobeStockCategory.inferCategory(
                "Natural Skincare Routine for Women",
                "indoor bathroom",
                List.of("skincare products", "routine"),
                List.of("skincare", "skin care", "carefree", "cosmetics", "facial care")
        );
        assertNotEquals(AdobeStockCategory.TRANSPORT, cat, "'skincare' must never trigger Transport");
        assertEquals(AdobeStockCategory.LIFESTYLE, cat);

        // Teamwork keyword must not trigger Drinks (4)
        AdobeStockCategory businessCat = AdobeStockCategory.inferCategory(
                "Corporate Teamwork Strategy",
                "modern office",
                List.of("professionals", "teamwork"),
                List.of("teamwork", "office", "collaboration", "corporate", "steaming")
        );
        assertNotEquals(AdobeStockCategory.DRINKS, businessCat, "'teamwork' or 'steaming' must never trigger Drinks ('tea')");
        assertEquals(AdobeStockCategory.BUSINESS, businessCat);
    }
}
