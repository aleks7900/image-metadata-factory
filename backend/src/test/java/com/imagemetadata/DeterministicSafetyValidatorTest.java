package com.imagemetadata;

import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.model.RiskStatus;
import com.imagemetadata.model.SafetyFindingType;
import com.imagemetadata.service.validation.DeterministicSafetyValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DeterministicSafetyValidatorTest {

    private DeterministicSafetyValidator validator;

    @BeforeEach
    void setUp() {
        validator = new DeterministicSafetyValidator();
    }

    @Test
    @DisplayName("Clean image with landscape metadata should be SAFE")
    void testCleanLandscapeIsSafe() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .environment("Mountain wilderness")
                .visibleText(List.of())
                .possiblePeople(List.of())
                .possibleBrands(List.of())
                .build();

        String title = "Majestic Snow Mountain Peaks at Sunrise";
        String description = "Pristine alpine lake reflecting tall granite mountain peaks under early morning golden hour light in autumn.";
        List<String> keywords = List.of("mountain", "lake", "reflection", "nature", "alpine", "sunrise");

        DeterministicSafetyValidator.SafetyEvaluationResult result = validator.evaluate(vision, title, description, keywords);

        assertEquals(RiskStatus.SAFE, result.riskStatus());
        assertTrue(result.findings().isEmpty());
        assertFalse(result.modelReleaseMayBeRequired());
    }

    @Test
    @DisplayName("Trademark in title or objects should trigger REJECT")
    void testTrademarkTriggersReject() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .visibleText(List.of("Just Do It"))
                .possibleBrands(List.of("Nike"))
                .build();

        String title = "Athlete Running in Nike Athletic Shoes";
        String description = "Close up of runner wearing branded sports shoes on running track.";
        List<String> keywords = List.of("running", "nike", "shoes", "athletic");

        DeterministicSafetyValidator.SafetyEvaluationResult result = validator.evaluate(vision, title, description, keywords);

        assertEquals(RiskStatus.REJECT, result.riskStatus());
        assertFalse(result.findings().isEmpty());
        assertTrue(result.findings().stream().anyMatch(f -> f.getType() == SafetyFindingType.TRADEMARK));
    }

    @Test
    @DisplayName("Recognizable people should trigger REVIEW_REQUIRED and model release flag")
    void testRecognizablePersonTriggersReviewRequired() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .possiblePeople(List.of(Map.of("description", "young smiling woman", "isRecognizable", true)))
                .build();

        String title = "Portrait of Confident Business Professional in Office";
        String description = "Smiling female entrepreneur standing by window in contemporary urban coworking office building.";
        List<String> keywords = List.of("portrait", "woman", "business", "professional", "office");

        DeterministicSafetyValidator.SafetyEvaluationResult result = validator.evaluate(vision, title, description, keywords);

        assertEquals(RiskStatus.REVIEW_REQUIRED, result.riskStatus());
        assertTrue(result.modelReleaseMayBeRequired());
        assertTrue(result.findings().stream().anyMatch(f -> f.getType() == SafetyFindingType.PERSON));
    }

    @Test
    @DisplayName("Copyrighted fictional character should trigger REJECT")
    void testCopyrightedCharacterTriggersReject() {
        VisionAnalysisDto vision = VisionAnalysisDto.builder()
                .possibleCopyrightedCharacters(List.of("Spider-Man"))
                .build();

        String title = "Cosplayer in Spider-Man Suit on Rooftop";
        String description = "Perched superhero cosplayer overlooking night skyline in metropolitan area.";
        List<String> keywords = List.of("hero", "costume", "spiderman", "marvel");

        DeterministicSafetyValidator.SafetyEvaluationResult result = validator.evaluate(vision, title, description, keywords);

        assertEquals(RiskStatus.REJECT, result.riskStatus());
        assertTrue(result.findings().stream().anyMatch(f -> f.getType() == SafetyFindingType.COPYRIGHT));
    }
}
