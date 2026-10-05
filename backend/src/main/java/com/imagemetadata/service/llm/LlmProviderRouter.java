package com.imagemetadata.service.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class LlmProviderRouter {

    private final Map<String, ImageMetadataProvider> providers;
    private final String defaultProviderName;

    public LlmProviderRouter(
            List<ImageMetadataProvider> providerList,
            @Value("${app.llm.provider:mock}") String defaultProviderName
    ) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(ImageMetadataProvider::getProviderName, p -> p));
        this.defaultProviderName = defaultProviderName;
        log.info("Initialized LLM Provider Router with providers: {}. Default: {}", providers.keySet(), defaultProviderName);
    }

    public ImageMetadataProvider getProvider() {
        return getProvider(defaultProviderName);
    }

    public ImageMetadataProvider getProvider(String name) {
        if (name == null || !providers.containsKey(name.toLowerCase())) {
            log.warn("Requested provider '{}' not found, falling back to default '{}'", name, defaultProviderName);
            return providers.getOrDefault(defaultProviderName, providers.values().iterator().next());
        }
        return providers.get(name.toLowerCase());
    }
}
