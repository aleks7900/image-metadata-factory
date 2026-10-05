package com.imagemetadata.service.storage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredImage {
    private String storagePath;
    private String originalFilename;
    private String internalFilename;
    private String mimeType;
    private long sizeBytes;
}
