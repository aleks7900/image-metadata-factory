package com.imagemetadata.service.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageAnalysisRequest {
    private UUID batchId;
    private UUID imageJobId;
    private String storagePath;
    private String originalFilename;
    private String mimeType;
    private byte[] imageBytes;
}
