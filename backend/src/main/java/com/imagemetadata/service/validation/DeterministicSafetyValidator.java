package com.imagemetadata.service.validation;

import com.imagemetadata.dto.SafetyFindingDto;
import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.model.RiskStatus;
import com.imagemetadata.model.SafetyFindingType;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class DeterministicSafetyValidator {

    private static final Map<String, String> KNOWN_TRADEMARKS = Map.ofEntries(
            Map.entry("nike", "Nike (Registered footwear/apparel trademark)"),
            Map.entry("adidas", "Adidas (Registered sportswear trademark)"),
            Map.entry("apple", "Apple (Registered consumer electronics trademark)"),
            Map.entry("coca-cola", "Coca-Cola (Registered beverage trademark)"),
            Map.entry("coke", "Coca-Cola Company trademark"),
            Map.entry("pepsi", "PepsiCo registered trademark"),
            Map.entry("tesla", "Tesla Motors registered trademark"),
            Map.entry("mcdonald", "McDonald's Corporation registered trademark"),
            Map.entry("starbucks", "Starbucks Coffee Company trademark"),
            Map.entry("gucci", "Gucci luxury fashion trademark"),
            Map.entry("rolex", "Rolex luxury watchmaker trademark"),
            Map.entry("louis vuitton", "Louis Vuitton luxury goods trademark"),
            Map.entry("bmw", "Bayerische Motoren Werke trademark"),
            Map.entry("mercedes", "Mercedes-Benz automotive trademark"),
            Map.entry("porsche", "Porsche automotive trademark"),
            Map.entry("sony", "Sony Corporation trademark"),
            Map.entry("samsung", "Samsung Electronics trademark"),
            Map.entry("google", "Google LLC registered trademark"),
            Map.entry("microsoft", "Microsoft Corporation trademark"),
            Map.entry("playstation", "Sony Interactive Entertainment trademark"),
            Map.entry("xbox", "Microsoft Corporation trademark")
    );

    private static final Map<String, String> KNOWN_COPYRIGHTS = Map.ofEntries(
            Map.entry("mickey mouse", "Disney copyrighted character"),
            Map.entry("spider-man", "Marvel / Disney copyrighted superhero"),
            Map.entry("spiderman", "Marvel / Disney copyrighted superhero"),
            Map.entry("batman", "DC Comics / Warner Bros copyrighted superhero"),
            Map.entry("superman", "DC Comics / Warner Bros copyrighted superhero"),
            Map.entry("iron man", "Marvel / Disney copyrighted superhero"),
            Map.entry("star wars", "Lucasfilm / Disney copyrighted franchise"),
            Map.entry("darth vader", "Lucasfilm / Disney copyrighted character"),
            Map.entry("yoda", "Lucasfilm / Disney copyrighted character"),
            Map.entry("pokémon", "Nintendo / The Pokemon Company copyrighted franchise"),
            Map.entry("pokemon", "Nintendo / The Pokemon Company copyrighted franchise"),
            Map.entry("pikachu", "Nintendo / The Pokemon Company copyrighted character"),
            Map.entry("mario", "Nintendo copyrighted character"),
            Map.entry("harry potter", "Warner Bros / J.K. Rowling copyrighted franchise"),
            Map.entry("lego", "The LEGO Group trademarked and copyrighted toy designs"),
            Map.entry("barbie", "Mattel copyrighted character and trademark")
    );

    private static final Set<String> FORBIDDEN_METADATA_WORDS = Set.of(
            "celebrity", "nsfw", "nude", "hate", "violence", "counterfeit", "replica"
    );

    public SafetyEvaluationResult evaluate(
            VisionAnalysisDto vision,
            String title,
            String description,
            List<String> keywords
    ) {
        List<SafetyFindingDto> findings = new ArrayList<>();
        RiskStatus computedRisk = RiskStatus.SAFE;
        StringBuilder reasoning = new StringBuilder();

        // 1. Text corpus to check
        String combinedText = String.join(" ",
                title != null ? title.toLowerCase() : "",
                description != null ? description.toLowerCase() : "",
                keywords != null ? String.join(" ", keywords).toLowerCase() : ""
        );

        if (vision != null) {
            if (vision.getVisibleText() != null) {
                combinedText += " " + String.join(" ", vision.getVisibleText()).toLowerCase();
            }
            if (vision.getPossibleBrands() != null) {
                combinedText += " " + String.join(" ", vision.getPossibleBrands()).toLowerCase();
            }
            if (vision.getPossibleCopyrightedCharacters() != null) {
                combinedText += " " + String.join(" ", vision.getPossibleCopyrightedCharacters()).toLowerCase();
            }
        }

        // 2. Deterministic Trademark Checks
        for (Map.Entry<String, String> entry : KNOWN_TRADEMARKS.entrySet()) {
            String brand = entry.getKey();
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(brand) + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(combinedText).find()) {
                findings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.TRADEMARK)
                        .value(brand.toUpperCase())
                        .confidence(0.95)
                        .reason("Deterministic match for protected trademark: " + entry.getValue())
                        .build());
                computedRisk = RiskStatus.REJECT;
                reasoning.append("Deterministic trademark detected: ").append(brand).append(". ");
            }
        }

        // 3. Deterministic Copyright / Character Checks
        for (Map.Entry<String, String> entry : KNOWN_COPYRIGHTS.entrySet()) {
            String ip = entry.getKey();
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(ip) + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(combinedText).find()) {
                findings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.COPYRIGHT)
                        .value(ip)
                        .confidence(0.98)
                        .reason("Deterministic match for copyrighted character/franchise: " + entry.getValue())
                        .build());
                computedRisk = RiskStatus.REJECT;
                reasoning.append("Copyrighted character/franchise detected: ").append(ip).append(". ");
            }
        }

        // 4. People and Model Release Checks
        boolean modelReleaseRequired = false;
        if (vision != null && vision.getPossiblePeople() != null && !vision.getPossiblePeople().isEmpty()) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.PERSON)
                    .value("Human Subject Detected")
                    .confidence(0.90)
                    .reason("Vision analysis identified " + vision.getPossiblePeople().size() + " visible person(s). A model release is required for commercial licensing.")
                    .build());
            modelReleaseRequired = true;
            if (computedRisk != RiskStatus.REJECT) {
                computedRisk = RiskStatus.REVIEW_REQUIRED;
                reasoning.append("Recognizable individual detected; model release verification required. ");
            }
        }

        // 5. Visible Text warning
        if (vision != null && vision.getVisibleText() != null && !vision.getVisibleText().isEmpty()) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.VISIBLE_TEXT)
                    .value(String.join(", ", vision.getVisibleText()))
                    .confidence(0.85)
                    .reason("Visible text strings identified in the image scene; inspect for unauthorized signage or brand marks.")
                    .build());
            if (computedRisk == RiskStatus.SAFE) {
                computedRisk = RiskStatus.REVIEW_REQUIRED;
                reasoning.append("Visible text present in image scene. ");
            }
        }

        if (reasoning.length() == 0) {
            reasoning.append("All deterministic safety and compliance checks passed.");
        }

        return new SafetyEvaluationResult(computedRisk, reasoning.toString().trim(), findings, modelReleaseRequired);
    }

    public record SafetyEvaluationResult(
            RiskStatus riskStatus,
            String reasoning,
            List<SafetyFindingDto> findings,
            boolean modelReleaseMayBeRequired
    ) {}
}
