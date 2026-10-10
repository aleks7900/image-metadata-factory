package com.imagemetadata.service.validation;

import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.model.AdobeStockCategory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
public class CategoryValidationService {

    public record CategoryValidationResult(
            int resolvedCategoryId,
            String resolvedCategoryName,
            double confidence,
            String reason,
            boolean isValid,
            boolean isContradictionDetected,
            boolean isReviewRequired,
            Integer originalCategoryId,
            String originalCategoryName,
            String contradictionDetails
    ) {}

    /**
     * Validates and resolves the Adobe Stock category.
     * Enforces the official 1-21 category range, verifies category ID/name consistency,
     * detects severe contradictions with image vision analysis, and performs controlled reclassification.
     */
    public CategoryValidationResult validateAndResolve(
            Integer candidateCategoryId,
            String candidateCategoryName,
            Double candidateConfidence,
            String candidateReason,
            VisionAnalysisDto vision,
            String title,
            List<String> keywords
    ) {
        log.debug("Validating category: id={}, name={}, confidence={}, title='{}'",
                candidateCategoryId, candidateCategoryName, candidateConfidence, title);

        // 1. Check for missing or out-of-range category ID
        if (candidateCategoryId == null || candidateCategoryId < 1 || candidateCategoryId > 21) {
            log.warn("Invalid or missing Adobe Stock category ID: {}. Triggering inference.", candidateCategoryId);
            AdobeStockCategory inferred = AdobeStockCategory.inferCategory(
                    title,
                    vision != null ? vision.getEnvironment() : null,
                    vision != null ? vision.getSubjects() : null,
                    keywords
            );
            return new CategoryValidationResult(
                    inferred.getId(),
                    inferred.getName(),
                    0.85,
                    "Inferred from image subjects and visual context (candidate ID was invalid/missing).",
                    false,
                    false,
                    false,
                    candidateCategoryId,
                    candidateCategoryName,
                    "Category ID was missing or outside official 1-21 range: " + candidateCategoryId
            );
        }

        AdobeStockCategory officialCat = AdobeStockCategory.fromId(candidateCategoryId);
        String expectedName = officialCat != null ? officialCat.getName() : "Unknown";

        // 2. Verify Category ID and Name Match
        boolean nameMismatch = false;
        if (candidateCategoryName != null && !candidateCategoryName.isBlank()) {
            AdobeStockCategory nameMatch = AdobeStockCategory.fromName(candidateCategoryName);
            if (nameMatch != null && nameMatch.getId() != candidateCategoryId) {
                log.warn("Category ID/Name mismatch: ID {} ({}) vs Name '{}' (maps to ID {}).",
                        candidateCategoryId, expectedName, candidateCategoryName, nameMatch.getId());
                nameMismatch = true;

                // If candidate name matches visual analysis better than candidate ID, resolve to name's category
                if (isCategorySupportedByVision(nameMatch, vision, title, keywords)) {
                    log.info("Resolving mismatch in favor of category name '{}' (ID {}) based on vision analysis.",
                            nameMatch.getName(), nameMatch.getId());
                    return new CategoryValidationResult(
                            nameMatch.getId(),
                            nameMatch.getName(),
                            candidateConfidence != null ? candidateConfidence : 0.88,
                            "Resolved mismatch between ID (" + candidateCategoryId + ") and Name (" + candidateCategoryName + ") using visual context.",
                            true,
                            false,
                            false,
                            candidateCategoryId,
                            candidateCategoryName,
                            "Mismatch: ID=" + candidateCategoryId + " vs Name=" + candidateCategoryName
                    );
                }
            }
        }

        // 3. Contradiction Detection
        ContradictionCheck contradiction = detectContradiction(candidateCategoryId, expectedName, vision, title, keywords);
        if (contradiction.isContradiction()) {
            log.warn("Category contradiction detected: {}", contradiction.details());

            // Controlled reclassification
            AdobeStockCategory reclassified = AdobeStockCategory.inferCategory(
                    title,
                    vision != null ? vision.getEnvironment() : null,
                    vision != null ? vision.getSubjects() : null,
                    keywords
            );

            log.info("Reclassified contradictory category from {} ({}) to {} ({})",
                    candidateCategoryId, expectedName, reclassified.getId(), reclassified.getName());

            return new CategoryValidationResult(
                    reclassified.getId(),
                    reclassified.getName(),
                    0.92,
                    "Reclassified: " + contradiction.details(),
                    false,
                    true,
                    true, // Flag for manual review due to contradiction
                    candidateCategoryId,
                    candidateCategoryName,
                    contradiction.details()
            );
        }

        // 4. Low-confidence flagging
        double finalConfidence = candidateConfidence != null ? candidateConfidence : 0.90;
        boolean reviewRequired = finalConfidence < 0.60 || nameMismatch;
        String finalReason = (candidateReason != null && !candidateReason.isBlank())
                ? candidateReason
                : "Classified as " + expectedName + " based on primary visual subjects.";

        return new CategoryValidationResult(
                officialCat.getId(),
                expectedName,
                finalConfidence,
                finalReason,
                true,
                false,
                reviewRequired,
                candidateCategoryId,
                candidateCategoryName,
                null
        );
    }

    private record ContradictionCheck(boolean isContradiction, String details) {}

    private ContradictionCheck detectContradiction(
            int categoryId,
            String categoryName,
            VisionAnalysisDto vision,
            String title,
            List<String> keywords
    ) {
        String subjectsStr = vision != null && vision.getSubjects() != null
                ? String.join(" ", vision.getSubjects()).toLowerCase(Locale.ROOT) : "";
        String visualStyle = vision != null && vision.getVisualStyle() != null
                ? vision.getVisualStyle().toLowerCase(Locale.ROOT) : "";
        String composition = vision != null && vision.getComposition() != null
                ? vision.getComposition().toLowerCase(Locale.ROOT) : "";
        String titleStr = title != null ? title.toLowerCase(Locale.ROOT) : "";
        String keywordsStr = keywords != null ? String.join(" ", keywords).toLowerCase(Locale.ROOT) : "";

        // Check A: Prominent Portrait / Human Beauty subject but category is Transport, Food, Architecture, Graphic Resources
        boolean isProminentHumanPortrait = isHumanPortraitSubject(subjectsStr, visualStyle, composition, titleStr, vision);
        if (isProminentHumanPortrait) {
            if (categoryId == AdobeStockCategory.TRANSPORT.getId()) {
                return new ContradictionCheck(true,
                        "Image is a close-up human beauty/portrait, but assigned category was 20 - Transport.");
            }
            if (categoryId == AdobeStockCategory.FOOD.getId()) {
                return new ContradictionCheck(true,
                        "Image is a human beauty/portrait, but assigned category was 7 - Food.");
            }
            if (categoryId == AdobeStockCategory.BUILDINGS_AND_ARCHITECTURE.getId()) {
                return new ContradictionCheck(true,
                        "Image is a human beauty/portrait, but assigned category was 2 - Buildings and Architecture.");
            }
        }

        // Check B: Dominant vehicle subject but category is People, Food, or Plants
        boolean isDominantVehicle = containsAnyWord(subjectsStr, "car", "automobile", "sports car", "electric car", "truck", "airplane", "aircraft", "train", "ship", "boat", "subway")
                || (containsAnyWord(titleStr, "car", "automobile", "sports car", "truck", "airplane", "train") && !isProminentHumanPortrait);
        if (isDominantVehicle) {
            if (categoryId == AdobeStockCategory.PEOPLE.getId()) {
                return new ContradictionCheck(true,
                        "Dominant subject is a vehicle/transportation, but assigned category was 13 - People.");
            }
            if (categoryId == AdobeStockCategory.FOOD.getId()) {
                return new ContradictionCheck(true,
                        "Dominant subject is a vehicle/transportation, but assigned category was 7 - Food.");
            }
        }

        // Check C: Dominant food/dish subject but category is Transport or People
        boolean isDominantFood = containsAnyWord(subjectsStr, "food", "burger", "pizza", "meal", "culinary dish", "dessert", "cake", "salad", "pasta", "recipe")
                || containsAnyWord(titleStr, "gourmet", "burger", "pizza", "culinary platter", "artisan dish");
        if (isDominantFood) {
            if (categoryId == AdobeStockCategory.TRANSPORT.getId()) {
                return new ContradictionCheck(true,
                        "Dominant subject is culinary food/dish, but assigned category was 20 - Transport.");
            }
        }

        // Check D: Dominant wildlife / animal subject but category is Buildings & Architecture or Transport
        boolean isDominantAnimal = containsAnyWord(subjectsStr, "wildlife", "bear", "lion", "tiger", "elephant", "wolf", "deer", "eagle", "dog", "cat")
                || containsAnyWord(titleStr, "wild bear", "wildlife", "grizzly bear");
        if (isDominantAnimal) {
            if (categoryId == AdobeStockCategory.BUILDINGS_AND_ARCHITECTURE.getId()) {
                return new ContradictionCheck(true,
                        "Dominant subject is wildlife animal, but assigned category was 2 - Buildings and Architecture.");
            }
            if (categoryId == AdobeStockCategory.TRANSPORT.getId()) {
                return new ContradictionCheck(true,
                        "Dominant subject is wildlife animal, but assigned category was 20 - Transport.");
            }
        }

        return new ContradictionCheck(false, null);
    }

    private boolean isHumanPortraitSubject(
            String subjects,
            String visualStyle,
            String composition,
            String title,
            VisionAnalysisDto vision
    ) {
        boolean styleIsPortrait = visualStyle.contains("portrait") || visualStyle.contains("beauty");
        boolean compositionIsPortrait = composition.contains("close-up") || composition.contains("portrait") || composition.contains("headshot");
        boolean subjectsHasPortrait = containsAnyWord(subjects, "portrait", "beauty portrait", "freckled", "redhead woman", "woman face", "face", "headshot");
        boolean titleHasPortrait = containsAnyWord(title, "beauty portrait", "freckled", "close-up portrait", "beauty portrait of", "redhead woman");

        boolean hasRecognizablePerson = false;
        if (vision != null && vision.getPossiblePeople() != null && !vision.getPossiblePeople().isEmpty()) {
            hasRecognizablePerson = true;
        }

        return (styleIsPortrait || compositionIsPortrait || titleHasPortrait || subjectsHasPortrait) && hasRecognizablePerson;
    }

    private boolean isCategorySupportedByVision(
            AdobeStockCategory category,
            VisionAnalysisDto vision,
            String title,
            List<String> keywords
    ) {
        String subjectsStr = vision != null && vision.getSubjects() != null
                ? String.join(" ", vision.getSubjects()).toLowerCase(Locale.ROOT) : "";
        String titleStr = title != null ? title.toLowerCase(Locale.ROOT) : "";

        return switch (category) {
            case PEOPLE -> containsAnyWord(subjectsStr, "portrait", "woman", "man", "person", "face", "model")
                    || containsAnyWord(titleStr, "portrait", "woman", "man", "person", "face");
            case TRANSPORT -> containsAnyWord(subjectsStr, "car", "automobile", "vehicle", "airplane", "train", "boat", "ship")
                    || containsAnyWord(titleStr, "car", "automobile", "vehicle", "airplane", "train");
            case FOOD -> containsAnyWord(subjectsStr, "food", "meal", "dish", "burger", "pizza", "culinary")
                    || containsAnyWord(titleStr, "food", "meal", "dish", "burger");
            case BUILDINGS_AND_ARCHITECTURE -> containsAnyWord(subjectsStr, "skyscraper", "building", "architecture", "facade")
                    || containsAnyWord(titleStr, "skyscraper", "building", "architecture");
            case ANIMALS -> containsAnyWord(subjectsStr, "animal", "wildlife", "bear", "dog", "cat", "bird")
                    || containsAnyWord(titleStr, "animal", "wildlife", "bear");
            case LANDSCAPES -> containsAnyWord(subjectsStr, "mountain", "lake", "ocean", "landscape", "river")
                    || containsAnyWord(titleStr, "mountain", "lake", "landscape");
            default -> false;
        };
    }

    private static boolean containsAnyWord(String text, String... words) {
        if (text == null || text.isBlank()) return false;
        for (String w : words) {
            if (w == null || w.isBlank()) continue;
            Pattern p = Pattern.compile("\\b" + Pattern.quote(w.toLowerCase(Locale.ROOT)) + "(s|es)?\\b", Pattern.CASE_INSENSITIVE);
            if (p.matcher(text).find()) {
                return true;
            }
        }
        return false;
    }
}
