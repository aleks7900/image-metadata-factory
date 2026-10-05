package com.imagemetadata.service.llm;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class PromptTemplateService {

    private final Map<String, String> promptCache = new ConcurrentHashMap<>();
    public static final String VERSION_1_0 = "v1.0";

    @PostConstruct
    public void init() {
        loadPrompt("vision-analysis.txt");
        loadPrompt("metadata-generation.txt");
        loadPrompt("safety-validation.txt");
        loadPrompt("metadata-repair.txt");
    }

    public String getPrompt(String filename) {
        return promptCache.computeIfAbsent(filename, this::loadPromptFromClasspath);
    }

    public String renderPrompt(String filename, Map<String, String> variables) {
        String template = getPrompt(filename);
        if (variables == null || variables.isEmpty()) {
            return template;
        }
        String rendered = template;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            rendered = rendered.replace("${" + entry.getKey() + "}", entry.getValue() != null ? entry.getValue() : "");
        }
        return rendered;
    }

    public String getPromptVersion(String filename) {
        return VERSION_1_0;
    }

    private void loadPrompt(String filename) {
        try {
            String content = loadPromptFromClasspath(filename);
            promptCache.put(filename, content);
            log.debug("Loaded prompt template: {}", filename);
        } catch (Exception e) {
            log.error("Failed to preload prompt template {}: {}", filename, e.getMessage());
        }
    }

    private String loadPromptFromClasspath(String filename) {
        try {
            ClassPathResource resource = new ClassPathResource("prompts/" + filename);
            byte[] bytes = resource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Could not load prompt from prompts/{}: {}", filename, e.getMessage());
            return "";
        }
    }
}
