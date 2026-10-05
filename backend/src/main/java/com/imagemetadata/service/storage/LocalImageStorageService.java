package com.imagemetadata.service.storage;

import com.imagemetadata.exception.StorageException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class LocalImageStorageService implements ImageStorageService {

    private final Path rootLocation;
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp"
    );
    private static final long MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

    public LocalImageStorageService(@Value("${app.storage.local.base-dir:./storage/images}") String baseDir) {
        this.rootLocation = Paths.get(baseDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
            log.info("Initialized local image storage at: {}", rootLocation);
        } catch (IOException e) {
            throw new StorageException("Could not initialize local storage directory", e);
        }
    }

    @Override
    public StoredImage store(MultipartFile file, UUID batchId) {
        if (file.isEmpty()) {
            throw new StorageException("Cannot store empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new StorageException("File size exceeds 50MB limit: " + file.getSize());
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg");
        validateFilenameAndMime(originalFilename, file.getContentType());

        try (InputStream inputStream = file.getInputStream()) {
            return store(inputStream, originalFilename, file.getContentType(), file.getSize(), batchId);
        } catch (IOException e) {
            throw new StorageException("Failed to read uploaded file stream", e);
        }
    }

    @Override
    public StoredImage store(InputStream inputStream, String originalFilename, String contentType, long size, UUID batchId) {
        validateFilenameAndMime(originalFilename, contentType);

        String extension = getFileExtension(originalFilename);
        String internalFilename = UUID.randomUUID().toString() + "." + extension;
        Path batchDir = rootLocation.resolve(batchId.toString()).normalize();

        try {
            Files.createDirectories(batchDir);
            Path destinationFile = batchDir.resolve(internalFilename).normalize();

            // Prevent path traversal
            if (!destinationFile.getParent().equals(batchDir)) {
                throw new StorageException("Cannot store file outside batch directory (path traversal detected)");
            }

            Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            log.debug("Stored image for batch {} at {}", batchId, destinationFile);

            return StoredImage.builder()
                    .storagePath(destinationFile.toString())
                    .originalFilename(originalFilename)
                    .internalFilename(internalFilename)
                    .mimeType(contentType != null ? contentType : "image/" + extension)
                    .sizeBytes(size > 0 ? size : Files.size(destinationFile))
                    .build();
        } catch (IOException e) {
            throw new StorageException("Failed to store image file: " + originalFilename, e);
        }
    }

    @Override
    public Resource load(String storagePath) {
        try {
            Path file = Paths.get(storagePath).normalize();
            if (!file.startsWith(rootLocation)) {
                throw new StorageException("Access denied: File outside storage root");
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new StorageException("Could not read file at path: " + storagePath);
            }
        } catch (MalformedURLException e) {
            throw new StorageException("Malformed URL for path: " + storagePath, e);
        }
    }

    @Override
    public byte[] loadBytes(String storagePath) {
        try {
            Path file = Paths.get(storagePath).normalize();
            if (!file.startsWith(rootLocation)) {
                throw new StorageException("Access denied: File outside storage root");
            }
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new StorageException("Failed to read file bytes: " + storagePath, e);
        }
    }

    @Override
    public void delete(String storagePath) {
        try {
            Path file = Paths.get(storagePath).normalize();
            if (file.startsWith(rootLocation)) {
                Files.deleteIfExists(file);
                log.debug("Deleted file at: {}", storagePath);
            }
        } catch (IOException e) {
            log.warn("Failed to delete file at {}: {}", storagePath, e.getMessage());
        }
    }

    private void validateFilenameAndMime(String filename, String mimeType) {
        if (filename.contains("..")) {
            throw new StorageException("Cannot store file with relative path outside current directory: " + filename);
        }
        String extension = getFileExtension(filename);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new StorageException("Unsupported file extension: " + extension + ". Allowed: " + ALLOWED_EXTENSIONS);
        }
        if (mimeType != null && !ALLOWED_MIME_TYPES.contains(mimeType.toLowerCase()) && !"application/octet-stream".equals(mimeType)) {
            throw new StorageException("Unsupported MIME type: " + mimeType + ". Allowed: " + ALLOWED_MIME_TYPES);
        }
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < filename.length() - 1) {
            return filename.substring(dotIndex + 1).toLowerCase();
        }
        return "jpg";
    }
}
