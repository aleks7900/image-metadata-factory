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

    private static final Set<String> WATERMARK_INDICATORS = Set.of(
            "watermark", "shutterstock", "getty images", "istock", "depositphotos", "alamy", "stock photo watermark", "sample watermark"
    );

    private static final Set<String> PROPERTY_RELEASE_INDICATORS = Set.of(
            "private estate", "disney castle", "eiffel tower night", "sydney opera house interior", "private architecture", "louvre museum interior"
    );

    private static final Set<String> AI_ARTIFACT_INDICATORS = Set.of(
            "extra fingers", "distorted hands", "ai glitch", "anatomical error", "deformed fingers", "ai artifact"
    );

    private static final Set<String> FORBIDDEN_METADATA_WORDS = Set.of(
            "celebrity", "nsfw", "nude", "hate", "violence", "counterfeit", "replica", "breaking news", "exclusive photo"
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

        // 4. Watermark Checks
        for (String wm : WATERMARK_INDICATORS) {
            if (combinedText.contains(wm)) {
                findings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.WATERMARK)
                        .value(wm)
                        .confidence(0.99)
                        .reason("Watermark or third-party agency indicator detected: " + wm)
                        .build());
                computedRisk = RiskStatus.REJECT;
                reasoning.append("Watermark detected: ").append(wm).append(". ");
            }
        }

        // 5. Property Release Checks
        for (String prop : PROPERTY_RELEASE_INDICATORS) {
            if (combinedText.contains(prop)) {
                findings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.PROPERTY_RELEASE)
                        .value(prop)
                        .confidence(0.90)
                        .reason("Distinct private property or protected architectural landmark requiring property release: " + prop)
                        .build());
                if (computedRisk != RiskStatus.REJECT) {
                    computedRisk = RiskStatus.REVIEW_REQUIRED;
                }
                reasoning.append("Property release may be required for: ").append(prop).append(". ");
            }
        }

        // 6. AI Artifacts
        for (String art : AI_ARTIFACT_INDICATORS) {
            if (combinedText.contains(art)) {
                findings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.AI_ARTIFACT)
                        .value(art)
                        .confidence(0.85)
                        .reason("Possible generative visual artifact detected: " + art)
                        .build());
                if (computedRisk != RiskStatus.REJECT) {
                    computedRisk = RiskStatus.REVIEW_REQUIRED;
                }
                reasoning.append("AI generative artifact flagged: ").append(art).append(". ");
            }
        }

        // 7. Forbidden Metadata
        for (String forbidden : FORBIDDEN_METADATA_WORDS) {
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(forbidden) + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(combinedText).find()) {
                findings.add(SafetyFindingDto.builder()
                        .type(SafetyFindingType.METADATA_ISSUE)
                        .value(forbidden)
                        .confidence(0.92)
                        .reason("Metadata contains prohibited stock term or unsupported editorial claim: " + forbidden)
                        .build());
                computedRisk = RiskStatus.REJECT;
                reasoning.append("Prohibited metadata term: ").append(forbidden).append(". ");
            }
        }

        // 8. People and Model Release Checks
        boolean modelReleaseRequired = false;
        if (vision != null && vision.getPossiblePeople() != null && !vision.getPossiblePeople().isEmpty()) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.PERSON)
                    .value("Human Subject Detected")
                    .confidence(0.90)
                    .reason("Vision analysis identified " + vision.getPossiblePeople().size() + " visible person(s). A signed model release is required for commercial licensing.")
                    .build());
            modelReleaseRequired = true;
            if (computedRisk != RiskStatus.REJECT) {
                computedRisk = RiskStatus.REVIEW_REQUIRED;
                reasoning.append("Recognizable individual detected; model release verification required. ");
            }
        }

        // 9. Visible Text warning
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

        String complianceStatus = mapComplianceStatus(computedRisk, findings);

        return new SafetyEvaluationResult(computedRisk, complianceStatus, reasoning.toString().trim(), findings, modelReleaseRequired);
    }

    public static String mapComplianceStatus(RiskStatus riskStatus, List<SafetyFindingDto> findings) {
        if (riskStatus == RiskStatus.REJECT) {
            return "BLOCKED BY LOCAL VALIDATION";
        }
        if (riskStatus == RiskStatus.REVIEW_REQUIRED) {
            return "REVIEW REQUIRED";
        }
        if (findings != null && findings.stream().anyMatch(f ->
                f.getType() == SafetyFindingType.QUALITY ||
                f.getType() == SafetyFindingType.VISIBLE_TEXT ||
                f.getType() == SafetyFindingType.AI_ARTIFACT)) {
            return "WARNING";
        }
        return "PASS";
    }

    public record SafetyEvaluationResult(
            RiskStatus riskStatus,
            String complianceStatus,
            String reasoning,
            List<SafetyFindingDto> findings,
            boolean modelReleaseMayBeRequired
    ) {
        // Overload constructor for backwards compatibility
        public SafetyEvaluationResult(RiskStatus riskStatus, String reasoning, List<SafetyFindingDto> findings, boolean modelReleaseMayBeRequired) {
            this(riskStatus, mapComplianceStatus(riskStatus, findings), reasoning, findings, modelReleaseMayBeRequired);
        }
    }
}
