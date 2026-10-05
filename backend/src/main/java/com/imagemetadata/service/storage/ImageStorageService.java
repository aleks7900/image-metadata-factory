package com.imagemetadata.service.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

public interface ImageStorageService {

    StoredImage store(MultipartFile file, UUID batchId);

    StoredImage store(InputStream inputStream, String originalFilename, String contentType, long size, UUID batchId);

    Resource load(String storagePath);

    byte[] loadBytes(String storagePath);

    void delete(String storagePath);
}
