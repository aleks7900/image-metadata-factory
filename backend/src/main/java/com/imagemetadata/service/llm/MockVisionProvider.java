package com.imagemetadata.service.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagemetadata.dto.SafetyFindingDto;
import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.model.AdobeStockCategory;
import com.imagemetadata.model.RiskStatus;
import com.imagemetadata.model.SafetyFindingType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Slf4j
@Service
public class MockVisionProvider implements ImageMetadataProvider {

    private final ObjectMapper objectMapper;
    private final PromptTemplateService promptTemplateService;
    private final long latencyMs;

    public MockVisionProvider(
            ObjectMapper objectMapper,
            PromptTemplateService promptTemplateService,
            @Value("${app.llm.mock.latency-ms:150}") long latencyMs
    ) {
        this.objectMapper = objectMapper;
        this.promptTemplateService = promptTemplateService;
        this.latencyMs = latencyMs;
    }

    @Override
    public String getProviderName() {
        return "mock";
    }

    private void simulateLatency() {
        if (latencyMs > 0) {
            try {
                Thread.sleep(latencyMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    public ImageAnalysisResult analyzeVision(ImageAnalysisRequest request) {
        long start = System.currentTimeMillis();
        simulateLatency();

        String filename = request.getOriginalFilename().toLowerCase();
        VisionAnalysisDto vision = createMockVisionDto(filename);
        String rawJson;
        try {
            rawJson = objectMapper.writeValueAsString(vision);
        } catch (Exception e) {
            rawJson = "{}";
        }

        long duration = System.currentTimeMillis() - start;
        return ImageAnalysisResult.builder()
                .vision(vision)
                .rawVisionJson(rawJson)
                .provider("mock")
                .model("mock-vision-v1")
                .promptVersion(promptTemplateService.getPromptVersion("vision-analysis.txt"))
                .inputTokens(650)
                .outputTokens(280)
                .estimatedCostUsd(BigDecimal.valueOf(0.00085).setScale(6, RoundingMode.HALF_UP))
                .durationMs(duration)
                .build();
    }

    @Override
    public ImageAnalysisResult generateMetadata(VisionAnalysisDto vision, ImageAnalysisRequest request) {
        long start = System.currentTimeMillis();
        simulateLatency();

        String filename = request.getOriginalFilename().toLowerCase();
        MockScene scene = getSceneForFilename(filename);
        AdobeStockCategory cat = AdobeStockCategory.inferCategory(scene.title, scene.environment, scene.subjects, scene.keywords);

        long duration = System.currentTimeMillis() - start;
        return ImageAnalysisResult.builder()
                .title(scene.title)
                .description(scene.description)
                .keywords(new ArrayList<>(scene.keywords))
                .category(cat.getId())
                .categoryName(cat.getName())
                .provider("mock")
                .model("mock-metadata-v1")
                .promptVersion(promptTemplateService.getPromptVersion("metadata-generation.txt"))
                .inputTokens(420)
                .outputTokens(190)
                .estimatedCostUsd(BigDecimal.valueOf(0.00062).setScale(6, RoundingMode.HALF_UP))
                .durationMs(duration)
                .build();
    }

    @Override
    public ImageAnalysisResult validateSafety(VisionAnalysisDto vision, String title, String description, List<String> keywords, ImageAnalysisRequest request) {
        long start = System.currentTimeMillis();
        simulateLatency();

        String filename = request.getOriginalFilename().toLowerCase();
        List<SafetyFindingDto> findings = new ArrayList<>();
        RiskStatus riskStatus = RiskStatus.SAFE;
        String reasoning = "No commercial, trademark, or recognizable person risks detected.";
        boolean modelRelease = false;

        // Check for trademarks in filename or candidate metadata
        if (filename.contains("nike") || title.toLowerCase().contains("nike")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.TRADEMARK)
                    .value("Nike")
                    .confidence(0.96)
                    .reason("Distinctive Nike swoosh trademark detected on footwear or apparel")
                    .build());
            riskStatus = RiskStatus.REJECT;
            reasoning = "High-confidence registered trademark detected: Nike";
        } else if (filename.contains("apple") || title.toLowerCase().contains("apple logo") || filename.contains("iphone")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.TRADEMARK)
                    .value("Apple")
                    .confidence(0.94)
                    .reason("Recognizable Apple silhouette logo on consumer electronic hardware")
                    .build());
            riskStatus = RiskStatus.REJECT;
            reasoning = "High-confidence registered trademark detected: Apple";
        } else if (filename.contains("tesla") || filename.contains("coca-cola") || filename.contains("mcdonald") || filename.contains("brand") || filename.contains("logo") || filename.contains("store")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.TRADEMARK)
                    .value("Commercial Brand")
                    .confidence(0.92)
                    .reason("Commercial brand branding or logo identified in scene")
                    .build());
            riskStatus = RiskStatus.REJECT;
            reasoning = "High-confidence brand logo identified.";
        }

        // Check for recognizable persons
        if (filename.contains("portrait") || filename.contains("person") || filename.contains("face") || filename.contains("model")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.PERSON)
                    .value("Recognizable Adult Face")
                    .confidence(0.91)
                    .reason("Clear visible human facial features require a signed model release for commercial licensing")
                    .build());
            if (riskStatus != RiskStatus.REJECT) {
                riskStatus = RiskStatus.REVIEW_REQUIRED;
                reasoning = "Recognizable person detected: Model release verification required.";
            }
            modelRelease = true;
        }

        // Check for copyrighted IP
        if (filename.contains("spiderman") || filename.contains("spider-man") || filename.contains("mario") || filename.contains("disney") || filename.contains("pokemon") || filename.contains("character") || filename.contains("ip-")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.COPYRIGHT)
                    .value("Copyrighted Character / Franchise")
                    .confidence(0.98)
                    .reason("Depiction of protected intellectual property character or franchise artwork")
                    .build());
            riskStatus = RiskStatus.REJECT;
            reasoning = "Protected fictional character / copyrighted IP identified.";
        }

        // Check for blurred abstract quality
        if (filename.contains("blurred") || filename.contains("abstract")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.QUALITY)
                    .value("Abstract Shallow Focus")
                    .confidence(0.85)
                    .reason("Image has significant soft blur and shallow depth of field.")
                    .build());
        }

        // Check for visible text
        if (filename.contains("visible-text") || filename.contains("text")) {
            findings.add(SafetyFindingDto.builder()
                    .type(SafetyFindingType.VISIBLE_TEXT)
                    .value("Visible Signage Text")
                    .confidence(0.88)
                    .reason("Visible text strings identified in the image scene; inspect for unauthorized brand signage.")
                    .build());
            if (riskStatus == RiskStatus.SAFE) {
                riskStatus = RiskStatus.REVIEW_REQUIRED;
                reasoning = "Visible text in scene requires review.";
            }
        }

        long duration = System.currentTimeMillis() - start;
        return ImageAnalysisResult.builder()
                .riskStatus(riskStatus)
                .safetyReasoning(reasoning)
                .safetyFindings(findings)
                .modelReleaseMayBeRequired(modelRelease)
                .provider("mock")
                .model("mock-safety-v1")
                .promptVersion(promptTemplateService.getPromptVersion("safety-validation.txt"))
                .inputTokens(380)
                .outputTokens(150)
                .estimatedCostUsd(BigDecimal.valueOf(0.00055).setScale(6, RoundingMode.HALF_UP))
                .durationMs(duration)
                .build();
    }

    @Override
    public ImageAnalysisResult repairMetadata(VisionAnalysisDto vision, String currentTitle, String currentDescription, List<String> currentKeywords, List<String> violations, ImageAnalysisRequest request) {
        long start = System.currentTimeMillis();
        simulateLatency();

        String filename = request.getOriginalFilename().toLowerCase();
        MockScene scene = getSceneForFilename(filename);

        long duration = System.currentTimeMillis() - start;
        return ImageAnalysisResult.builder()
                .title(scene.title)
                .description(scene.description)
                .keywords(new ArrayList<>(scene.keywords))
                .provider("mock")
                .model("mock-repair-v1")
                .promptVersion(promptTemplateService.getPromptVersion("metadata-repair.txt"))
                .inputTokens(510)
                .outputTokens(210)
                .estimatedCostUsd(BigDecimal.valueOf(0.00072).setScale(6, RoundingMode.HALF_UP))
                .durationMs(duration)
                .build();
    }

    private VisionAnalysisDto createMockVisionDto(String filename) {
        MockScene scene = getSceneForFilename(filename);
        return VisionAnalysisDto.builder()
                .subjects(scene.subjects)
                .objects(scene.objects)
                .environment(scene.environment)
                .setting(scene.setting)
                .activities(scene.activities)
                .visualStyle(scene.visualStyle)
                .composition(scene.composition)
                .colors(scene.colors)
                .lighting(scene.lighting)
                .mood(scene.mood)
                .concepts(scene.concepts)
                .possiblePeople(scene.possiblePeople)
                .possibleBrands(scene.possibleBrands)
                .possibleCopyrightedCharacters(scene.possibleCopyrightedCharacters)
                .visibleText(scene.visibleText)
                .build();
    }

    private MockScene getSceneForFilename(String filename) {
        if (filename.contains("cyber") || filename.contains("city") || filename.contains("neon")) {
            return new MockScene(
                    "Futuristic Neon City Street at Night With Cyberpunk Architecture",
                    "Vibrant cyberpunk metropolis with towering skyscrapers and bright neon signs reflecting off wet asphalt pavements during a dramatic rainy night.",
                    List.of("futuristic city", "cyberpunk skyscraper"),
                    List.of("neon signs", "skyscrapers", "streetlights", "wet asphalt", "crosswalk"),
                    "Densely built futuristic urban center",
                    "outdoor",
                    List.of("night city reflection", "urban walking"),
                    "cinematic digital photography",
                    "wide angle street perspective with leading lines",
                    List.of("cyan", "magenta", "deep blue", "amber"),
                    "vibrant neon backlight and moody shadows",
                    "futuristic, mysterious, moody, energetic",
                    List.of("technology", "future", "metropolis", "architecture", "urban lifestyle"),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of("CYBER", "HOTEL", "24H"),
                    generateKeywords(
                            "cyberpunk", "cityscape", "neon lights", "night", "futuristic",
                            "architecture", "skyscrapers", "wet street", "reflections", "urban",
                            "metropolis", "glowing", "dusk", "illumination", "darkness",
                            "scifi", "technology", "modern", "cyber", "pavement",
                            "exterior", "empty street", "perspective", "vibrant", "blue light",
                            "pink light", "shadows", "digital age", "concept", "transportation",
                            "alley", "moody", "atmospheric", "contemporary", "commercial"
                    )
            );
        } else if (filename.contains("business") || filename.contains("office") || filename.contains("team")) {
            return new MockScene(
                    "Collaborative Business Meeting in Modern Glass Office",
                    "Diverse professional corporate team engaged in creative brainstorming and strategic project planning inside a sunlit glass conference room.",
                    List.of("corporate professionals", "project team"),
                    List.of("laptops", "notebooks", "glass whiteboard", "conference table", "coffee cups"),
                    "Bright open-plan modern corporate office",
                    "indoor",
                    List.of("brainstorming", "collaborating", "reviewing charts"),
                    "contemporary corporate photography",
                    "medium group shot with soft background bokeh",
                    List.of("navy blue", "white", "warm wood", "slate gray"),
                    "diffused natural morning sunlight through floor-to-ceiling windows",
                    "collaborative, professional, confident, innovative",
                    List.of("teamwork", "leadership", "corporate strategy", "success", "workplace"),
                    List.of(Map.of("description", "professional adults in business casual", "isRecognizable", true)),
                    List.of(),
                    List.of(),
                    List.of("Quarterly Strategy"),
                    generateKeywords(
                            "business", "teamwork", "meeting", "office", "collaboration",
                            "corporate", "professionals", "strategy", "conference room", "coworkers",
                            "discussion", "planning", "diversity", "workplace", "colleagues",
                            "brainstorming", "modern office", "presentation", "leadership", "communication",
                            "productivity", "career", "partnership", "success", "entrepreneur",
                            "workspace", "group discussion", "indoor", "finance", "management",
                            "technology", "laptop", "team", "together", "professional"
                    )
            );
        } else if (filename.contains("food") || filename.contains("meal") || filename.contains("dish")) {
            return new MockScene(
                    "Artisan Gourmet Food Platter on Rustic Table",
                    "Freshly prepared culinary dishes and colorful wholesome ingredients arranged beautifully on a rustic farmhouse wooden dining table.",
                    List.of("culinary dishes", "fresh ingredients"),
                    List.of("serving platter", "rustic table", "herbs", "olive oil", "fork", "plate"),
                    "Warm artisan rustic restaurant kitchen",
                    "indoor",
                    List.of("food presentation", "dining"),
                    "gourmet food photography",
                    "overhead flat lay composition",
                    List.of("warm brown", "vibrant green", "terracotta red", "golden yellow"),
                    "soft diffused ambient daylight",
                    "appetizing, wholesome, delicious, authentic",
                    List.of("food", "gastronomy", "healthy dining", "nutrition", "hospitality"),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    generateKeywords(
                            "food", "gourmet", "meal", "delicious", "healthy",
                            "culinary", "restaurant", "fresh", "dinner", "vegetables",
                            "cooking", "plate", "rustic", "wooden table", "nutrition",
                            "organic", "tasty", "appetizer", "homemade", "dining",
                            "cuisine", "herbs", "olive oil", "presentation", "lunch",
                            "flavor", "dish", "chef", "tableware", "wholesome",
                            "feast", "eating", "gastronomic", "kitchen", "recipe"
                    )
            );
        } else if (filename.contains("architecture") || filename.contains("building")) {
            return new MockScene(
                    "Modern Skyscraper Geometric Facade and Windows",
                    "Striking geometric architectural lines and modern glass panels of a contemporary corporate skyscraper reflecting afternoon daylight.",
                    List.of("modern skyscraper", "geometric facade"),
                    List.of("glass windows", "steel frames", "reflections", "concrete pillars"),
                    "Metropolitan financial business district",
                    "outdoor",
                    List.of("architectural viewing"),
                    "minimalist architectural photography",
                    "upward low angle looking toward blue sky",
                    List.of("silver", "reflective blue", "gray", "white"),
                    "bright direct sunlight creating geometric shadows",
                    "minimalist, modern, grand, sophisticated",
                    List.of("architecture", "engineering", "urban design", "modernity", "commercial building"),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    generateKeywords(
                            "architecture", "skyscraper", "building", "modern", "facade",
                            "geometric", "glass", "urban", "city", "structure",
                            "contemporary", "exterior", "windows", "metropolis", "steel",
                            "minimalist", "low angle", "corporate", "reflection", "blue sky",
                            "financial district", "office building", "construction", "pattern", "symmetry",
                            "perspective", "height", "commercial", "tower", "downtown",
                            "design", "business", "futuristic", "sunlight", "landmark"
                    )
            );
        } else if (filename.contains("wildlife") || filename.contains("animal") || filename.contains("bear")) {
            return new MockScene(
                    "Majestic Wild Bear Foraging Along Mountain River",
                    "Large wild brown bear walking gracefully along a rushing clear alpine river surrounded by dense pristine evergreen pines.",
                    List.of("brown bear", "mountain river"),
                    List.of("river rocks", "pine forest", "rushing water", "boulders"),
                    "Remote wilderness river bank",
                    "outdoor",
                    List.of("wildlife foraging", "salmon fishing"),
                    "documentary wildlife telephoto photography",
                    "eye-level wildlife action shot",
                    List.of("rich brown", "forest green", "river blue", "slate gray"),
                    "diffused afternoon wilderness light",
                    "wild, powerful, majestic, untamed",
                    List.of("wildlife", "nature conservation", "predator", "fauna", "biodiversity"),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    generateKeywords(
                            "wildlife", "bear", "animal", "nature", "forest",
                            "wilderness", "river", "mountain", "outdoors", "predator",
                            "grizzly", "brown bear", "fauna", "wild", "natural habitat",
                            "freshwater", "pine trees", "fur", "water", "salmon",
                            "stones", "north america", "solitude", "ecosystem", "conservation",
                            "hunting", "powerful", "zoology", "stream", "park",
                            "remote", "survival", "mammal", "purity", "environment"
                    )
            );
        } else if (filename.contains("abstract") || filename.contains("blurred")) {
            return new MockScene(
                    "Abstract Soft Bokeh Color Light Background",
                    "Smooth out-of-focus luminous colorful circles and gentle gradient light rays creating an elegant dreamy abstract backdrop.",
                    List.of("abstract bokeh lights", "gradient background"),
                    List.of("light spheres", "glowing particles", "soft flares"),
                    "Studio lighting abstraction",
                    "studio",
                    List.of(),
                    "abstract macro optics photography",
                    "shallow focus dreamy arrangement",
                    List.of("soft gold", "pastel violet", "warm peach", "deep indigo"),
                    "defocused ambient glow",
                    "dreamy, tranquil, imaginative, ethereal",
                    List.of("abstraction", "background", "elegance", "creativity", "celebration"),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    generateKeywords(
                            "abstract", "bokeh", "background", "lights", "blurred",
                            "soft focus", "glowing", "gradient", "circles", "defocused",
                            "wallpaper", "texture", "luminous", "dreamy", "colors",
                            "bright", "glow", "artistic", "glamour", "festive",
                            "celebration", "sparkle", "glitter", "modern", "design",
                            "elegance", "smooth", "ambient", "pattern", "illumination",
                            "magic", "creative", "optical", "shimmer", "backdrop"
                    )
            );
        } else {
            // Default majestic landscape scene
            return new MockScene(
                    "Dramatic Alpine Mountain Lake Reflection at Sunrise",
                    "Breathtaking alpine mountain peaks illuminated by early morning golden sunrise light mirrored perfectly on a serene crystal-clear glacial lake.",
                    List.of("snow-capped mountain range", "calm alpine lake"),
                    List.of("granite peaks", "pine forest", "boulders", "water reflections", "mist"),
                    "Pristine alpine wilderness valley",
                    "outdoor",
                    List.of("nature exploration", "hiking trail vista"),
                    "panoramic landscape photography",
                    "symmetrical reflection with deep depth of field",
                    List.of("emerald green", "golden yellow", "sky blue", "granite gray"),
                    "warm golden hour directional sunlight across peaks",
                    "peaceful, awe-inspiring, majestic, tranquil",
                    List.of("wilderness", "serenity", "environment", "travel", "solitude"),
                    List.of(),
                    List.of(),
                    List.of(),
                    List.of(),
                    generateKeywords(
                            "mountains", "lake", "reflection", "sunrise", "landscape",
                            "alpine", "nature", "wilderness", "scenic", "peaceful",
                            "tranquility", "golden hour", "peaks", "water", "forest",
                            "pine trees", "travel", "outdoors", "serene", "calm",
                            "majestic", "valley", "hiking", "adventure", "clean water",
                            "snowy peaks", "fresh air", "dawn", "mirror effect", "panorama",
                            "pristine", "remote", "environment", "geology", "skyline"
                    )
            );
        }
    }

    private List<String> generateKeywords(String... initialKeywords) {
        Set<String> set = new LinkedHashSet<>(Arrays.asList(initialKeywords));
        // Ensure count is safely within 30-45
        String[] fillers = {
                "scenic", "destination", "nobody", "horizontal", "high angle",
                "creative", "composition", "elegance", "perfection", "stock photo",
                "digital image", "marketing asset"
        };
        for (String filler : fillers) {
            if (set.size() >= 35) {
                break;
            }
            set.add(filler);
        }
        return new ArrayList<>(set);
    }

    private static class MockScene {
        final String title;
        final String description;
        final List<String> subjects;
        final List<String> objects;
        final String environment;
        final String setting;
        final List<String> activities;
        final String visualStyle;
        final String composition;
        final List<String> colors;
        final String lighting;
        final String mood;
        final List<String> concepts;
        final List<Object> possiblePeople;
        final List<String> possibleBrands;
        final List<String> possibleCopyrightedCharacters;
        final List<String> visibleText;
        final List<String> keywords;

        MockScene(
                String title, String description,
                List<String> subjects, List<String> objects,
                String environment, String setting,
                List<String> activities, String visualStyle,
                String composition, List<String> colors,
                String lighting, String mood,
                List<String> concepts, List<Object> possiblePeople,
                List<String> possibleBrands, List<String> possibleCopyrightedCharacters,
                List<String> visibleText, List<String> keywords
        ) {
            this.title = title;
            this.description = description;
            this.subjects = subjects;
            this.objects = objects;
            this.environment = environment;
            this.setting = setting;
            this.activities = activities;
            this.visualStyle = visualStyle;
            this.composition = composition;
            this.colors = colors;
            this.lighting = lighting;
            this.mood = mood;
            this.concepts = concepts;
            this.possiblePeople = possiblePeople;
            this.possibleBrands = possibleBrands;
            this.possibleCopyrightedCharacters = possibleCopyrightedCharacters;
            this.visibleText = visibleText;
            this.keywords = keywords;
        }
    }
}
