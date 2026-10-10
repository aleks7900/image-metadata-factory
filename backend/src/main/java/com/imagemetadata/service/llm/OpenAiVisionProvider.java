package com.imagemetadata.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imagemetadata.dto.SafetyFindingDto;
import com.imagemetadata.dto.VisionAnalysisDto;
import com.imagemetadata.exception.LlmProviderException;
import com.imagemetadata.model.AdobeStockCategory;
import com.imagemetadata.model.RiskStatus;
import com.imagemetadata.model.SafetyFindingType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.*;

@Slf4j
@Service
public class OpenAiVisionProvider implements ImageMetadataProvider {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final PromptTemplateService promptTemplateService;

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final double temperature;
    private final int maxTokens;

    public OpenAiVisionProvider(
            RestTemplateBuilder restTemplateBuilder,
            ObjectMapper objectMapper,
            PromptTemplateService promptTemplateService,
            @Value("${app.llm.openai.api-key:}") String apiKey,
            @Value("${app.llm.openai.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${app.llm.openai.model:gpt-4o-mini}") String model,
            @Value("${app.llm.openai.temperature:0.2}") double temperature,
            @Value("${app.llm.openai.max-tokens:2000}") int maxTokens,
            @Value("${app.llm.openai.timeout-seconds:45}") int timeoutSeconds
    ) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(15))
                .setReadTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        this.objectMapper = objectMapper;
        this.promptTemplateService = promptTemplateService;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    public ImageAnalysisResult analyzeVision(ImageAnalysisRequest request) {
        if (!StringUtils.hasText(apiKey)) {
            throw new LlmProviderException("OpenAI API key not configured", false);
        }

        long start = System.currentTimeMillis();
        String prompt = promptTemplateService.getPrompt("vision-analysis.txt");
        String base64Image = Base64.getEncoder().encodeToString(request.getImageBytes());
        String mimeType = request.getMimeType() != null ? request.getMimeType() : "image/jpeg";
        String dataUrl = "data:" + mimeType + ";base64," + base64Image;

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "temperature", temperature,
                "max_tokens", maxTokens,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", List.of(
                                        Map.of("type", "text", "text", prompt),
                                        Map.of("type", "image_url", "image_url", Map.of("url", dataUrl, "detail", "auto"))
                                )
                        )
                )
        );

        LlmResponse llmResponse = executeApiCall(requestBody);
        long duration = System.currentTimeMillis() - start;

        try {
            String cleanJson = sanitizeJsonContent(llmResponse.content);
            VisionAnalysisDto vision = objectMapper.readValue(cleanJson, VisionAnalysisDto.class);
            return ImageAnalysisResult.builder()
                    .vision(vision)
                    .rawVisionJson(cleanJson)
                    .provider("openai")
                    .model(model)
                    .promptVersion(promptTemplateService.getPromptVersion("vision-analysis.txt"))
                    .inputTokens(llmResponse.promptTokens)
                    .outputTokens(llmResponse.completionTokens)
                    .estimatedCostUsd(calculateCost(llmResponse.promptTokens, llmResponse.completionTokens))
                    .durationMs(duration)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse vision analysis JSON response: {}", llmResponse.content, e);
            throw new LlmProviderException("Malformed LLM vision response", e, true);
        }
    }

    @Override
    public ImageAnalysisResult generateMetadata(VisionAnalysisDto vision, ImageAnalysisRequest request) {
        if (!StringUtils.hasText(apiKey)) {
            throw new LlmProviderException("OpenAI API key not configured", false);
        }

        long start = System.currentTimeMillis();
        String visionJson;
        try {
            visionJson = objectMapper.writeValueAsString(vision);
        } catch (Exception e) {
            visionJson = "{}";
        }

        String renderedPrompt = promptTemplateService.renderPrompt("metadata-generation.txt", Map.of(
                "visionAnalysisJson", visionJson
        ));

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "temperature", temperature,
                "max_tokens", maxTokens,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "user", "content", renderedPrompt)
                )
        );

        LlmResponse llmResponse = executeApiCall(requestBody);
        long duration = System.currentTimeMillis() - start;

        try {
            String cleanJson = sanitizeJsonContent(llmResponse.content);
            JsonNode root = objectMapper.readTree(cleanJson);
            String title = root.path("title").asText("");
            String description = root.path("description").asText("");
            List<String> keywords = new ArrayList<>();
            JsonNode kwNode = root.path("keywords");
            if (kwNode.isArray()) {
                kwNode.forEach(k -> keywords.add(k.asText().trim().toLowerCase()));
            }

            Integer categoryId = null;
            String categoryName = null;
            if (root.has("categoryId")) {
                categoryId = root.path("categoryId").asInt();
                AdobeStockCategory cat = AdobeStockCategory.fromId(categoryId);
                if (cat != null) categoryName = cat.getName();
            } else if (root.has("category")) {
                String catStr = root.path("category").asText();
                AdobeStockCategory cat = AdobeStockCategory.fromName(catStr);
                if (cat != null) {
                    categoryId = cat.getId();
                    categoryName = cat.getName();
                }
            }
            if (categoryId == null) {
                AdobeStockCategory cat = AdobeStockCategory.inferCategory(title, vision != null ? vision.getEnvironment() : null, vision != null ? vision.getSubjects() : null, keywords);
                categoryId = cat.getId();
                categoryName = cat.getName();
            }

            return ImageAnalysisResult.builder()
                    .title(title)
                    .description(description)
                    .keywords(keywords)
                    .category(categoryId)
                    .categoryName(categoryName)
                    .provider("openai")
                    .model(model)
                    .promptVersion(promptTemplateService.getPromptVersion("metadata-generation.txt"))
                    .inputTokens(llmResponse.promptTokens)
                    .outputTokens(llmResponse.completionTokens)
                    .estimatedCostUsd(calculateCost(llmResponse.promptTokens, llmResponse.completionTokens))
                    .durationMs(duration)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse metadata generation response: {}", llmResponse.content, e);
            throw new LlmProviderException("Malformed metadata generation response", e, true);
        }
    }

    @Override
    public ImageAnalysisResult validateSafety(VisionAnalysisDto vision, String title, String description, List<String> keywords, ImageAnalysisRequest request) {
        if (!StringUtils.hasText(apiKey)) {
            throw new LlmProviderException("OpenAI API key not configured", false);
        }

        long start = System.currentTimeMillis();
        String visionJson;
        try {
            visionJson = objectMapper.writeValueAsString(vision);
        } catch (Exception e) {
            visionJson = "{}";
        }

        String renderedPrompt = promptTemplateService.renderPrompt("safety-validation.txt", Map.of(
                "visionAnalysisJson", visionJson,
                "title", title != null ? title : "",
                "description", description != null ? description : "",
                "keywords", keywords != null ? String.join(", ", keywords) : ""
        ));

        // Multimodal content: attach both the compliance prompt and the actual image
        List<Map<String, Object>> userContent = new ArrayList<>();
        userContent.add(Map.of("type", "text", "text", renderedPrompt));

        if (request.getImageBytes() != null && request.getImageBytes().length > 0) {
            String base64Image = Base64.getEncoder().encodeToString(request.getImageBytes());
            String mimeType = request.getMimeType() != null ? request.getMimeType() : "image/jpeg";
            String dataUrl = "data:" + mimeType + ";base64," + base64Image;
            userContent.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl, "detail", "auto")));
        }

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "temperature", temperature,
                "max_tokens", maxTokens,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "user", "content", userContent)
                )
        );

        LlmResponse llmResponse = executeApiCall(requestBody);
        long duration = System.currentTimeMillis() - start;

        try {
            String cleanJson = sanitizeJsonContent(llmResponse.content);
            JsonNode root = objectMapper.readTree(cleanJson);
            String riskStr = root.path("riskStatus").asText("SAFE").toUpperCase();
            RiskStatus riskStatus;
            try {
                riskStatus = RiskStatus.valueOf(riskStr);
            } catch (Exception e) {
                riskStatus = RiskStatus.REVIEW_REQUIRED;
            }

            String reasoning = root.path("reasoning").asText("");
            boolean modelRelease = root.path("peopleAssessment").path("modelReleaseMayBeRequired").asBoolean(false);

            List<SafetyFindingDto> findings = new ArrayList<>();
            JsonNode findingsNode = root.path("findings");
            if (findingsNode.isArray()) {
                findingsNode.forEach(f -> {
                    String typeStr = f.path("type").asText("TRADEMARK").toUpperCase();
                    SafetyFindingType type;
                    try {
                        type = SafetyFindingType.valueOf(typeStr);
                    } catch (Exception e) {
                        type = SafetyFindingType.TRADEMARK;
                    }
                    findings.add(SafetyFindingDto.builder()
                            .type(type)
                            .value(f.path("value").asText(""))
                            .confidence(f.path("confidence").asDouble(0.9))
                            .reason(f.path("reason").asText(""))
                            .build());
                });
            }

            return ImageAnalysisResult.builder()
                    .riskStatus(riskStatus)
                    .safetyReasoning(reasoning)
                    .safetyFindings(findings)
                    .modelReleaseMayBeRequired(modelRelease)
                    .provider("openai")
                    .model(model)
                    .promptVersion(promptTemplateService.getPromptVersion("safety-validation.txt"))
                    .inputTokens(llmResponse.promptTokens)
                    .outputTokens(llmResponse.completionTokens)
                    .estimatedCostUsd(calculateCost(llmResponse.promptTokens, llmResponse.completionTokens))
                    .durationMs(duration)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse safety validation response: {}", llmResponse.content, e);
            throw new LlmProviderException("Malformed safety validation response", e, true);
        }
    }

    @Override
    public ImageAnalysisResult repairMetadata(VisionAnalysisDto vision, String currentTitle, String currentDescription, List<String> currentKeywords, List<String> violations, ImageAnalysisRequest request) {
        if (!StringUtils.hasText(apiKey)) {
            throw new LlmProviderException("OpenAI API key not configured", false);
        }

        long start = System.currentTimeMillis();
        String visionJson;
        try {
            visionJson = objectMapper.writeValueAsString(vision);
        } catch (Exception e) {
            visionJson = "{}";
        }

        String renderedPrompt = promptTemplateService.renderPrompt("metadata-repair.txt", Map.of(
                "visionAnalysisJson", visionJson,
                "currentTitle", currentTitle != null ? currentTitle : "",
                "currentDescription", currentDescription != null ? currentDescription : "",
                "currentKeywords", currentKeywords != null ? String.join(", ", currentKeywords) : "",
                "qualityErrors", String.join("\n- ", violations)
        ));

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "temperature", temperature,
                "max_tokens", maxTokens,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "user", "content", renderedPrompt)
                )
        );

        LlmResponse llmResponse = executeApiCall(requestBody);
        long duration = System.currentTimeMillis() - start;

        try {
            String cleanJson = sanitizeJsonContent(llmResponse.content);
            JsonNode root = objectMapper.readTree(cleanJson);
            String title = root.path("title").asText(currentTitle);
            String description = root.path("description").asText(currentDescription);
            List<String> keywords = new ArrayList<>();
            JsonNode kwNode = root.path("keywords");
            if (kwNode.isArray()) {
                kwNode.forEach(k -> keywords.add(k.asText().trim().toLowerCase()));
            }

            return ImageAnalysisResult.builder()
                    .title(title)
                    .description(description)
                    .keywords(keywords)
                    .provider("openai")
                    .model(model)
                    .promptVersion(promptTemplateService.getPromptVersion("metadata-repair.txt"))
                    .inputTokens(llmResponse.promptTokens)
                    .outputTokens(llmResponse.completionTokens)
                    .estimatedCostUsd(calculateCost(llmResponse.promptTokens, llmResponse.completionTokens))
                    .durationMs(duration)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse repair metadata response: {}", llmResponse.content, e);
            throw new LlmProviderException("Malformed repair metadata response", e, true);
        }
    }

    private LlmResponse executeApiCall(Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        String endpoint = baseUrl + "/chat/completions";

        int maxAttempts = 6;
        long backoffMs = 1500;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST, entity, String.class);
                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    throw new LlmProviderException("Non-2xx response from OpenAI: " + response.getStatusCode(), true);
                }

                JsonNode responseJson = objectMapper.readTree(response.getBody());
                String content = responseJson.path("choices").path(0).path("message").path("content").asText();
                int promptTokens = responseJson.path("usage").path("prompt_tokens").asInt(0);
                int completionTokens = responseJson.path("usage").path("completion_tokens").asInt(0);

                return new LlmResponse(content, promptTokens, completionTokens);
            } catch (HttpClientErrorException e) {
                boolean retryable = e.getStatusCode().value() == 429;
                if (retryable && attempt < maxAttempts) {
                    long jitter = (long) (Math.random() * 1000);
                    long waitTime = backoffMs + jitter;
                    log.warn("Rate limited (429) by OpenAI, backing off for {}ms (attempt {}/{})", waitTime, attempt, maxAttempts);
                    sleep(waitTime);
                    backoffMs = Math.min(backoffMs * 2, 10000);
                    continue;
                }
                log.error("OpenAI client error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
                throw new LlmProviderException("OpenAI API client error: " + e.getStatusCode(), e, retryable);
            } catch (HttpServerErrorException | ResourceAccessException e) {
                if (attempt < maxAttempts) {
                    long jitter = (long) (Math.random() * 500);
                    long waitTime = backoffMs + jitter;
                    log.warn("Transient error from OpenAI ({}), backing off for {}ms (attempt {}/{})", e.getMessage(), waitTime, attempt, maxAttempts);
                    sleep(waitTime);
                    backoffMs = Math.min(backoffMs * 2, 10000);
                    continue;
                }
                log.error("OpenAI server/timeout error: {}", e.getMessage());
                throw new LlmProviderException("OpenAI API server error: " + e.getMessage(), e, true);
            } catch (Exception e) {
                log.error("Unexpected error communicating with OpenAI: {}", e.getMessage());
                throw new LlmProviderException("Unexpected LLM error: " + e.getMessage(), e, false);
            }
        }
        throw new LlmProviderException("Exhausted retries calling OpenAI API", true);
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String sanitizeJsonContent(String raw) {
        if (raw == null) return "{}";
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private BigDecimal calculateCost(int promptTokens, int completionTokens) {
        // Standard pricing approximation for gpt-4o-mini ($0.15 / 1M prompt, $0.60 / 1M completion)
        double inputCost = (promptTokens / 1_000_000.0) * 0.15;
        double outputCost = (completionTokens / 1_000_000.0) * 0.60;
        return BigDecimal.valueOf(inputCost + outputCost).setScale(6, RoundingMode.HALF_UP);
    }

    private record LlmResponse(String content, int promptTokens, int completionTokens) {}
}
