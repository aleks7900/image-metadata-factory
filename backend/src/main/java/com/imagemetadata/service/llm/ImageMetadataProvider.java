package com.imagemetadata.service.llm;

import com.imagemetadata.dto.VisionAnalysisDto;

import java.util.List;

public interface ImageMetadataProvider {

    /**
     * Executes multimodal vision analysis extracting structured visual elements.
     */
    ImageAnalysisResult analyzeVision(ImageAnalysisRequest request);

    /**
     * Generates stock-friendly title, 100-250 character description, and 30-45 keywords.
     */
    ImageAnalysisResult generateMetadata(VisionAnalysisDto vision, ImageAnalysisRequest request);

    /**
     * Conducts commercial risk and safety evaluation (trademarks, people, copyright).
     */
    ImageAnalysisResult validateSafety(VisionAnalysisDto vision, String title, String description, List<String> keywords, ImageAnalysisRequest request);

    /**
     * Corrects metadata based on targeted quality validation errors.
     */
    ImageAnalysisResult repairMetadata(VisionAnalysisDto vision, String currentTitle, String currentDescription, List<String> currentKeywords, List<String> violations, ImageAnalysisRequest request);

    String getProviderName();
}
